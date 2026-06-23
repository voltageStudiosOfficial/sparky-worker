import type {
  Env,
  TelegramUpdate,
  DiscordInteraction,
  OpenAIRequest,
} from "./types/index.js";
import { processTelegramUpdate, checkStatus } from "./handlers/telegram.js";
import { handleTestGUI } from "./handlers/test-gui.js";
import { handleDiscordInteraction } from "./handlers/discord.js";
import { handleOpenAIChatCompletions } from "./handlers/openai.js";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // test gui vibes
    if (url.pathname === "/test" || url.pathname === "/test-gui") {
      return await handleTestGUI(req, env);
    }

    // gimme the status check
    if (url.pathname === "/status" && req.method === "GET") {
      return await checkStatus(env);
    }
    // webhook szn
    if (url.pathname === "/set-webhook" && req.method === "GET") {
      const webhookUrl = env.WEBHOOK_URL;
      if (!webhookUrl) {
        return new Response("yo webhook url is missing fr 😭", {
          status: 500,
        });
      }
      const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
      const response = await fetch(telegramApiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    // handle GET requests
    if (req.method === "GET") {
      return new Response("✨ sparky api is vibin");
    }

    // we only rock with POST fr
    if (req.method !== "POST") {
      return new Response("ok");
    }

    // discord webhook
    if (url.pathname === "/discord") {
      try {
        const body = await req.text();
        const interaction = JSON.parse(body) as DiscordInteraction;
        return await handleDiscordInteraction(env, req, body, interaction);
      } catch (error) {
        console.log("discord took an L:", error);
        return new Response("ok");
      }
    }

    // openai-like endpoint
    if (url.pathname === "/v1/chat/completions") {
      try {
        const requestBody = (await req.json()) as OpenAIRequest;
        const authHeader = req.headers.get("Authorization") || undefined;
        return await handleOpenAIChatCompletions(env, requestBody, authHeader);
      } catch (error) {
        console.log("openai endpoint took an L:", error);
        return new Response(
          JSON.stringify({
            error: {
              message: "Invalid request",
              type: "invalid_request_error",
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    // telegram webhook (default)
    if (url.pathname === "/telegram") {
      try {
        const update = (await req.json()) as TelegramUpdate;
        return await processTelegramUpdate(env, update);
      } catch (error) {
        console.log("sparky took an L:", error);
        return new Response("ok");
      }
    }

    // unknown path
    return new Response("nah");
  },
};
