// This file is for thick component clients and helpers that run

import {
  createFunctionHandle,
  Expand,
  FunctionHandle,
  FunctionReference,
  FunctionType,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
  httpActionGeneric,
  HttpRouter,
} from "convex/server";
import { Infer } from "convex/values";
import schema from "../component/schema.js";
import type { ComponentApi } from "../component/_generated/component.js";

export const messageValidator = schema.tables.messages.validator;
export type Message = Infer<typeof messageValidator>;

export type MessageHandler = FunctionReference<
  "mutation",
  "internal",
  { message: Message }
>;

export class Twilio<
  From extends { defaultFrom?: string } | Record<string, never>,
> {
  public readonly accountSid: string;
  public readonly authToken: string;
  public readonly httpPrefix: string;
  public readonly defaultFrom?: From["defaultFrom"];
  public incomingMessageCallback?: MessageHandler;
  public defaultOutgoingMessageCallback?: MessageHandler;

  constructor(
    public componentApi: ComponentApi,
    options: {
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      httpPrefix?: string;
      incomingMessageCallback?: MessageHandler;
      defaultOutgoingMessageCallback?: MessageHandler;
    } & From
  ) {
    this.accountSid =
      options?.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID!;
    this.authToken =
      options?.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN!;
    if (!this.accountSid || !this.authToken) {
      throw new Error(
        "Missing Twilio credentials\n\n" +
          "npx convex env set TWILIO_ACCOUNT_SID=ACxxxxx\n" +
          "npx convex env set TWILIO_AUTH_TOKEN=xxxxx"
      );
    }
    this.defaultFrom = options.defaultFrom;
    this.httpPrefix = options?.httpPrefix ?? "/twilio";
    this.incomingMessageCallback = options?.incomingMessageCallback;
    this.defaultOutgoingMessageCallback =
      options?.defaultOutgoingMessageCallback;
  }

  /**
   * Registers the routes for handling Twilio message status and incoming messages.
   *
   * @param http - The HTTP router to register routes on.
   */
  registerRoutes(http: HttpRouter) {
    http.route({
      path: this.httpPrefix + "/message-status",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const requestValues = new URLSearchParams(await request.text());
        const sid = requestValues.get("MessageSid");
        const status = requestValues.get("MessageStatus");

        if (sid && status) {
          await ctx.runMutation(this.componentApi.messages.updateStatus, {
            account_sid: this.accountSid,
            sid: sid ?? "",
            status: status ?? "",
          });
        } else {
          console.log(`Invalid request: ${requestValues}`);
        }
        return new Response(null, { status: 200 });
      }),
    });

    http.route({
      path: this.httpPrefix + "/incoming-message",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const requestValues = new URLSearchParams(await request.text());
        console.log(requestValues);
        await ctx.runAction(
          this.componentApi.messages.getFromTwilioBySidAndInsert,
          {
            account_sid: this.accountSid,
            auth_token: this.authToken,
            sid: requestValues.get("SmsSid") ?? "",
            incomingMessageCallback:
              this.incomingMessageCallback &&
              (await createFunctionHandle(this.incomingMessageCallback)),
          }
        );

        const emptyResponseTwiML = `
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

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
   * @param args.callback - An optional callback function to be called after successfully sending.
   * @param args.from - The sender's phone number. If not provided, the default from number is used.
   * @throws {Error} If the from number is missing and no default from number is set.
   * @returns A promise that resolves with the result of the message creation action.
   */
  async sendMessage(
    ctx: RunActionCtx,
    args: Expand<
      {
        to: string;
        body: string;
        callback?: MessageHandler;
      } & (From["defaultFrom"] extends string
        ? { from?: string }
        : { from: string })
    >
  ) {
    const from = args.from ?? this.defaultFrom;
    if (!from) {
      throw new Error("Missing from number");
    }
    return ctx.runAction(this.componentApi.messages.create, {
      from,
      to: args.to,
      body: args.body,
      account_sid: this.accountSid,
      auth_token: this.authToken,
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
   * @returns A promise that resolves with the result of the action.
   */
  async registerIncomingSmsHandler(ctx: RunActionCtx, args: { sid: string }) {
    return ctx.runAction(this.componentApi.phone_numbers.updateSmsUrl, {
      account_sid: this.accountSid,
      auth_token: this.authToken,
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
   * @returns A promise that resolves with the list of messages.
   */
  async list(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.list, {
      ...args,
      account_sid: this.accountSid,
    });
  }

  /**
   * Lists messages received using this component.
   *
   * @param ctx - The Convex function context.
   * @param args - Optional arguments for listing messages.
   * @param args.limit - The maximum number of messages to retrieve.
   * @returns A promise that resolves with the list of messages.
   */
  async listIncoming(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.listIncoming, {
      ...args,
      account_sid: this.accountSid,
    });
  }

  /**
   * Lists messages sent using this component.
   *
   * @param ctx - The Convex function context.
   * @param args - Optional arguments for listing messages.
   * @param args.limit - The maximum number of messages to retrieve.
   * @returns A promise that resolves with the list of messages.
   */
  async listOutgoing(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.listOutgoing, {
      ...args,
      account_sid: this.accountSid,
    });
  }

  /**
   * Retrieves a message by its Twilio SID.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the message.
   * @param args.sid - The SID of the message to retrieve.
   * @returns A promise that resolves with the message details.
   */
  async getMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
    return ctx.runQuery(this.componentApi.messages.getBySid, {
      account_sid: this.accountSid,
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
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesTo(ctx: RunQueryCtx, args: { to: string; limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.getTo, {
      ...args,
      account_sid: this.accountSid,
    });
  }

  /**
   * Retrieves messages received from a specific phone number using the component.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the messages.
   * @param args.from - The sender's phone number.
   * @param args.limit - Optional. The maximum number of messages to retrieve.
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesFrom(
    ctx: RunQueryCtx,
    args: { from: string; limit?: number }
  ) {
    return ctx.runQuery(this.componentApi.messages.getFrom, {
      ...args,
      account_sid: this.accountSid,
    });
  }

  /**
   * Retrieves messages sent to or received from a specific phone number using the component.
   *
   * @param ctx - The Convex function context.
   * @param args - The arguments for retrieving the messages.
   * @param args.counterparty - The recipient's or sender's phone number.
   * @param args.limit - Optional. The maximum number of messages to retrieve.
   * @returns A promise that resolves with the list of messages.
   */
  async getMessagesByCounterparty(
    ctx: RunQueryCtx,
    args: { counterparty: string; limit?: number }
  ) {
    return ctx.runQuery(this.componentApi.messages.getByCounterparty, {
      ...args,
      account_sid: this.accountSid,
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
    "this is Convex backend code, but it's running somewhere else!"
  );
}

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
