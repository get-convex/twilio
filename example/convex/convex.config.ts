import { defineApp } from "convex/server";
import twilio from "twilio_component/convex.config.js";

const app = defineApp();
app.use(twilio, { name: "twilio" });

export default app;
