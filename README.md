# Convex Twilio Component

[![npm version](https://badge.fury.io/js/@convex-dev%2Ftwilio.svg)](https://badge.fury.io/js/@convex-dev%2Ftwilio)

<!-- START: Include on https://convex.dev/components -->

Send and receive SMS messages in your Convex app using Twilio.

```ts
import { Twilio } from "@convex-dev/twilio";
import { components } from "./_generated/api";

export const twilio = new Twilio(components.twilio, {
  defaultFrom: process.env.TWILIO_PHONE_NUMBER!,
});

export const sendSms = internalAction({
  handler: async (ctx, args) => {
    return await twilio.sendMessage(ctx, {
      to: "+14151234567",
      body: "Hello, world!",
    });
  },
});
```

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
// convex/convex.config.ts
import { defineApp } from "convex/server";
import twilio from "@convex-dev/twilio/convex.config";

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
// convex/example.ts
import { Twilio } from "@convex-dev/twilio";
import { components } from "./_generated/api";

export const twilio = new Twilio(components.twilio, {
  // optionally pass in the default "from" phone number you'll be using
  // this must be a phone number you've created with Twilio
  defaultFrom: process.env.TWILIO_PHONE_NUMBER!,
});
```

Register Twilio webhook handlers by creating an `http.ts` file in your `convex/` folder and use the client you've exported above:

```ts
// http.ts
import { twilio } from "./example";
import { httpRouter } from "convex/server";

const http = httpRouter();
// this call registers the routes necessary for the component
twilio.registerRoutes(http);
export default http;
```

## Sending Messages

To send a message use the Convex action `sendMessage`:

```ts
// convex/messages.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendSms = internalAction({
  handler: async (ctx, args) => {
    const status = await twilio.sendMessage(ctx, {
      to: "+14158675309",
      body: "Hey Jenny",
    });
  },
});
```

By querying the message (see [below](#querying-messages)) you can check for the status ([Twilio Statuses](https://www.twilio.com/docs/messaging/api/message-resource#message-status-values)). The component subscribes to status updates and writes the most up-to-date status into the database.

## Receiving Messages

To receive messages, you will associate a webhook handler provided by the component with the Twilio phone number you'd like to use.

`twilio.registerRoutes` registers two webhook HTTP handlers in your your Convex app's deployment:

- `YOUR_CONVEX_SITE_URL/twilio/message-status` - capture and store delivery status of messages you **send**.
- `YOUR_CONVEX_SITE_URL/twilio/incoming-message` - capture and store messages **sent to** your Twilio phone number.

Note: You may pass a custom `httpPrefix` to `Twilio` if you want to
route Twilio endpoints somewhere other than `YOUR_CONVEX_SITE_URL/twilio/*`.

For instance, to route to `YOUR_CONVEX_SITE_URL/custom-twilio/message-status`, set:

```ts
export const twilio = new Twilio(components.twilio, {
  httpPrefix: "/custom-twilio",
});
```

You can associate it with your Twilio phone number in two ways:

1. Using the [Twilio console](https://console.twilio.com/) in the "Configure" tab of the phone number, under "Messaging Configuration" -> "A messsage comes in" -> "URL".

2. By calling `registerIncomingSmsHandler` exposed by the component client, passing it the phone number's SID:

```ts
export const registerIncomingSmsHandler = internalAction({
  args: {},
  handler: async (ctx) => {
    return await twilio.registerIncomingSmsHandler(ctx, {
      sid: "YOUR_TWILIO_PHONE_NUMBER_SID",
    });
  },
});
```

Once it is configured, incoming messages will be captured by the component and logged in the `messages` table.

You can execute your own logic upon receiving an incoming message, by providing a callback when instantiating the Twilio Component client:

```ts
// convex/example.ts
import { Twilio, messageValidator } from "@convex-dev/twilio";

const twilio = new Twilio(components.twilio);
twilio.incomingMessageCallback = internal.example.handleIncomingMessage;

export const handleIncomingMessage = internalMutation({
  args: {
    message: messageValidator,
  },
  handler: async (ctx, message) => {
    // Use ctx here to update the database or schedule other actions.
    // This is in the same transaction as the component's message insertion.
    console.log("Incoming message", message);
  },
});
```

If the `handleIncomingMessage` callback throws an error, the message will not be
saved and the webhook will throw an error. Twilio
[does not retry webhook requests](https://www.twilio.com/docs/usage/security/availability-reliability),
but you can replay them manually from the Twilio "Error logs" console.

## Querying Messages

To list all the mssages, use the `list` method in your Convex function.

To list all the incoming or outgoing messages, use `listIncoming` and `listOutgoing` methods:

```ts
// convex/messages.ts

// ...

export const list = query({
  args: {},
  handler: async (ctx) => {
    const allMessages = await twilio.list(ctx);
    const receivedMessages = await twilio.listIncoming(ctx);
    const sentMessages = await twilio.listOutgoing(ctx);
    return { allMessages, receivedMessages, sentMessages };
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
  },
});
```

Get messages by the "to" phone number:

```ts
export const getMessagesTo = query({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesTo(ctx, args);
  },
});
```

Get messages by the "from" phone number:

```ts
export const getMessagesFrom = query({
  args: {
    from: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesFrom(ctx, args);
  },
});
```

You can also get all messages to and from a particular number:

```ts
export const getMessagesByCounterparty = query({
  args: {
    from: v.string(),
  },
  handler: async (ctx, args) => {
    return await twilio.getMessagesByCounterparty(ctx, args);
  },
});
```

<!-- END: Include on https://convex.dev/components -->
