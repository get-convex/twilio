import { Twilio } from "twilio_component";
import { components } from "./_generated/server.js";

const twilio = new Twilio(components.twilio, process.env.ACCOUNT_SID ?? "", process.env.AUTH_TOKEN ?? "", process.env.CONVEX_SITE_URL ?? "");



export const appSendMessage = twilio.sendMessage;
export const registerIncomingSmsHandler = twilio.registerIncomingSmsHandler;

export default twilio;