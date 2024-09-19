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
        callback?: string;
        from: string;
        status_callback: string;
        to: string;
      },
      {
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }
    >;
    getByCounterparty: FunctionReference<
      "query",
      "public",
      { account_sid: string; counterparty: string; limit?: number },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    getBySid: FunctionReference<
      "query",
      "public",
      { account_sid: string; sid: string },
      {
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      } | null
    >;
    getFrom: FunctionReference<
      "query",
      "public",
      { account_sid: string; from: string; limit?: number },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    getFromTwilioBySidAndInsert: FunctionReference<
      "action",
      "public",
      {
        account_sid: string;
        auth_token: string;
        incomingMessageCallback?: string;
        sid: string;
      },
      {
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }
    >;
    getTo: FunctionReference<
      "query",
      "public",
      { account_sid: string; limit?: number; to: string },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    list: FunctionReference<
      "query",
      "public",
      { account_sid: string; limit?: number },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    listIncoming: FunctionReference<
      "query",
      "public",
      { account_sid: string; limit?: number },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    listOutgoing: FunctionReference<
      "query",
      "public",
      { account_sid: string; limit?: number },
      Array<{
        account_sid: string;
        api_version: string;
        body: string;
        counterparty?: string;
        date_created: string;
        date_sent: string | null;
        date_updated: string | null;
        direction: string;
        error_code: number | null;
        error_message: string | null;
        from: string;
        messaging_service_sid: string | null;
        num_media: string;
        num_segments: string;
        price: string | null;
        price_unit: string | null;
        sid: string;
        status: string;
        subresource_uris: { feedback?: string; media: string } | null;
        to: string;
        uri: string;
      }>
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      { account_sid: string; sid: string; status: string },
      null
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
