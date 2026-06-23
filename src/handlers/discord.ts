import type { Env, DiscordInteraction, ChatMessage } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { getSystemPrompt } from "../modules/system.js";
import { callAI, callVisionAI, isVisionModel } from "../services/ai.js";
import { loadHistory, saveHistory, clearHistory } from "../services/memory.js";
import { verifyDiscordRequest } from "../services/discord.js";
import { isDiscordBotMentioned } from "../services/multimedia.js";

// Get Discord bot info from API
async function getDiscordBotInfo(env: Env): Promise<{ id: string; username: string } | null> {
  if (!env.DISCORD_BOT_TOKEN) return null;
  
  try {
    const response = await fetch(
      `https://discord.com/api/v10/users/@me`,
      {
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        },
      },
    );
    const data = await response.json();
    if (data.id && data.username) {
      return { id: data.id, username: data.username };
    }
    return null;
  } catch {
    return null;
  }
}

// handle discord interactions
export async function handleDiscordInteraction(
  env: Env,
  request: Request,
  body: string,
  interaction: DiscordInteraction,
): Promise<Response> {
  // verify request signature
  const isValid = await verifyDiscordRequest(env, request, body);
  if (!isValid) {
    console.warn("[discord] Invalid request signature");
    return new Response("Invalid request signature", { status: 401 });
  }

  // Get bot info for mention checking
  const botInfo = await getDiscordBotInfo(env);

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
          "Please send a message.",
        );
      }

      const userId = interaction.member?.user.id || "unknown";
      const username = interaction.member?.user.username || "user";
      const guildId = interaction.guild_id || "";

      // use userId as key for memory
      const memKey = `${guildId}-${userId}`;

      try {
        const model = getModel(env);

        const mem = await loadHistory(env, parseInt(memKey) || 0);
        const history = mem.h;

        // Format user message with any attachments
        const userMsg: ChatMessage = {
          role: "user",
          content: `@${username}: ${userMessage}`,
          images: [],
        };

        // Check for attachments in the interaction
        if (interaction.data?.attachments && interaction.data.attachments.length > 0) {
          // Note: Discord slash commands with attachments may have resolved data
          // For now, we just note that attachments exist
          userMsg.content += " [with attachments] ";
        }

        history.push(userMsg);

        const messages = [...getSystemPrompt(env), ...history];

        const data = await callAI(env, messages, model);

        const reply =
          data?.choices?.[0]?.message?.content || "AI encountered an error.";

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
          "Sparky encountered an error.",
        );
      }
    }

    if (commandName === "reset") {
      const userId = interaction.member?.user.id || "unknown";
      const guildId = interaction.guild_id || "";
      const memKey = `${guildId}-${userId}`;
      await clearHistory(env, parseInt(memKey) || 0);
      return await sendDiscordResponse(interaction, "Chat history cleared.");
    }

    if (commandName === "help") {
      const botUsername = botInfo?.username || "Sparky";
      const helpText = `🤖 **Sparky Bot Help**\n\n` +
        `• /chat <message> - Chat with Sparky\n` +
        `• /reset - Clear chat history\n` +
        `• /help - Show this help\n\n` +
        `Mention @${botUsername} in a message or reply to my messages.`;
      return await sendDiscordResponse(interaction, helpText);
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
