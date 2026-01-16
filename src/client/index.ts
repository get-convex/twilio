// This file is for thick component clients and helpers that run

import {
  createFunctionHandle,
  type Expand,
  type FunctionReference,
  type GenericActionCtx,
  type GenericDataModel,
  type GenericQueryCtx,
  httpActionGeneric,
  HttpRouter,
} from "convex/server";
import type { Infer } from "convex/values";
import schema from "../component/schema.js";
import type { ComponentApi } from "../component/_generated/component.js";
import { validateTwilioSignature } from "../component/utils.js";

export const messageValidator = schema.tables.messages.validator;
export type Message = Infer<typeof messageValidator>;
export type Channel = "sms" | "whatsapp";

/**
 * Credentials resolved for a specific tenant.
 */
export type TenantCredentials = {
  accountSid: string;
  authToken: string;
  tenantId?: string;
};

/**
 * Callback to resolve credentials for multi-tenant setups.
 * Called with the phone number that received the message (the "To" number).
 * Return null if the phone number is not recognized.
 */
export type CredentialResolver = FunctionReference<
  "action",
  "internal",
  { phoneNumber: string },
  TenantCredentials | null
>;

/**
 * Formats a phone number for the specified channel.
 * WhatsApp numbers require the "whatsapp:" prefix.
 */
function formatPhoneNumber(phone: string, channel: Channel): string {
  if (channel === "whatsapp" && !phone.startsWith("whatsapp:")) {
    return `whatsapp:${phone}`;
  }
  return phone;
}

/**
 * Strips the whatsapp: prefix from a phone number if present.
 */
function stripWhatsAppPrefix(phone: string): string {
  if (phone.startsWith("whatsapp:")) {
    return phone.slice(9);
  }
  return phone;
}

/**
 * Extended message handler that includes tenantId for multi-tenant setups.
 */
export type MessageHandler = FunctionReference<
  "mutation",
  "internal",
  { message: Message; tenantId?: string }
>;

/**
 * Legacy message handler without tenantId (for backwards compatibility).
 */
export type LegacyMessageHandler = FunctionReference<
  "mutation",
  "internal",
  { message: Message }
>;

type TwilioOptions<From extends { defaultFrom?: string } | Record<string, never>> = {
  /**
   * Twilio Account SID. Required for single-tenant mode.
   * Not needed if using credentialResolver for multi-tenant.
   */
  TWILIO_ACCOUNT_SID?: string;
  /**
   * Twilio Auth Token. Required for single-tenant mode.
   * Not needed if using credentialResolver for multi-tenant.
   */
  TWILIO_AUTH_TOKEN?: string;
  /**
   * URL prefix for webhook routes. Defaults to "/twilio".
   */
  httpPrefix?: string;
  /**
   * Callback triggered when an incoming message is received.
   * In multi-tenant mode, tenantId is included in the callback args.
   */
  incomingMessageCallback?: MessageHandler | LegacyMessageHandler;
  /**
   * Default callback for outgoing messages.
   */
  defaultOutgoingMessageCallback?: MessageHandler | LegacyMessageHandler;
  /**
   * Multi-tenant credential resolver.
   * When provided, credentials are looked up dynamically based on the
   * phone number that received the message.
   */
  credentialResolver?: CredentialResolver;
  /**
   * Whether to validate Twilio webhook signatures.
   * Defaults to true in production (when CONVEX_CLOUD_URL is set).
   * Set to false for local development without signature validation.
   */
  validateSignatures?: boolean;
} & From;

export class Twilio<
  From extends { defaultFrom?: string } | Record<string, never>,
