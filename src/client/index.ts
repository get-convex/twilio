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
  http: HttpRouter;

  constructor(
    public componentApi: componentApiType,
    public account_sid: string,
    public auth_token: string,
    public http_prefix: string = "/twilio"
  ) {
    this.account_sid = account_sid;
    this.auth_token = auth_token;
    this.componentApi = componentApi;

    this.http = new MountableHttpRouter();
    this.http.route({
      path: http_prefix + "/message-status",
      method: "POST",
      handler: this.updateMessageStatus,
    });

    this.http.route({
      path: http_prefix + "/incoming-message",
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

// TODO: Move this into an npm library / core
/**
 * A router that can be mounted onto an existing HttpRouter instance.
 */
export class MountableHttpRouter extends HttpRouter {
  constructor() {
    super();
  }
  /**
   * Registers the routes from this instance with an existing HttpRouter instance.
   * @param http An existing HttpRouter instance
   */
  registerRoutes(http: HttpRouter) {
    this.mergeRouters(http, this);
  }
  mergeRouters(destination: HttpRouter, source: HttpRouter) {
    const existingPaths = new Set(destination.exactRoutes.keys());
    const existingPrefixes = [...destination.prefixRoutes.values()].flatMap(
      (prefixRoutes) => [...prefixRoutes.keys()]
    );
    function checkForCollisions(path: string) {
      if (existingPaths.has(path)) {
        throw new Error(`Route already exists: ${path}`);
      }
      const existingPrefix = existingPrefixes.find((prefix) =>
        path.startsWith(prefix)
      );
      if (existingPrefix !== undefined) {
        throw new Error(`Route prefix ${existingPrefix} conflicts: ${path}`);
      }
    }

    for (const [path, routeByMethod] of source.exactRoutes.entries()) {
      checkForCollisions(path);
      for (const [method, handler] of routeByMethod.entries()) {
        destination.route({ path, method, handler });
      }
    }
    for (const [method, routeByPrefix] of source.prefixRoutes.entries()) {
      for (const [pathPrefix, handler] of routeByPrefix.entries()) {
        checkForCollisions(pathPrefix);
        destination.route({ pathPrefix, method, handler });
      }
    }
    return destination;
  }
}
