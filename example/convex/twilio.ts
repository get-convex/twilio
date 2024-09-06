import Twilio from "twilio_component";
import { components } from "./_generated/server.js";

const twilio = new Twilio(
    components.twilio,
    process.env.TWILIO_ACCOUNT_SID ?? "",
    process.env.TWILIO_AUTH_TOKEN ?? "",
    process.env.CONVEX_SITE_URL ?? ""
);


export default twilio;