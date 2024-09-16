import { action, components } from "./_generated/server.js";
import twilioClient from "@get-convex/twilio";

const twilio = twilioClient(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
});

export default twilio;

export const getPhoneNumber = action({
  args: {},
  handler: async (ctx, args) => {
    return await twilio.getDefaultPhoneNumber(ctx, args);
  },
});
