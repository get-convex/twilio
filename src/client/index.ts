// This file is for thick component clients and helpers that run

import { actionGeneric, FunctionReference, httpActionGeneric, httpRouter, HttpRouter } from "convex/server";
import { v } from "convex/values";
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
}
export class Twilio {
  account_sid: string;
  auth_token: string;
  convex_site_url: string;
  http: HttpRouter;
  componentApi: componentApiType;

  constructor(componentApi: componentApiType, account_sid: string, auth_token: string, convex_site_url: string) {
    this.account_sid = account_sid;
    this.auth_token = auth_token;
    this.convex_site_url = convex_site_url;
    this.componentApi = componentApi;

    this.http = httpRouter();
    this.http.route({
      path: "/message-status",
      method: "POST",
      handler: this.updateMessageStatus,
  })
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
        })    
    } else {
        console.log(`Invalid request: ${requestValues}`);
    }
    return new Response(null, { status: 200 });
  });

  sendMessage = actionGeneric({
    args: {
        from: v.string(),
        to: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.runAction(this.componentApi.messages.create, {
            from: args.from,
            to: args.to,
            body: args.body,
            account_sid: this.account_sid,
            auth_token: this.auth_token,
            status_callback: `${this.convex_site_url}/message-status`,
        });
    }
  });
}
