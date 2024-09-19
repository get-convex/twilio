import { components } from "./_generated/server.js";
import Twilio from "@get-convex/twilio";

const twilio = new Twilio(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
});

export default twilio;