> {
  public readonly accountSid?: string;
  public readonly authToken?: string;
  public readonly httpPrefix: string;
  public readonly defaultFrom?: From["defaultFrom"];
  public readonly validateSignatures: boolean;
  public incomingMessageCallback?: MessageHandler | LegacyMessageHandler;
  public defaultOutgoingMessageCallback?: MessageHandler | LegacyMessageHandler;
  public credentialResolver?: CredentialResolver;

  constructor(
    public componentApi: ComponentApi,
    options: TwilioOptions<From>,
  ) {
    this.credentialResolver = options?.credentialResolver;

    // In multi-tenant mode, credentials are optional at construction
    if (!this.credentialResolver) {
      this.accountSid =
        options?.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID;
      this.authToken =
        options?.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN;
      if (!this.accountSid || !this.authToken) {
        throw new Error(
          "Missing Twilio credentials. Either provide TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, " +
            "or use credentialResolver for multi-tenant setups.\n\n" +
            "npx convex env set TWILIO_ACCOUNT_SID=ACxxxxx\n" +
            "npx convex env set TWILIO_AUTH_TOKEN=xxxxx",
        );
      }
    } else {
      // Store credentials if provided (can be used as fallback)
      this.accountSid = options?.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID;
      this.authToken = options?.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN;
    }

    this.defaultFrom = options.defaultFrom;
    this.httpPrefix = options?.httpPrefix ?? "/twilio";
    this.incomingMessageCallback = options?.incomingMessageCallback;
    this.defaultOutgoingMessageCallback = options?.defaultOutgoingMessageCallback;

    // Default to validating signatures in production
    this.validateSignatures = options?.validateSignatures ??
      (process.env.CONVEX_CLOUD_URL !== undefined);
  }

  /**
   * Registers the routes for handling Twilio message status and incoming messages.
   * Includes signature validation and multi-tenant support.
   *
   * @param http - The HTTP router to register routes on.
   */
  registerRoutes(http: HttpRouter) {
    const componentApi = this.componentApi;
    const credentialResolver = this.credentialResolver;
    const incomingMessageCallback = this.incomingMessageCallback;
    const validateSignatures = this.validateSignatures;
    const httpPrefix = this.httpPrefix;

    // Single-tenant credentials (may be undefined in multi-tenant mode)
    const singleTenantAccountSid = this.accountSid;
    const singleTenantAuthToken = this.authToken;

    http.route({
      path: httpPrefix + "/message-status",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const body = await request.text();
        const requestValues = new URLSearchParams(body);
        const params = Object.fromEntries(requestValues.entries());

        const sid = params.MessageSid;
        const status = params.MessageStatus;
        const toNumber = stripWhatsAppPrefix(params.To || "");

        if (!sid || !status) {
          console.error("[Twilio] Invalid status callback: missing MessageSid or MessageStatus");
          return new Response(null, { status: 400 });
        }

        // Resolve credentials for signature validation
        let accountSid = singleTenantAccountSid;
        let authToken = singleTenantAuthToken;

        if (credentialResolver && toNumber) {
          const creds = await ctx.runAction(credentialResolver, {
            phoneNumber: toNumber
          });
          if (creds) {
            accountSid = creds.accountSid;
            authToken = creds.authToken;
          }
        }

        // Validate signature if enabled
        if (validateSignatures && authToken) {
          const signature = request.headers.get("X-Twilio-Signature") || "";
          const url = new URL(request.url);
          const fullUrl = `${process.env.CONVEX_SITE_URL}${url.pathname}`;

          const isValid = await validateTwilioSignature(authToken, signature, fullUrl, params);
          if (!isValid) {
            console.error("[Twilio] Invalid signature on status callback");
            return new Response("Invalid signature", { status: 403 });
          }
        }

        if (accountSid) {
          await ctx.runMutation(componentApi.messages.updateStatus, {
            account_sid: accountSid,
            sid,
            status,
          });
        }

        return new Response(null, { status: 200 });
      }),
    });

    http.route({
      path: httpPrefix + "/incoming-message",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const body = await request.text();
        const requestValues = new URLSearchParams(body);
        const params = Object.fromEntries(requestValues.entries());

        const messageSid = params.SmsSid || params.MessageSid;
        const toNumber = stripWhatsAppPrefix(params.To || "");
        const fromNumber = stripWhatsAppPrefix(params.From || "");

        if (!messageSid) {
          console.error("[Twilio] Invalid incoming message: missing SmsSid/MessageSid");
          return new Response("Missing message SID", { status: 400 });
        }

        // Resolve credentials
        let accountSid = singleTenantAccountSid;
        let authToken = singleTenantAuthToken;
        let tenantId: string | undefined;

        if (credentialResolver && toNumber) {
          const creds = await ctx.runAction(credentialResolver, {
            phoneNumber: toNumber
          });
          if (creds) {
            accountSid = creds.accountSid;
            authToken = creds.authToken;
            tenantId = creds.tenantId;
          } else {
            // Phone number not recognized - could be misconfigured or attack
            console.error(`[Twilio] No credentials found for phone number: ${toNumber.slice(-4)}`);
            return new Response("Unknown phone number", { status: 404 });
          }
        }

        if (!accountSid || !authToken) {
          console.error("[Twilio] Missing credentials for incoming message");
          return new Response("Server configuration error", { status: 500 });
        }

        // Validate signature
        if (validateSignatures) {
          const signature = request.headers.get("X-Twilio-Signature") || "";
          const url = new URL(request.url);
          const fullUrl = `${process.env.CONVEX_SITE_URL}${url.pathname}`;

          const isValid = await validateTwilioSignature(authToken, signature, fullUrl, params);
          if (!isValid) {
            console.error("[Twilio] Invalid signature on incoming message");
            return new Response("Invalid signature", { status: 403 });
          }
        }

        // Log receipt without sensitive data
        console.log(`[Twilio] Received message from ...${fromNumber.slice(-4)} to ...${toNumber.slice(-4)}`);

        // Fetch full message details and store
        await ctx.runAction(
          componentApi.messages.getFromTwilioBySidAndInsert,
          {
            account_sid: accountSid,
            auth_token: authToken,
            sid: messageSid,
            incomingMessageCallback:
              incomingMessageCallback &&
              (await createFunctionHandle(incomingMessageCallback)),
            tenantId,
          },
        );

        const emptyResponseTwiML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

        return new Response(emptyResponseTwiML, {
          status: 200,
          headers: {
            "Content-Type": "application/xml",
          },
        });
      }),
    });
  }

  /**
   * Sends a message using the Twilio API.
   *
   * @param ctx - A Convex context for running the action.
   * @param args - The arguments for sending the message.
   * @param args.to - The recipient's phone number e.g. +14151234567.
   * @param args.body - The body of the message.
   * @param args.channel - The messaging channel: "sms" (default) or "whatsapp".
   * @param args.callback - An optional callback function to be called after successfully sending.
   * @param args.from - The sender's phone number. If not provided, the default from number is used.
   * @param args.credentials - Optional per-call credentials for multi-tenant setups.
   * @throws {Error} If credentials are missing.
   * @returns A promise that resolves with the result of the message creation action.
   */
  async sendMessage(
    ctx: RunActionCtx,
    args: Expand<
      {
        to: string;
        body: string;
        channel?: Channel;
        callback?: MessageHandler | LegacyMessageHandler;
        /** Per-call credentials for multi-tenant setups */
        credentials?: TenantCredentials;
      } & (From["defaultFrom"] extends string
        ? { from?: string }
        : { from: string })
    >,
  ) {
    const channel = args.channel ?? "sms";
    const from = args.from ?? this.defaultFrom;
    if (!from) {
      throw new Error("Missing from number");
    }

    // Use per-call credentials if provided, otherwise fall back to instance credentials
    const accountSid = args.credentials?.accountSid ?? this.accountSid;
    const authToken = args.credentials?.authToken ?? this.authToken;

    if (!accountSid || !authToken) {
      throw new Error(
        "Missing Twilio credentials. Provide credentials in sendMessage() " +
        "or configure them at Twilio client construction."
      );
    }

    return ctx.runAction(this.componentApi.messages.create, {
      from: formatPhoneNumber(from, channel),
      to: formatPhoneNumber(args.to, channel),
      body: args.body,
      account_sid: accountSid,
      auth_token: authToken,
      status_callback:
        process.env.CONVEX_SITE_URL + this.httpPrefix + "/message-status",
      callback: args.callback
        ? await createFunctionHandle(args.callback)
        : this.defaultOutgoingMessageCallback &&
          (await createFunctionHandle(this.defaultOutgoingMessageCallback)),
    });
  }

  /**
   * Registers an incoming SMS handler for a Twilio phone number.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for registering the SMS handler.
   * @param args.sid - The SID of the phone number to update.
   * @param args.credentials - Optional per-call credentials for multi-tenant setups.
   * @returns A promise that resolves with the result of the action.
   */
  async registerIncomingSmsHandler(
    ctx: RunActionCtx,
    args: { sid: string; credentials?: TenantCredentials }
  ) {
    const accountSid = args.credentials?.accountSid ?? this.accountSid;
    const authToken = args.credentials?.authToken ?? this.authToken;

    if (!accountSid || !authToken) {
      throw new Error("Missing Twilio credentials");
    }

    return ctx.runAction(this.componentApi.phone_numbers.updateSmsUrl, {
      account_sid: accountSid,
      auth_token: authToken,
      sid: args.sid,
      sms_url:
        process.env.CONVEX_SITE_URL + this.httpPrefix + "/incoming-message",
    });
  }

  /**
   * Lists messages sent or received using this component.
   *
   * @param ctx - The Convex function context.
   * @param args - Optional arguments for listing messages.
   * @param args.limit - The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async list(ctx: RunQueryCtx, args?: { limit?: number; accountSid?: string }) {
    const accountSid = args?.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.list, {
      limit: args?.limit,
      account_sid: accountSid,
    });
  }

  /**
   * Lists messages received using this component.
   *
   * @param ctx - The Convex function context.
   * @param args - Optional arguments for listing messages.
   * @param args.limit - The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async listIncoming(ctx: RunQueryCtx, args?: { limit?: number; accountSid?: string }) {
    const accountSid = args?.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.listIncoming, {
      limit: args?.limit,
      account_sid: accountSid,
    });
  }

  /**
   * Lists messages sent using this component.
   *
   * @param ctx - The Convex function context.
   * @param args - Optional arguments for listing messages.
   * @param args.limit - The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async listOutgoing(ctx: RunQueryCtx, args?: { limit?: number; accountSid?: string }) {
    const accountSid = args?.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.listOutgoing, {
      limit: args?.limit,
      account_sid: accountSid,
    });
  }

  /**
   * Retrieves a message by its Twilio SID.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the message.
   * @param args.sid - The SID of the message to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the message details.
   */
  async getMessageBySid(ctx: RunQueryCtx, args: { sid: string; accountSid?: string }) {
    const accountSid = args.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.getBySid, {
      account_sid: accountSid,
      sid: args.sid,
    });
  }

  /**
   * Retrieves messages sent to a specific phone number using the component.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the messages.
   * @param args.to - The recipient's phone number.
   * @param args.limit - Optional. The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesTo(ctx: RunQueryCtx, args: { to: string; limit?: number; accountSid?: string }) {
    const accountSid = args.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.getTo, {
      to: args.to,
      limit: args.limit,
      account_sid: accountSid,
    });
  }

  /**
   * Retrieves messages received from a specific phone number using the component.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the messages.
   * @param args.from - The sender's phone number.
   * @param args.limit - Optional. The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesFrom(
    ctx: RunQueryCtx,
    args: { from: string; limit?: number; accountSid?: string },
  ) {
    const accountSid = args.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.getFrom, {
      from: args.from,
      limit: args.limit,
      account_sid: accountSid,
    });
  }

  /**
   * Retrieves messages sent to or received from a specific phone number using the component.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the messages.
   * @param args.counterparty - The recipient's or sender's phone number.
   * @param args.limit - Optional. The maximum number of messages to retrieve.
   * @param args.accountSid - Account SID for multi-tenant queries.
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesByCounterparty(
    ctx: RunQueryCtx,
    args: { counterparty: string; limit?: number; accountSid?: string },
  ) {
    const accountSid = args.accountSid ?? this.accountSid;
    if (!accountSid) {
      throw new Error("Missing account SID");
    }
    return ctx.runQuery(this.componentApi.messages.getByCounterparty, {
      counterparty: args.counterparty,
      limit: args.limit,
      account_sid: accountSid,
    });
  }
}
export default Twilio;

// on the Convex backend.
declare global {
  const Convex: Record<string, unknown>;
}

if (typeof Convex === "undefined") {
  throw new Error(
    "this is Convex backend code, but it's running somewhere else!",
  );
}

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
