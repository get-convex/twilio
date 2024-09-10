import twilio from "./twilio.js";
import { httpRouter } from "convex/server";

const http = httpRouter();
twilio.registerRoutes(http);
export default http;
