# Convex Twilio Component

Send and receive SMS messages in your Convex app using Twilio.

## Prerequisites

### Twilio Phone Number

Create a Twilio account and, if you haven't already, create a [Twilio Phone Number](https://www.twilio.com/docs/phone-numbers).

Note the **Phone Number SID** of the phone number you'll be using, you'll need it in a moment.

### Convex App

You'll need a Convex App to use the component. Follow any of the [Convex quickstarts](https://docs.convex.dev/home) to set one up.

## Installation

Install the component package:

```ts
npm install @convex-dev/twilio
```

Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:

```ts
// convex/convex.config.js
import { defineApp } from "convex/server";
import twilio from "@convex-dev/twilio/convex.config.js";

const app = defineApp();
app.use(twilio);

export default app;
```

Set your API credentials:

```sh
npx convex env set TWILIO_ACCOUNT_SID=ACxxxxx
npx convex env set TWILIO_AUTH_TOKEN=xxxxx
```

Instantiate a Twilio Component client in a file in your app's `convex/` folder:

```ts
// convex/twilio.ts
import Twilio from "@convex-dev/twilio";
import { components } from "./_generated/server.js";

const twilio = new Twilio(
    components.twilio,
    {
        // optionally pass in the default "from" phone number you'll be using
        // this must be a phone number you've created with Twilio
        default_from: process.env.TWILIO_PHONE_NUMBER || "",
    }
);

// export to be used everywhere in your /convex code
export default twilio;
```

Register webhooks by creating an `http.ts` file in your `convex/` folder and use the client you've exported above:

Or, if you already have an http router:

```ts
// http.ts
import twilio from "./twilio";
import { httpRouter } from "convex/server";

const http = httpRouter();
twilio.registerRoutes(http);
export default http;
```

This will register two webhook HTTP handlers in your your Convex app's deployment:

- YOUR_CONVEX_SITE_URL/twilio/message-status - this will capture delivery status of messages you **send**.
- YOUR_CONVEX_SITE_URL/twilio/incoming-message - this will capture messages **sent to** your Twilio phone number.

Note: if you want to route twilio endpoints somewhere else, pass a custom http_prefix

## Sending Messages

To send a message use the Convex action `sendMessage` exposed by the client, for example:

```ts
// convex/messages.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import twilio from "./twilio";

export const sendSms = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.sendMessage(ctx, args);
  },
});
```

By querying the message (see [below](#querying-messages)) you can check for the status ([Twilio Statuses](https://www.twilio.com/docs/messaging/api/message-resource#message-status-values)). The component subscribes to status updates and writes the most up-to-date status into the database.

## Receiving Messages

To receive messages, you will associate a webhook handler provided by the component with the Twilio phone number you'd like to use.
The webhook handler is mounted at

```
YOUR_CONVEX_SITE_URL/incoming-message
```

You can associate it with your Twilio phone number in two ways:

1. Using the [Twilio console](https://console.twilio.com/) in the "Configure" tab of the phone number, under "Messaging Configuration" -> "A messsage comes in" -> "URL".

2. By calling `registerIncomingSmsHandler` exposed by the component client, passing it the phone number's SID:

```ts
// convex/messages.ts

// ...

export const registerIncomingSmsHandler = internalAction({
  args: {},
  handler: async (ctx) => {
    return await twilio.registerIncomingSmsHandler(ctx, {
      sid: "YOUR_TWILIO_PHONE_NUMBER_SID",
    });
  },
});
```

Now, incoming messages will be captured by the component and logged in the `messages` table.

You can execute your own logic upon receiving an incoming message, by providing a callback when instantiating the Twilio Component client:
```ts
// convex/twilio.ts

const twilio = new Twilio(
    components.twilio,
    {
        default_from: process.env.TWILIO_PHONE_NUMBER || "",
        incomingMessageCallback: async (ctx, message) => {
            // use ctx here to execute other Convex functions
            console.log("Incoming message", message);
        }
    }
);
```

## Querying Messages

To list all the mssages, use the `list` method of the `Twilio` class in your Convex function.

To list all the incoming messages, use the `listIncoming` method of the `Twilio` class:

```ts
// convex/messages.ts

// ...

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await twilio.list(ctx);
  },
});

export const listIncoming = query({
  args: {},
  handler: async (ctx) => {
    return await twilio.listIncoming(ctx);
  },
});
```

To get a single message by its sid, use `getMessageBySid`:
```ts

export const getMessageBySid = query({
    args: {
        sid: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getMessageBySid(ctx, args);
    }  
})
```


Get messages by the "to" phone number:
```ts
export const getMessagesByTo = query({
    args: {
        to: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getMessagesByTo(ctx, args);
    }
})
```

Get incoming messages by the "from" phone number:
```ts
export const getIncomingMessagesByFrom = query({
    args: {
        from: v.string(),
    },
    handler: async (ctx, args) => {
        return await twilio.getIncomingMessagesByFrom(ctx, args);
    }
})
``