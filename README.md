# Convex Twilio Component
[![npm version](https://badge.fury.io/js/@convex-dev%2Ftwilio.svg)](https://badge.fury.io/js/@convex-dev%2Ftwilio)

**Note: Convex Components are currently in beta**

Send and receive SMS messages in your Convex app using Twilio.

```ts
import Twilio from "@convex-dev/twilio";
import { components } from "./_generated/api";

export const twilio = new Twilio(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER!,
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
import Twilio from "@convex-dev/twilio";
import { components } from "./_generated/api";

export const twilio = new Twilio(components.twilio, {
  // optionally pass in the default "from" phone number you'll be using
  // this must be a phone number you've created with Twilio
  default_from: process.env.TWILIO_PHONE_NUMBER!,
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

This will register two webhook HTTP handlers in your your Convex app's deployment:

- YOUR_CONVEX_SITE_URL/twilio/message-status - capture and store delivery status of messages you **send**.
- YOUR_CONVEX_SITE_URL/twilio/incoming-message - capture and store messages **sent to** your Twilio phone number.

Note: You may pass a custom `http_prefix` to `registerRoutes` if you want to
route Twilio endpoints somewhere other than `YOUR_CONVEX_SITE_URL/twilio`.

## Sending Messages

To send a message use the Convex action `sendMessage` exposed by the client, for example:

```ts
// convex/messages.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

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
// convex/example.ts
import { Twilio, messageValidator } from "@convex-dev/twilio";

const twilio = new Twilio(components.twilio, {
  default_from: process.env.TWILIO_PHONE_NUMBER || "",
});
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

# 🧑‍🏫 What is Convex?

[Convex](https://convex.dev) is a hosted backend platform with a
built-in database that lets you write your
[database schema](https://docs.convex.dev/database/schemas) and
[server functions](https://docs.convex.dev/functions) in
[TypeScript](https://docs.convex.dev/typescript). Server-side database
[queries](https://docs.convex.dev/functions/query-functions) automatically
[cache](https://docs.convex.dev/functions/query-functions#caching--reactivity) and
[subscribe](https://docs.convex.dev/client/react#reactivity) to data, powering a
[realtime `useQuery` hook](https://docs.convex.dev/client/react#fetching-data) in our
[React client](https://docs.convex.dev/client/react). There are also clients for
[Python](https://docs.convex.dev/client/python),
[Rust](https://docs.convex.dev/client/rust),
[ReactNative](https://docs.convex.dev/client/react-native), and
[Node](https://docs.convex.dev/client/javascript), as well as a straightforward
[HTTP API](https://docs.convex.dev/http-api/).

The database supports
[NoSQL-style documents](https://docs.convex.dev/database/document-storage) with
[opt-in schema validation](https://docs.convex.dev/database/schemas),
[relationships](https://docs.convex.dev/database/document-ids) and
[custom indexes](https://docs.convex.dev/database/indexes/)
(including on fields in nested objects).

The
[`query`](https://docs.convex.dev/functions/query-functions) and
[`mutation`](https://docs.convex.dev/functions/mutation-functions) server functions have transactional,
low latency access to the database and leverage our
[`v8` runtime](https://docs.convex.dev/functions/runtimes) with
[determinism guardrails](https://docs.convex.dev/functions/runtimes#using-randomness-and-time-in-queries-and-mutations)
to provide the strongest ACID guarantees on the market:
immediate consistency,
serializable isolation, and
automatic conflict resolution via
[optimistic multi-version concurrency control](https://docs.convex.dev/database/advanced/occ) (OCC / MVCC).

The [`action` server functions](https://docs.convex.dev/functions/actions) have
access to external APIs and enable other side-effects and non-determinism in
either our
[optimized `v8` runtime](https://docs.convex.dev/functions/runtimes) or a more
[flexible `node` runtime](https://docs.convex.dev/functions/runtimes#nodejs-runtime).

Functions can run in the background via
[scheduling](https://docs.convex.dev/scheduling/scheduled-functions) and
[cron jobs](https://docs.convex.dev/scheduling/cron-jobs).

Development is cloud-first, with
[hot reloads for server function](https://docs.convex.dev/cli#run-the-convex-dev-server) editing via the
[CLI](https://docs.convex.dev/cli),
[preview deployments](https://docs.convex.dev/production/hosting/preview-deployments),
[logging and exception reporting integrations](https://docs.convex.dev/production/integrations/),
There is a
[dashboard UI](https://docs.convex.dev/dashboard) to
[browse and edit data](https://docs.convex.dev/dashboard/deployments/data),
[edit environment variables](https://docs.convex.dev/production/environment-variables),
[view logs](https://docs.convex.dev/dashboard/deployments/logs),
[run server functions](https://docs.convex.dev/dashboard/deployments/functions), and more.

There are built-in features for
[reactive pagination](https://docs.convex.dev/database/pagination),
[file storage](https://docs.convex.dev/file-storage),
[reactive text search](https://docs.convex.dev/text-search),
[vector search](https://docs.convex.dev/vector-search),
[https endpoints](https://docs.convex.dev/functions/http-actions) (for webhooks),
[snapshot import/export](https://docs.convex.dev/database/import-export/),
[streaming import/export](https://docs.convex.dev/production/integrations/streaming-import-export), and
[runtime validation](https://docs.convex.dev/database/schemas#validators) for
[function arguments](https://docs.convex.dev/functions/args-validation) and
[database data](https://docs.convex.dev/database/schemas#schema-validation).

Everything scales automatically, and it’s [free to start](https://www.convex.dev/plans).
