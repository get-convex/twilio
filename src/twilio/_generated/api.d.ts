/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as messages from "../messages.js";
import type * as phone_numbers from "../phone_numbers.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  messages: typeof messages;
  phone_numbers: typeof phone_numbers;
  utils: typeof utils;
}>;
export type Mounts = {
  messages: {
    create: FunctionReference<
      "action",
      "public",
      {
        account_sid: string;
        auth_token: string;
        body: string;
        from: string;
        status_callback: string;
        to: string;
      },
      any
    >;
    insertIncoming: FunctionReference<
      "mutation",
      "public",
      { message: any },
      any
    >;
    list: FunctionReference<"query", "public", { account_sid: string }, any>;
    listIncoming: FunctionReference<
      "query",
      "public",
      { account_sid: string },
      any
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      { account_sid: string; auth_token: string; sid: string; status: string },
      any
    >;
  };
  phone_numbers: {
    create: FunctionReference<
      "action",
      "public",
      { account_sid: string; auth_token: string; number: string },
      any
    >;
    updateSmsUrl: FunctionReference<
      "action",
      "public",
      { account_sid: string; auth_token: string; sid: string; sms_url: string },
      any
    >;
  };
};
// For now fullApiWithMounts is only fullApi which provides
// jump-to-definition in component client code.
// Use Mounts for the same type without the inference.
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

/* prettier-ignore-end */
