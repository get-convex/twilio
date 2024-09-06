import { Twilio } from "../../src/client";
import { components } from "./_generated/server.js";

const twilio = new Twilio(components.twilio, process.env.ACCOUNT_SID ?? "", process.env.AUTH_TOKEN ?? "", process.env.CONVEX_SITE_URL ?? "");



export const appSendMessage = twilio.sendMessage;
export default twilio;