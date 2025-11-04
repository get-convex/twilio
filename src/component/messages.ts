import { v, type VString } from "convex/values";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { twilioRequest } from "./utils.js";
import schema from "./schema.js";
import type {
  FunctionHandle,
  NamedTableInfo,
  Query,
  WithoutSystemFields,
} from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel.js";

export type Message = WithoutSystemFields<Doc<"messages">>;
const callbackValidator = v.string() as VString<
  FunctionHandle<"mutation", { message: Message }>
>;

export const create = action({
  args: {
    account_sid: v.string(),
    auth_token: v.string(),
    from: v.string(),
    to: v.string(),
    body: v.string(),
    status_callback: v.string(),
    callback: v.optional(callbackValidator),
  },
  returns: schema.tables.messages.validator,
  handler: async (ctx, args): Promise<Message> => {
    const message = await twilioRequest(
      "Messages.json",
      args.account_sid,
      args.auth_token,
      {
        From: args.from,
        To: args.to,
        Body: args.body,
        StatusCallback: args.status_callback,
      }
    );
    // store some properties as fields and the rest as a nested object
    const databaseMessage = convertToDatabaseMessage(message);
    return ctx.runMutation(internal.messages.insert, {
      message: databaseMessage,
      callback: args.callback,
    });
  },
});

export const insert = internalMutation({
  args: {
    message: schema.tables.messages.validator,
    callback: v.optional(callbackValidator),
  },
  returns: schema.tables.messages.validator,
  handler: async (ctx, args): Promise<WithoutSystemFields<Doc<"messages">>> => {
    args.message.counterparty =
      args.message.direction === "inbound"
        ? args.message.from
        : args.message.to;
    await ctx.db.insert("messages", args.message);
    if (args.callback) {
      await ctx.runMutation(args.callback, { message: args.message });
    }
    return args.message;
  },
});

export const list = query({
  args: {
    account_sid: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_account_sid", (q) =>
          q.eq("account_sid", args.account_sid)
        ),
      args.limit
    );
  },
});

export const listIncoming = query({
  args: {
    account_sid: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_account_sid_and_direction", (q) =>
          q.eq("account_sid", args.account_sid).eq("direction", "inbound")
        ),
      args.limit
    );
  },
});
export const listOutgoing = query({
  args: {
    account_sid: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_account_sid_and_direction", (q) =>
          q.eq("account_sid", args.account_sid).eq("direction", "outbound-api")
        ),
      args.limit
    );
  },
});

export const getBySid = query({
  args: {
    account_sid: v.string(),
    sid: v.string(),
  },
  returns: v.union(schema.tables.messages.validator, v.null()),
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_sid", (q) =>
        q.eq("account_sid", args.account_sid).eq("sid", args.sid)
      )
      .first();
    return message && withoutSystemFields(message);
  },
});

export const getTo = query({
  args: {
    account_sid: v.string(),
    to: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_to", (q) =>
          q.eq("account_sid", args.account_sid).eq("to", args.to)
        ),
      args.limit
    );
  },
});

export const getFrom = query({
  args: {
    account_sid: v.string(),
    from: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_from", (q) =>
          q.eq("account_sid", args.account_sid).eq("from", args.from)
        ),
      args.limit
    );
  },
});

export const getByCounterparty = query({
  args: {
    account_sid: v.string(),
    counterparty: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.tables.messages.validator),
  handler: async (ctx, args) => {
    return takeOrCollectFields(
      ctx.db
        .query("messages")
        .withIndex("by_counterparty", (q) =>
          q
            .eq("account_sid", args.account_sid)
            .eq("counterparty", args.counterparty)
        ),
      args.limit
    );
  },
});

export const updateStatus = mutation({
  args: {
    account_sid: v.string(),
    sid: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_sid", (q) =>
        q.eq("account_sid", args.account_sid).eq("sid", args.sid)
      )
      .first();
    if (!message) {
      throw new Error("Message not found");
    }
    await ctx.db.patch(message._id, { status: args.status });
  },
});

export const getFromTwilioBySidAndInsert = action({
  args: {
    account_sid: v.string(),
    auth_token: v.string(),
    sid: v.string(),
    incomingMessageCallback: v.optional(callbackValidator),
  },
  returns: schema.tables.messages.validator,
  handler: async (ctx, args): Promise<WithoutSystemFields<Doc<"messages">>> => {
    const message = await twilioRequest(
      `Messages/${args.sid}.json`,
      args.account_sid,
      args.auth_token,
      {},
      "GET"
    );
    const databaseMessage = convertToDatabaseMessage(message);
    return ctx.runMutation(internal.messages.insert, {
      message: databaseMessage,
      callback: args.incomingMessageCallback,
    });
  },
});

function convertToDatabaseMessage(message: any) {
  const {
    account_sid,
    api_version,
    body,
    counterparty,
    date_created,
    date_sent,
    date_updated,
    direction,
    error_code,
    error_message,
    from,
    messaging_service_sid,
    num_media,
    num_segments,
    price,
    price_unit,
    sid,
    status,
    subresource_uris,
    to,
    uri,
    ...rest
  } = message;
  return {
    account_sid,
    api_version,
    body,
    counterparty,
    date_created,
    date_sent,
    date_updated,
    direction,
    error_code,
    error_message,
    from,
    messaging_service_sid,
    num_media,
    num_segments,
    price,
    price_unit,
    sid,
    status,
    subresource_uris,
    to,
    uri,
    rest,
  };
}

async function takeOrCollectFields(
  query: Query<NamedTableInfo<DataModel, "messages">>,
  limit: number | undefined
): Promise<Message[]> {
  let messagesPromise;
  if (limit) {
    messagesPromise = query.take(limit);
  } else {
    messagesPromise = query.collect();
  }
  return messagesPromise.then((messages) => messages.map(withoutSystemFields));
}

function withoutSystemFields(doc: Doc<"messages">): Message {
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}
