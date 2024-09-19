import { v } from "convex/values";
import {
  internalAction,
  query,
  components,
  internalMutation,
} from "./_generated/server.js";
import { Twilio, messageValidator } from "@get-convex/twilio";
import { internal } from "./_generated/api.js";

export const twilio = new Twilio(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
});
twilio.incomingMessageCallback = internal.example.handleMessage;
twilio.defaultOutgoingMessageCallback = internal.example.handleMessage;

export const handleMessage = internalMutation({
  args: {
    message: messageValidator,
  },
  handler: async (ctx, args) => {
    console.log(args);
  },
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
