import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { twilioRequest } from "./utils.js";

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
        const data = await twilioRequest(path, args.account_sid, args.auth_token, body);
        const id = await ctx.runMutation(internal.phone_numbers.insert, { phone_number: data });
        data._id = id;
        return data;
    }
})

export const insert = internalMutation({
    args: {
        phone_number: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("phone_numbers", args.phone_number);
    }
})

export const patch = internalMutation({
    args: {
        convexId: v.id("phone_numbers"),
        sms_url: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.patch(args.convexId, { sms_url: args.sms_url });
    }
})

export const get = internalQuery({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("phone_numbers")
        .filter(q => q.eq(q.field("sid"), args.sid))
        .first();
    }
})

export const queryByPhoneNumber = internalQuery({
    args: {
        phone_number: v.string(),
        account_sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("phone_numbers")
        .withIndex("by_phone_number", q => q.eq("phone_number", args.phone_number))
        .filter(q => q.eq(q.field("account_sid"), args.account_sid))
        .first();
    }
})

export const updateSmsUrl = action({
    args: {
        account_sid: v.string(),
        auth_token: v.string(),
        sid: v.string(),
        sms_url: v.string(),
    },
    handler: async (ctx, args) => {
        const path = `IncomingPhoneNumbers/${args.sid}.json`;
        const phone_number = await ctx.runQuery(internal.phone_numbers.get, { sid: args.sid });
        let convexId;
        if (!phone_number) {
            console.log("Phone number not found in table - fetching from Twilio");
            const data = await twilioRequest(path, args.account_sid, args.auth_token, {}, "GET");
            console.log("Inserting into table");
            convexId = await ctx.runMutation(internal.phone_numbers.insert, { phone_number: data });
        }  else {
            convexId = phone_number._id;
        }
        const body = {
            SmsUrl: args.sms_url,
        };
        const response = await twilioRequest(path, args.account_sid, args.auth_token, body, "POST");
        await ctx.runMutation(internal.phone_numbers.patch, { convexId, sms_url: args.sms_url });
    }
})

export const getByPhoneNumber = action({
    args: {
        account_sid: v.string(),
        auth_token: v.string(),
        phone_number: v.string(),
    },
    handler: async (ctx, args) => {
        const phone_number: any = await ctx.runQuery(internal.phone_numbers.queryByPhoneNumber, {
            phone_number: args.phone_number,
            account_sid: args.account_sid,
        });
        if (!phone_number) {
            console.log(`Phone number ${args.phone_number} not found in table - fetching from Twilio`);
            const phone_number = encodeURIComponent(args.phone_number);
            const path = `IncomingPhoneNumbers.json?PhoneNumber=${phone_number}`;
            const data = await twilioRequest(path, args.account_sid, args.auth_token, {}, "GET");
            if (data.incoming_phone_numbers.length === 0) {
                throw new Error("Phone number not found");
            }
            console.log("Inserting phone number into table");
            const id = await ctx.runMutation(
                internal.phone_numbers.insert, 
                { phone_number: data.incoming_phone_numbers[0] }
            );
            data.incoming_phone_numbers[0]._id = id;
            return data.incoming_phone_numbers[0];
        } else {
            return phone_number;
        }

    }
})