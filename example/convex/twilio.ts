import Twilio from "twilio_component";
import { components } from "./_generated/server.js";

const twilio = new Twilio(
    components.twilio,
    {
        default_from: process.env.TWILIO_PHONE_NUMBER || "",
    }
);


export default twilio;