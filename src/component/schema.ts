import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    account_sid: v.string(),
    api_version: v.string(),
    body: v.string(),
    counterparty: v.optional(v.string()),
    date_created: v.string(),
    date_sent: v.union(v.string(), v.null()),
    date_updated: v.union(v.string(), v.null()),
    direction: v.string(),
    error_code: v.union(v.number(), v.null()),
    error_message: v.union(v.string(), v.null()),
    from: v.string(),
    messaging_service_sid: v.union(v.string(), v.null()),
    num_media: v.string(),
    num_segments: v.string(),
    price: v.union(v.string(), v.null()),
    price_unit: v.union(v.string(), v.null()),
    sid: v.string(),
    status: v.string(),
    subresource_uris: v.union(
      v.object({ media: v.string(), feedback: v.optional(v.string()) }),
      v.null()
    ),
    to: v.string(),
    uri: v.string(),
  })
    .index("by_sid", ["account_sid", "sid"])
    .index("by_account_sid", ["account_sid"])
    .index("by_account_sid_and_direction", ["account_sid", "direction"])
    .index("by_to", ["account_sid", "to"])
    .index("by_from", ["account_sid", "from"])
    .index("by_counterparty", ["account_sid", "counterparty"]),

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
    .index("by_phone_number", ["account_sid", "phone_number"])
    .index("by_sid", ["account_sid", "sid"]),
});
