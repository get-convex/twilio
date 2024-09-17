import { action, components } from "./_generated/server.js";
import twilioClient from "@get-convex/twilio";

const twilio = twilioClient(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
});

export default twilio;

