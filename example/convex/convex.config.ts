import { defineApp } from "convex/server";
import twilio from "../../src/twilio/convex.config";

const app = defineApp();
app.use(twilio, { name: "twilio" });

export default app;
