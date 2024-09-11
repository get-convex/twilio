import { v } from "convex/values";
import { internalAction, query } from "./_generated/server";
import twilio from "./twilio";

export const sendSms = internalAction({
    args: {
        to: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.sendMessage(ctx, {
            ...args,
            from: process.env.TWILIO_PHONE_NUMBER || "",
        });
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