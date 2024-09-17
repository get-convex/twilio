import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { twilioRequest } from "./utils.js";

export const create = action({
    args: {
        account_sid: v.string(),
        auth_token: v.string(),
        from: v.string(),
        to: v.string(),
        body: v.string(),
        status_callback: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await twilioRequest("Messages.json", args.account_sid, args.auth_token, {
            From: args.from,
            To: args.to,
            Body: args.body,
            StatusCallback: args.status_callback,
        });
        const id = await ctx.runMutation(internal.messages.insert, { message });
        return message;        
    }
})

export const insert = internalMutation({
    args: {
        message: v.any(),
    },
    handler: async (ctx, args) => {
        args.message.counterparty = args.message.direction === "inbound" ? args.message.from : args.message.to;
        return await ctx.db.insert("messages", args.message);
    }
})

export const list = query({
    args: {
        account_sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_account_sid", q => q.eq("account_sid", args.account_sid))
            .collect();
    }
})

export const listIncoming = query({
    args: {
        account_sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_account_sid_and_direction", q => q
                .eq("account_sid", args.account_sid)
                .eq("direction", "inbound")
            )
            .collect();
    }
})
export const listOutgoing = query({
    args: {
        account_sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_account_sid_and_direction", q => q
                .eq("account_sid", args.account_sid)
                .eq("direction", "outbound-api")
            )
            .collect();
    }
})

export const getBySid = query({
    args: {
        account_sid: v.string(),
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_sid", q => q
                .eq("account_sid", args.account_sid)
                .eq("sid", args.sid)
            )
            .first();
    }
})

export const getTo = query({
    args: {
        account_sid: v.string(),
        to: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_to", q => q
                .eq("account_sid", args.account_sid)
                .eq("to", args.to)
            )
            .collect();
    }
})

export const getFrom = query({
    args: {
        account_sid: v.string(),
        from: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_from", q => q
                .eq("account_sid", args.account_sid)
                .eq("from", args.from)
            )
            .collect();
    }
})

export const getByCounterparty = query({
    args: {
        account_sid: v.string(),
        counterparty: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_counterparty", q => q
                .eq("account_sid", args.account_sid)
                .eq("counterparty", args.counterparty)
            )
            .collect();
    }
})

export const updateStatus = mutation({
    args: {
        account_sid: v.string(),
        sid: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await ctx.db.query("messages")
        .withIndex("by_sid", q => q
            .eq("account_sid", args.account_sid)
            .eq("sid", args.sid)
        )
        .first();
        if (!message) {
            throw new Error("Message not found");
        }
        await ctx.db.patch(message._id, { status: args.status });
    }
})

export const getFromTwilioBySidAndInsert = action({
    args: {
        account_sid: v.string(),
        auth_token: v.string(),
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await twilioRequest(
            `Messages/${args.sid}.json`,
            args.account_sid,
            args.auth_token,
            {},
            "GET"
        );
        message._id = await ctx.runMutation(internal.messages.insert, { message });
        return message;
    }
})