import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTwilioRequestUrl,
  resolveTwilioApiBaseUrl,
  twilioRequest,
} from "./utils.js";

const ACCOUNT_SID = "AC123";

afterEach(() => {
  delete process.env.TWILIO_API_BASE_URL;
  vi.unstubAllGlobals();
});

describe("resolveTwilioApiBaseUrl", () => {
  it("defaults to the standard Twilio API host", () => {
    expect(resolveTwilioApiBaseUrl()).toBe("https://api.twilio.com");
  });

  it("uses the configured API base URL", () => {
    process.env.TWILIO_API_BASE_URL = "https://api.dublin.ie1.twilio.com";

    expect(resolveTwilioApiBaseUrl()).toBe(
      "https://api.dublin.ie1.twilio.com",
    );
  });

  it("removes trailing slashes from the configured base URL", () => {
    process.env.TWILIO_API_BASE_URL = "https://api.dublin.ie1.twilio.com///";

    expect(resolveTwilioApiBaseUrl()).toBe(
      "https://api.dublin.ie1.twilio.com",
    );
  });
});

describe("buildTwilioRequestUrl", () => {
  it("builds the REST URL from the configured base URL", () => {
    process.env.TWILIO_API_BASE_URL = "https://api.dublin.ie1.twilio.com/";

    expect(buildTwilioRequestUrl("Messages.json", ACCOUNT_SID)).toBe(
      "https://api.dublin.ie1.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
    );
  });
});

describe("twilioRequest", () => {
  it("sends requests to the configured API base URL", async () => {
    process.env.TWILIO_API_BASE_URL = "https://api.dublin.ie1.twilio.com/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM123" }),
    });
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    await twilioRequest("Messages.json", ACCOUNT_SID, "token", {
      Body: "Hello",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.dublin.ie1.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
