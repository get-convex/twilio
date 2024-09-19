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
import { api } from "../component/_generated/api.js";
import { GenericId, Infer } from "convex/values";
import schema from "../component/schema.js";

export type Message = Infer<typeof schema.tables.messages.validator>;

type IncomingMessageHandler = (
  ctx: GenericActionCtx<GenericDataModel>,
  message: Message
) => Promise<void>;

export default class Twilio<
  From extends { default_from?: string } | Record<string, never>,
> {
  public account_sid: string;
  public auth_token: string;
  public http_prefix: string;
  private incomingMessageCallback?: IncomingMessageHandler;
  private default_from?: From["default_from"];

  constructor(
    public componentApi: componentApiType,
    options: {
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      http_prefix?: string;
      incomingMessageCallback?: IncomingMessageHandler;
    } & From
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
  }

  registerRoutes(http: HttpRouter) {
    http.route({
      path: this.http_prefix + "/message-status",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const requestValues = new URLSearchParams(await request.text());
        const sid = requestValues.get("MessageSid");
        const status = requestValues.get("MessageStatus");

        if (sid && status) {
          await ctx.runMutation(this.componentApi.messages.updateStatus, {
            account_sid: this.account_sid,
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
      path: this.http_prefix + "/incoming-message",
      method: "POST",
      handler: httpActionGeneric(async (ctx, request) => {
        const requestValues = new URLSearchParams(await request.text());
        console.log(requestValues);
        const message = await ctx.runAction(
          this.componentApi.messages.getFromTwilioBySidAndInsert,
          {
            account_sid: this.account_sid,
            auth_token: this.auth_token,
            sid: requestValues.get("SmsSid") ?? "",
          }
        );

        if (this.incomingMessageCallback) {
          await this.incomingMessageCallback(ctx, message);
        }
        return new Response(null, { status: 200 });
      }),
    });
  }

  async sendMessage(
    ctx: RunActionCtx,
    args: Expand<
      { to: string; body: string } & (From["default_from"] extends string
        ? { from?: string }
        : { from: string })
    >
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

  async list(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.list, {
      ...args,
      account_sid: this.account_sid,
    });
  }

  async listIncoming(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.listIncoming, {
      ...args,
      account_sid: this.account_sid,
    });
  }

  async listOutgoing(ctx: RunQueryCtx, args?: { limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.listOutgoing, {
      ...args,
      account_sid: this.account_sid,
    });
  }

  async getMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
    return ctx.runQuery(this.componentApi.messages.getBySid, {
      account_sid: this.account_sid,
      sid: args.sid,
    });
  }

  async getMessagesTo(ctx: RunQueryCtx, args: { to: string; limit?: number }) {
    return ctx.runQuery(this.componentApi.messages.getTo, {
      ...args,
      account_sid: this.account_sid,
    });
  }

  async getMessagesFrom(
    ctx: RunQueryCtx,
    args: { from: string; limit?: number }
  ) {
    return ctx.runQuery(this.componentApi.messages.getFrom, {
      ...args,
      account_sid: this.account_sid,
    });
  }

  async getMessagesByCounterparty(
    ctx: RunQueryCtx,
    args: { counterparty: string; limit?: number }
  ) {
    return ctx.runQuery(this.componentApi.messages.getByCounterparty, {
      ...args,
      account_sid: this.account_sid,
    });
  }
}

export type OpaqueIds<T> =
  T extends GenericId<infer _T>
    ? string
    : T extends (infer U)[]
      ? OpaqueIds<U>[]
      : T extends object
        ? { [K in keyof T]: OpaqueIds<T[K]> }
        : T;

export type UseApi<API> = Expand<{
  [mod in keyof API]: API[mod] extends FunctionReference<
    infer FType,
    "public",
    infer FArgs,
    infer FReturnType,
    infer FComponentPath
  >
    ? FunctionReference<
        FType,
        "internal",
        OpaqueIds<FArgs>,
        OpaqueIds<FReturnType>,
        FComponentPath
      >
    : UseApi<API[mod]>;
}>;

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
