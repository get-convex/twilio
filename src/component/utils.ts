import { parse } from "convex-helpers/validators";
import type { Validator, Infer } from "convex/values";

/**
 * Validates Twilio webhook signature using HMAC-SHA1.
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 *
 * @param authToken - The Twilio auth token for this account
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full URL of the webhook request
 * @param params - The POST parameters as a Record
 * @returns true if signature is valid, false otherwise
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Sort params alphabetically by key and append to URL
  const sortedKeys = Object.keys(params).sort();
  let dataToSign = url;
  for (const key of sortedKeys) {
    dataToSign += key + params[key];
  }

  // Create HMAC-SHA1 hash using Web Crypto API (available in Convex runtime)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(dataToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return signature === expectedSignature;
}

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
