import twilio from "./twilio";
import { httpRouter } from "convex/server";

const http = httpRouter();
twilio.http.registerRoutes(http);