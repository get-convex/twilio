// This file is for thick component clients and helpers that run

import {
  Expand,
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericQueryCtx,
  httpActionGeneric,
  HttpRouter,
} from "convex/server";
import { api } from "../twilio/_generated/api.js";
// on the Convex backend.
declare global {
  const Convex: Record<string, unknown>;
}

if (typeof Convex === "undefined") {
  throw new Error(
    "this is Convex backend code, but it's running somewhere else!"
  );
}
type componentApiType = UseApi<typeof api>;

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};
type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

type IncomingMessageHandler = (
  ctx: GenericActionCtx<GenericDataModel>,
  message: Record<string, string>
) => Promise<void>;

export default class Twilio {
  account_sid: string;
  auth_token: string;
  http_prefix: string;
  default_from?: string;
  incomingMessageCallback?: IncomingMessageHandler;

  constructor(
    public componentApi: componentApiType,
    options?: {
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;
      http_prefix?: string;
      incomingMessageCallback?: IncomingMessageHandler;
    }
  ) {
    this.account_sid =
      options?.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID!;
    this.auth_token =
      options?.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN!;
    if (!this.account_sid || !this.auth_token) {
      throw new Error(
        "Missing Twilio credentials\n\n" +
          "npx convex env set TWILIO_ACCOUNT_SID=ACxxxxx\n" +
          "npx convex env set TWILIO_AUTH_TOKEN=xxxxx"
      );
    }
    this.http_prefix = options?.http_prefix ?? "/twilio";
    this.default_from = options?.TWILIO_PHONE_NUMBER;
    this.incomingMessageCallback = options?.incomingMessageCallback;
  }

  registerRoutes(http: HttpRouter) {
    http.route({
      path: this.http_prefix + "/message-status",
      method: "POST",
      handler: this.updateMessageStatus,
    });

    http.route({
      path: this.http_prefix + "/incoming-message",
      method: "POST",
      handler: this.incomingMessage,
    });
  }

  async sendMessage(
    ctx: RunActionCtx,
    args: { from?: string; to: string; body: string }
  ) {
    if (!args.from && !this.default_from) {
      throw new Error("Missing from number");
    }
    return ctx.runAction(this.componentApi.messages.create, {
      from: args.from ?? this.default_from!,
      to: args.to,
      body: args.body,
      account_sid: this.account_sid,
      auth_token: this.auth_token,
      status_callback:
        process.env.CONVEX_SITE_URL + this.http_prefix + "/message-status",
    });
  }

  async registerIncomingSmsHandler(ctx: RunActionCtx, args: { sid: string }) {
    return ctx.runAction(this.componentApi.phone_numbers.updateSmsUrl, {
      account_sid: this.account_sid,
      auth_token: this.auth_token,
      sid: args.sid,
      sms_url:
        process.env.CONVEX_SITE_URL + this.http_prefix + "/incoming-message",
    });
  }

  async list(ctx: RunQueryCtx) {
    return ctx.runQuery(this.componentApi.messages.list, {
      account_sid: this.account_sid,
    });
  }

  async listIncoming(ctx: RunQueryCtx) {
    return ctx.runQuery(this.componentApi.messages.listIncoming, {
      account_sid: this.account_sid,
    });
  }

  async getMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
    return ctx.runQuery(this.componentApi.messages.getBySid, {
      sid: args.sid,
    });
  }

  async getIncomingMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
    return ctx.runQuery(this.componentApi.messages.getIncomingMessageBySid, {
      sid: args.sid,
    });
  }

  async getMessagesByTo(ctx: RunQueryCtx, args: { to: string }) {
    return ctx.runQuery(this.componentApi.messages.getByTo, {
      to: args.to,
    });
  }

  async getIncomingMessagesByFrom(ctx: RunQueryCtx, args: { from: string }) {
    return ctx.runQuery(this.componentApi.messages.getIncomingMessagesByFrom, {
      from: args.from,
    });
  }

  async getDefaultPhoneNumber(ctx: RunActionCtx, args: { number?: string }) {
    if (!args.number && !this.default_from) {
      throw new Error("Missing from number");
    }
    return ctx.runAction(this.componentApi.phone_numbers.getByPhoneNumber, {
      account_sid: this.account_sid,
      auth_token: this.auth_token,
      phone_number: args.number ?? this.default_from!,
    });
  }

  private updateMessageStatus = httpActionGeneric(async (ctx, request) => {
    const requestValues = new URLSearchParams(await request.text());
    const sid = requestValues.get("MessageSid");
    const status = requestValues.get("MessageStatus");

    if (sid && status) {
      await ctx.runMutation(this.componentApi.messages.updateStatus, {
        account_sid: this.account_sid,
        auth_token: this.auth_token,
        sid: sid ?? "",
        status: status ?? "",
      });
    } else {
      console.log(`Invalid request: ${requestValues}`);
    }
    return new Response(null, { status: 200 });
  });

  private incomingMessage = httpActionGeneric(async (ctx, request) => {
    const requestValues = new URLSearchParams(await request.text());
    console.log(requestValues);
    const record: Record<string, string> = {};
    requestValues.forEach((value, key) => {
      record[key] = value;
    });
    await ctx.runMutation(this.componentApi.messages.insertIncoming, {
      message: record,
    });

    if (this.incomingMessageCallback) {
      await this.incomingMessageCallback(ctx, record);
    }
    return new Response(null, { status: 200 });
  });
}

type UseApi<API> = Expand<{
  [K in keyof API]: API[K] extends FunctionReference<
    infer T,
    "public",
    infer A,
    infer R,
    infer P
  >
    ? FunctionReference<T, "internal", A, R, P>
    : UseApi<API[K]>;
}>;
