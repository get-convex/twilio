import { parse } from "convex-helpers/validators";
import type { Validator, Infer } from "convex/values";

const DEFAULT_TWILIO_API_BASE_URL = "https://api.twilio.com";

export function resolveTwilioApiBaseUrl(): string {
  const configured = process.env.TWILIO_API_BASE_URL?.trim();
  const baseUrl =
    configured && configured.length > 0
      ? configured
      : DEFAULT_TWILIO_API_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export function buildTwilioRequestUrl(
  path: string,
  account_sid: string,
): string {
  return `${resolveTwilioApiBaseUrl()}/2010-04-01/Accounts/${account_sid}/${path}`;
}

export const twilioRequest = async function (
  path: string,
  account_sid: string,
  auth_token: string,
  body: Record<string, string>,
  method: "POST" | "GET" = "POST",
) {
  const url = buildTwilioRequestUrl(path, account_sid);
  const auth = btoa(`${account_sid}:${auth_token}`);
  const request: {
    method: "POST" | "GET";
    headers: {
      Authorization: string;
      "Content-Type": string;
    };
    body?: URLSearchParams;
  } = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (method === "POST") {
    request["body"] = new URLSearchParams(body);
  }
  const response = await fetch(url, request);
  if (!response.ok) {
    console.log(response.status);
    console.log(await response.text());
    throw new Error("Failed to send request to Twilio");
  }
  return await response.json();
};

/**
 * Generic function to attempt parsing with proper TypeScript type narrowing
 */
export function attemptToParse<T extends Validator<any, any, any>>(
  validator: T,
  value: unknown,
): { kind: "success"; data: Infer<T> } | { kind: "error"; error: unknown } {
  try {
    return {
      kind: "success",
      data: parse(validator, value),
    };
  } catch (error) {
    return {
      kind: "error",
      error,
    };
  }
}
