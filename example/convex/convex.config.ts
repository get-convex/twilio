import { defineApp } from "convex/server";
import twilio from "@get-convex/twilio/convex.config.js";

const app = defineApp();
app.use(twilio, { name: "twilio" });

export default app;
