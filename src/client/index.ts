// This file is for thick component clients and helpers that run

import {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  httpActionGeneric,
  HttpRouter,
} from "convex/server";
// on the Convex backend.
declare global {
  const Convex: Record<string, unknown>;
}

if (typeof Convex === "undefined") {
  throw new Error(
    "this is Convex backend code, but it's running somewhere else!"
  );
}
type componentApiType = {
  messages: {
    create: FunctionReference<
      "action",
      "internal",
      {
        account_sid: string;
        auth_token: string;
        body: string;
        from: string;
        status_callback: string;
        to: string;
      },
      any
    >;
    insertIncoming: FunctionReference<
      "mutation",
      "internal",
      { message: any },
      any
    >;
    list: FunctionReference<
      "action",
      "internal",
      { account_sid: string; auth_token: string },
      any
    >;
    updateStatus: FunctionReference<
      "mutation",
      "internal",
      {
        account_sid: string;
        auth_token: string;
        sid: string;
        status: string;
      },
      any
    >;
  };
  phone_numbers: {
    create: FunctionReference<
      "action",
      "internal",
      { account_sid: string; auth_token: string; number: string },
      any
    >;
    updateSmsUrl: FunctionReference<
      "action",
      "internal",
      {
        account_sid: string;
        auth_token: string;
        sid: string;
        sms_url: string;
      },
      any
    >;
  };
};

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};

export default class Twilio {
  account_sid: string;
  auth_token: string;
  http_prefix: string;

  constructor(
    public componentApi: componentApiType,
    options?: {
      account_sid?: string;
      auth_token?: string;
      http_prefix?: string;
    }
  ) {
    this.account_sid = options?.account_sid ?? process.env.TWILIO_ACCOUNT_SID!;
    this.auth_token = options?.auth_token ?? process.env.TWILIO_AUTH_TOKEN!;
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
      handler: this.updateMessageStatus,
    });

    http.route({
      path: this.http_prefix + "/incoming-message",
      method: "POST",
      handler: this.incomingMessage,
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

    return new Response(null, { status: 200 });
  });

  async sendMessage(
    ctx: RunActionCtx,
    args: { from: string; to: string; body: string }
  ) {
    return ctx.runAction(this.componentApi.messages.create, {
      from: args.from,
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
}
