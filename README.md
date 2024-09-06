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
```
npm install @convex-dev/twilio-component
```


Create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`:
```
// convex/convex.config.js
import { defineApp } from "convex/server";
import twilio from "@convex-dev/twilio-component/convex.config.js";

const app = defineApp();
app.use(twilio, { name: "twilio" });

export default app;
```

Instantiate a Twilio Component client in a file in your app's `convex/` folder:
```
// convex/twilio.ts
import Twilio from "@convex-dev/twilio-component";
import { components } from "./_generated/server.js";

const twilio = new Twilio(
    components.twilio,
    // REPLACE with your Twilio Account SID
    process.env.TWILIO_ACCOUNT_SID ?? "",
    // REPLACE with your Twilio Auth Token
    process.env.TWILIO_AUTH_TOKEN ?? "",
    process.env.CONVEX_SITE_URL ?? ""
);

export default twilio;
```

Register webhooks by creating an `http.ts` file in your `convex/` folder and use the client you've exported above:
```
// http.ts
import twilio from "./twilio";
export default twilio.http;
```

This will register two webhook HTTP handlers in your your Convex app's deployment:
- YOUR_CONVEX_SITE_URL/message-status - this will capture delivery status of messages you **send**.
- YOUR_CONVEX_SITE_URL/incoming-message - this will capture messages **sent to** your Twilio phone number.

## Sending Messages
To send a message use the Convex action `sendMessage` exposed by the client, for example:
```
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
        return await twilio.sendMessage(ctx, {
            ...args,
            from: "YOUR_TWILIO_PHONE_NUMBER",
        });
    }
})
```


## Receiving Messages
To receive messages, you will associate a webhook handler provided by the component with the Twilio phone number you'd like to use.
The webhook handler is mounted at 
```
YOUR_CONVEX_SITE_URL/incoming-message
```

You can associate it with your Twilio phone number either using the [Twilio console](https://console.twilio.com/) in the "Configure" tab of the phone number, under "Messaging Configuration" -> "A messsage comes in" -> "URL" or by calling `registerIncomingSmsHandler` exposed by the component client, passing it the phone number's SID:
```
export const registerIncomingSmsHandler = internalAction({
    args: {},
    handler: async (ctx) => {
        return await twilio.registerIncomingSmsHandler(ctx, { sid: "YOUR_TWILIO_PHONE_NUMBER_SID"});
    }
})
```

Now, incoming messages will be captured by the component and logged in the `incoming_messages` table.