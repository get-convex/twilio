import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  messages: defineTable({
    account_sid: v.string(),
    api_version: v.string(),
    body: v.string(),
    date_created: v.string(),
    date_sent: v.null(),
    date_updated: v.string(),
    direction: v.string(),
    error_code: v.null(),
    error_message: v.null(),
    from: v.string(),
    messaging_service_sid: v.null(),
    num_media: v.string(),
    num_segments: v.string(),
    price: v.null(),
    price_unit: v.string(),
    sid: v.string(),
    status: v.string(),
    subresource_uris: v.object({ media: v.string() }),
    to: v.string(),
    uri: v.string(),
  })
  .index("by_sid", ["sid"])
  .index("by_account_sid", ["account_sid"])
  .index("by_to", ["to"]),

  incoming_messages: defineTable({
    AccountSid: v.string(),
    ApiVersion: v.string(),
    Body: v.string(),
    From: v.string(),
    FromCity: v.string(),
    FromCountry: v.string(),
    FromState: v.string(),
    FromZip: v.string(),
    MessageSid: v.string(),
    NumMedia: v.string(),
    NumSegments: v.string(),
    SmsMessageSid: v.string(),
    SmsSid: v.string(),
    SmsStatus: v.string(),
    To: v.string(),
    ToCity: v.string(),
    ToCountry: v.string(),
    ToState: v.string(),
    ToZip: v.string(),
  })
  .index("by_SmsSid", ["SmsSid"])
  .index("by_AccountSid", ["AccountSid"])
  .index("by_From", ["From"]),

  phone_numbers: defineTable({
    account_sid: v.string(),
    address_requirements: v.string(),
    address_sid: v.null(),
    api_version: v.string(),
    beta: v.boolean(),
    bundle_sid: v.null(),
    capabilities: v.object({
      fax: v.boolean(),
      mms: v.boolean(),
      sms: v.boolean(),
      voice: v.boolean(),
    }),
    date_created: v.string(),
    date_updated: v.string(),
    emergency_address_sid: v.null(),
    emergency_address_status: v.string(),
    emergency_status: v.string(),
    friendly_name: v.string(),
    identity_sid: v.null(),
    origin: v.string(),
    phone_number: v.string(),
    sid: v.string(),
    sms_application_sid: v.string(),
    sms_fallback_method: v.string(),
    sms_fallback_url: v.string(),
    sms_method: v.string(),
    sms_url: v.string(),
    status: v.string(),
    status_callback: v.string(),
    status_callback_method: v.string(),
    subresource_uris: v.object({
      assigned_add_ons: v.string(),
    }),
    trunk_sid: v.null(),
    uri: v.string(),
    voice_application_sid: v.string(),
    voice_caller_id_lookup: v.boolean(),
    voice_fallback_method: v.string(),
    voice_fallback_url: v.string(),
    voice_method: v.string(),
    voice_url: v.string(),
  })
  .index("by_phone_number", ["phone_number"]),
});