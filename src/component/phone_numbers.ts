import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { twilioRequest } from "./utils.js";
import schema from "./schema.js";

export const create = action({
  args: {
    account_sid: v.string(),
    auth_token: v.string(),
    number: v.string(),
  },
  handler: async (ctx, args) => {
    const path = "IncomingPhoneNumbers.json";
    const body = {
      PhoneNumber: args.number,
    };
    const data = await twilioRequest(
      path,
      args.account_sid,
      args.auth_token,
      body,
    );
    const id = await ctx.runMutation(internal.phone_numbers.insert, {
      phone_number: data,
    });
    data._id = id;
    return data;
  },
});

export const insert = internalMutation({
  args: {
    phone_number: v.any(),
  },
  returns: v.id("phone_numbers"),
  handler: async (ctx, args) => {
    // It might have extra fields so we need to sanitize it before inserting into the table
    const sanitizedData: Record<string, any> = {};
    Object.keys(args.phone_number).forEach((field) => {
      if (
        Object.keys(schema.tables.phone_numbers.validator.fields).includes(
          field,
        )
      ) {
        sanitizedData[field] = args.phone_number[field];
      } else {
        console.warn(`Unexpected field ${field} in phone number data`);
      }
    });

    return await ctx.db.insert("phone_numbers", sanitizedData as any);
  },
});

export const patch = internalMutation({
  args: {
    convexId: v.id("phone_numbers"),
    sms_url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.convexId, { sms_url: args.sms_url });
  },
});

export const get = internalQuery({
  args: {
    account_sid: v.string(),
    sid: v.string(),
  },
  returns: v.union(
    v.object({
      ...schema.tables.phone_numbers.validator.fields,
      _id: v.id("phone_numbers"),
      _creationTime: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phone_numbers")
      .withIndex("by_sid", (q) =>
        q.eq("account_sid", args.account_sid).eq("sid", args.sid),
      )
      .first();
  },
});

export const queryByPhoneNumber = internalQuery({
  args: {
    phone_number: v.string(),
    account_sid: v.string(),
  },
  returns: v.union(
    v.object({
      ...schema.tables.phone_numbers.validator.fields,
      _id: v.id("phone_numbers"),
      _creationTime: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phone_numbers")
      .withIndex("by_phone_number", (q) =>
        q
          .eq("account_sid", args.account_sid)
          .eq("phone_number", args.phone_number),
      )
      .first();
  },
});

export const updateSmsUrl = action({
  args: {
    account_sid: v.string(),
    auth_token: v.string(),
    sid: v.string(),
    sms_url: v.string(),
  },
  handler: async (ctx, args) => {
    const path = `IncomingPhoneNumbers/${args.sid}.json`;
    const phone_number = await ctx.runQuery(internal.phone_numbers.get, {
      sid: args.sid,
      account_sid: args.account_sid,
    });
    let convexId;
    if (!phone_number) {
      console.log("Phone number not found in table - fetching from Twilio");
      const data = await twilioRequest(
        path,
        args.account_sid,
        args.auth_token,
        {},
        "GET",
      );
      console.log("Inserting into table");
      convexId = await ctx.runMutation(internal.phone_numbers.insert, {
        phone_number: data,
      });
    } else {
      convexId = phone_number._id;
    }
    const body = {
      SmsUrl: args.sms_url,
    };
    await twilioRequest(path, args.account_sid, args.auth_token, body, "POST");
    await ctx.runMutation(internal.phone_numbers.patch, {
      convexId,
      sms_url: args.sms_url,
    });
  },
});

export const getByPhoneNumber = internalAction({
  args: {
    account_sid: v.string(),
    auth_token: v.string(),
    phone_number: v.string(),
  },
  returns: v.object({
    ...schema.tables.phone_numbers.validator.fields,
    _id: v.id("phone_numbers"),
    _creationTime: v.number(),
  }),
  handler: async (ctx, args) => {
    const phone_number: any = await ctx.runQuery(
      internal.phone_numbers.queryByPhoneNumber,
      {
        phone_number: args.phone_number,
        account_sid: args.account_sid,
      },
    );
    if (!phone_number) {
      console.log(
        `Phone number ${args.phone_number} not found in table - fetching from Twilio`,
      );
      const phone_number = encodeURIComponent(args.phone_number);
      const path = `IncomingPhoneNumbers.json?PhoneNumber=${phone_number}`;
      const data = await twilioRequest(
        path,
        args.account_sid,
        args.auth_token,
        {},
        "GET",
      );
      if (data.incoming_phone_numbers.length === 0) {
        throw new Error("Phone number not found");
      }
      console.log("Inserting phone number into table");
      const id = await ctx.runMutation(internal.phone_numbers.insert, {
        phone_number: data.incoming_phone_numbers[0],
      });
      data.incoming_phone_numbers[0]._id = id;
      return data.incoming_phone_numbers[0];
    } else {
      return phone_number;
    }
  },
});
