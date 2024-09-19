import { v } from "convex/values";
import { internalAction, query, components } from "./_generated/server.js";
import Twilio from "@get-convex/twilio";

export const twilio = new Twilio(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
});

export const sendSms = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.sendMessage(ctx, args);
  },
});

export const registerIncomingSmsHandler = internalAction({
  args: {},
  handler: async (ctx) => {
    return await twilio.registerIncomingSmsHandler(ctx, {
      sid: process.env.TWILIO_PHONE_NUMBER_SID || "",
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const allMessages = await twilio.list(ctx);
    const receivedMessages = await twilio.listIncoming(ctx);
    const sentMessages = await twilio.listOutgoing(ctx);
    return { allMessages, receivedMessages, sentMessages };
  },
});

export const getMessageBySid = query({
  args: {
    sid: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessageBySid(ctx, args);
  },
});

export const getMessagesTo = query({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesTo(ctx, args);
  },
});

export const getMessagesFrom = query({
  args: {
    from: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesFrom(ctx, args);
  },
});

export const getMessagesByCounterparty = query({
  args: {
    counterparty: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesByCounterparty(ctx, args);
  },
});
