import { v } from "convex/values";
import { internalAction, query } from "./_generated/server";
import twilio from "./example.js";

export const sendSms = internalAction({
    args: {
        to: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.sendMessage(ctx, args);
    }
})

export const registerIncomingSmsHandler = internalAction({
    args: {},
    handler: async (ctx) => {
        return await twilio.registerIncomingSmsHandler(ctx, { sid: process.env.TWILIO_PHONE_NUMBER_SID || ""});
    }
})

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await twilio.list(ctx);
    }
})

export const listIncoming = query({
    args: {},
    handler: async (ctx) => {
        return await twilio.listIncoming(ctx);
    }
})

export const getMessageBySid = query({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getMessageBySid(ctx, args);
    }  
})

export const getIncomingMessageBySid = query({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getIncomingMessageBySid(ctx, args);
    }
})

export const getMessagesByTo = query({
    args: {
        to: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getMessagesByTo(ctx, args);
    }
})

export const getIncomingMessagesByFrom = query({
    args: {
        from: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getIncomingMessagesByFrom(ctx, args);
    }
})