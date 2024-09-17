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
        return await ctx.db.query("incoming_messages")
            .withIndex("by_AccountSid", q => q.eq("AccountSid", args.account_sid))
            .collect();
    }
})

export const getBySid = query({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_sid", q => q.eq("sid", args.sid))
            .first();
    }
})

export const getIncomingMessageBySid = query({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("incoming_messages")
            .withIndex("by_SmsSid", q => q.eq("SmsSid", args.sid))
            .first();
    }
})

export const getByTo = query({
    args: {
        to: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("messages")
            .withIndex("by_to", q => q.eq("to", args.to))
            .collect();
    }
})

export const getIncomingMessagesByFrom = query({
    args: {
        from: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("incoming_messages")
            .withIndex("by_From", q => q.eq("From", args.from))
            .collect();
    }
})

export const updateStatus = mutation({
    args: {
        account_sid: v.string(),
        auth_token: v.string(),
        sid: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await ctx.db.query("messages")
        .filter(q => q.eq(q.field("sid"), args.sid))
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