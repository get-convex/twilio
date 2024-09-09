import Twilio from "twilio_component";
import { components } from "./_generated/server.js";

const twilio = new Twilio(
    components.twilio,
);


export default twilio;