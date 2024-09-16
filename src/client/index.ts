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

export default function twilioClient<
  From extends { default_from?: string } | Record<string, never>,
>(
  componentApi: componentApiType,
  options?: {
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    http_prefix?: string;
    incomingMessageCallback?: IncomingMessageHandler;
  } & From
) {
  const account_sid =
    options?.TWILIO_ACCOUNT_SID ?? process.env.TWILIO_ACCOUNT_SID!;
  const auth_token =
    options?.TWILIO_AUTH_TOKEN ?? process.env.TWILIO_AUTH_TOKEN!;
  if (!account_sid || !auth_token) {
    throw new Error(
      "Missing Twilio credentials\n\n" +
        "npx convex env set TWILIO_ACCOUNT_SID=ACxxxxx\n" +
        "npx convex env set TWILIO_AUTH_TOKEN=xxxxx"
    );
  }
  const http_prefix = options?.http_prefix ?? "/twilio";

  return {
    registerRoutes(http: HttpRouter) {
      http.route({
        path: http_prefix + "/message-status",
        method: "POST",
        handler: httpActionGeneric(async (ctx, request) => {
          const requestValues = new URLSearchParams(await request.text());
          const sid = requestValues.get("MessageSid");
          const status = requestValues.get("MessageStatus");

          if (sid && status) {
            await ctx.runMutation(componentApi.messages.updateStatus, {
              account_sid,
              auth_token,
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
        path: http_prefix + "/incoming-message",
        method: "POST",
        handler: httpActionGeneric(async (ctx, request) => {
          const requestValues = new URLSearchParams(await request.text());
          console.log(requestValues);
          const record: Record<string, string> = {};
          requestValues.forEach((value, key) => {
            record[key] = value;
          });
          await ctx.runMutation(componentApi.messages.insertIncoming, {
            message: record,
          });

          if (options?.incomingMessageCallback) {
            await options?.incomingMessageCallback(ctx, record);
          }
          return new Response(null, { status: 200 });
        }),
      });
    },

    async sendMessage(
      ctx: RunActionCtx,
      args: Expand<
        { to: string; body: string } & (From["default_from"] extends string
          ? { from?: string }
          : { from: string })
      >
    ) {
      if (!args.from && !options?.default_from) {
        throw new Error("Missing from number");
      }
      return ctx.runAction(componentApi.messages.create, {
        from: args.from ?? options!.default_from!,
        to: args.to,
        body: args.body,
        account_sid,
        auth_token,
        status_callback:
          process.env.CONVEX_SITE_URL + http_prefix + "/message-status",
      });
    },

    async registerIncomingSmsHandler(ctx: RunActionCtx, args: { sid: string }) {
      return ctx.runAction(componentApi.phone_numbers.updateSmsUrl, {
        account_sid,
        auth_token,
        sid: args.sid,
        sms_url:
          process.env.CONVEX_SITE_URL + http_prefix + "/incoming-message",
      });
    },

    async list(ctx: RunQueryCtx) {
      return ctx.runQuery(componentApi.messages.list, {
        account_sid,
      });
    },

    async listIncoming(ctx: RunQueryCtx) {
      return ctx.runQuery(componentApi.messages.listIncoming, {
        account_sid,
      });
    },

    async getMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
      return ctx.runQuery(componentApi.messages.getBySid, {
        sid: args.sid,
      });
    },

    async getIncomingMessageBySid(ctx: RunQueryCtx, args: { sid: string }) {
      return ctx.runQuery(componentApi.messages.getIncomingMessageBySid, {
        sid: args.sid,
      });
    },

    async getMessagesByTo(ctx: RunQueryCtx, args: { to: string }) {
      return ctx.runQuery(componentApi.messages.getByTo, {
        to: args.to,
      });
    },

    async getIncomingMessagesByFrom(ctx: RunQueryCtx, args: { from: string }) {
      return ctx.runQuery(componentApi.messages.getIncomingMessagesByFrom, {
        from: args.from,
      });
    },

    async getDefaultPhoneNumber(
      ctx: RunActionCtx,
      args: From["default_from"] extends string
        ? { number?: string }
        : { number: string }
    ) {
      if (!args.number && !options?.default_from) {
        throw new Error("Missing from number");
      }
      return ctx.runAction(componentApi.phone_numbers.getByPhoneNumber, {
        account_sid,
        auth_token,
        phone_number: args.number ?? options!.default_from!,
      });
    },
  };
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
