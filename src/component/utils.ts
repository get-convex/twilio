import { parse } from "convex-helpers/validators";
import type { Validator, Infer } from "convex/values";

export const twilioRequest = async function (
  path: string,
  account_sid: string,
  auth_token: string,
  body: Record<string, string>,
  method: "POST" | "GET" = "POST",
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/${path}`;
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
