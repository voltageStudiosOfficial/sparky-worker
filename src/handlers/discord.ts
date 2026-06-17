import type { Env, DiscordInteraction } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { getSystemPrompt } from "../modules/system.js";
import { callAI } from "../services/ai.js";
import { loadHistory, saveHistory, clearHistory } from "../services/memory.js";
import { verifyDiscordRequest } from "../services/discord.js";

// handle discord interactions
export async function handleDiscordInteraction(
  env: Env,
  interaction: DiscordInteraction,
): Promise<Response> {
  // verify request signature
  const isValid = await verifyDiscordRequest(env, interaction);
  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }

  // type 1 is PING
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // type 2 is APPLICATION_COMMAND (slash commands)
  if (interaction.type === 2) {
    const commandName = interaction.data?.name;

    if (commandName === "chat") {
      const userMessage = interaction.data?.options?.[0]?.value || "";
      if (!userMessage) {
        return await sendDiscordResponse(
          interaction,
          "yo you gotta send a message fr",
        );
      }

      const userId = interaction.member?.user.id || "unknown";
      const username = interaction.member?.user.username || "user";

      // use userId as key for memory
      const memKey = `${userId}`;

      try {
        const model = getModel(env);
        if (!model) {
          return await sendDiscordResponse(
            interaction,
            "yo tanner forgot the model 💀",
          );
        }

        const mem = await loadHistory(env, parseInt(memKey) || 0);
        const history = mem.h;

        history.push({
          role: "user",
          content: `@${username}: ${userMessage}`,
        });

        const messages = [...getSystemPrompt(env), ...history];

        const data = await callAI(env, messages, model);

        const reply =
          data?.choices?.[0]?.message?.content || "AI took an L fr 😭";

        history.push({
          role: "assistant",
          content: reply,
        });

        await saveHistory(env, parseInt(memKey) || 0, history);

        return await sendDiscordResponse(interaction, reply);
      } catch (error) {
        console.error("Discord chat error:", error);
        return await sendDiscordResponse(
          interaction,
          "sparky broke something 😭",
        );
      }
    }

    if (commandName === "reset") {
      const userId = interaction.member?.user.id || "unknown";
      await clearHistory(env, parseInt(userId) || 0);
      return await sendDiscordResponse(interaction, "chat history cleared fr");
    }
  }

  return new Response("ok");
}

async function sendDiscordResponse(
  interaction: DiscordInteraction,
  message: string,
): Promise<Response> {
  return new Response(
    JSON.stringify({
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: message,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
