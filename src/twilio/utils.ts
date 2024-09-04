export const twilioRequest = async function(
    path: string,
    account_sid: string,
    auth_token: string,
    body: Record<string, string>,
    method: "POST" | "GET" = "POST"
) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/${path}`;
    const auth = btoa(`${account_sid}:${auth_token}`);
    const request: {
        method: "POST" | "GET";
        headers: {
            Authorization: string;
            "Content-Type": string;
        };
        body?: URLSearchParams;
    } = {
        method,
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };
    if (method === "POST") {
        request["body"] = new URLSearchParams(body);
    }
    const response = await fetch(url, request);
    if (!response.ok) {
        throw new Error("Failed to send request to Twilio");
    }
    return await response.json();
}