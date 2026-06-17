import type { Env, DiscordInteraction } from "../types/index.js";

const DISCORD_API_URL = "https://discord.com/api/v10";

// verify discord request signature using nacl
export async function verifyDiscordRequest(
  env: Env,
  interaction: DiscordInteraction,
): Promise<boolean> {
  // Note: Full implementation requires nacl library for signature verification
  // For now, just check if we have the public key
  // In production, verify: HMAC-SHA256(public_key, timestamp + body)
  return !!env.DISCORD_PUBLIC_KEY;
}

// send a message to discord
export async function sendDiscordMessage(
  env: Env,
  channelId: string,
  message: string,
): Promise<Response> {
  if (!env.DISCORD_BOT_TOKEN) {
    return new Response("Discord bot token not configured", { status: 500 });
  }

  const response = await fetch(
    `${DISCORD_API_URL}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    },
  );

  return response;
}

// register slash commands with discord
export async function registerDiscordCommands(
  env: Env,
  guildId?: string,
): Promise<Response> {
  if (!env.DISCORD_BOT_TOKEN) {
    return new Response("Discord bot token not configured", { status: 500 });
  }

  // Get app id from environment or derive it
  const commands = [
    {
      name: "chat",
      description: "chat with sparky",
      options: [
        {
          type: 3, // STRING
          name: "message",
          description: "your message",
          required: true,
        },
      ],
    },
    {
      name: "reset",
      description: "reset chat history",
    },
  ];

  const endpoint = guildId
    ? `${DISCORD_API_URL}/applications/YOUR_APP_ID/guilds/${guildId}/commands`
    : `${DISCORD_API_URL}/applications/YOUR_APP_ID/commands`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  return response;
}
