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
            .filter(q => q.eq(q.field("account_sid"), args.account_sid))
            .collect();
    }
})

export const listIncoming = query({
    args: {
        account_sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("incoming_messages")
            .filter(q => q.eq(q.field("AccountSid"), args.account_sid))
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

export const insertIncoming = mutation({
    args: {
        message: v.any(),
    },
    handler: async (ctx, args) => {
        console.log("hello");
        return await ctx.db.insert("incoming_messages", args.message);
    }
})
