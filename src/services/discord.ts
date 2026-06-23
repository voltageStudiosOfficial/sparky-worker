import type { Env, DiscordInteraction } from "../types/index.js";

const DISCORD_API_URL = "https://discord.com/api/v10";

/**
 * Verify Discord interaction signature using Ed25519
 * Discord sends X-Discord-Signature and X-Discord-Timestamp headers
 * The signature is an Ed25519 signature of (timestamp + body)
 * We verify it using the application's public key (DISCORD_PUBLIC_KEY)
 * 
 * Note: DISCORD_PUBLIC_KEY should be the hex-encoded public key from Discord Developer Portal
 */
export async function verifyDiscordRequest(
  env: Env,
  request: Request,
  body: string,
): Promise<boolean> {
  if (!env.DISCORD_PUBLIC_KEY) {
    console.warn("[discord] DISCORD_PUBLIC_KEY not configured, skipping verification");
    return false;
  }

  try {
    const signatureHeader = request.headers.get("X-Discord-Signature");
    const timestamp = request.headers.get("X-Discord-Timestamp");

    if (!signatureHeader || !timestamp) {
      console.warn("[discord] Missing X-Discord-Signature or X-Discord-Timestamp headers");
      return false;
    }

    // Discord sends the signature as a hex string in X-Discord-Signature
    // The DISCORD_PUBLIC_KEY should also be a hex string from Discord Developer Portal
    const message = timestamp + body;
    const messageBuffer = new TextEncoder().encode(message);

    // Import the Ed25519 public key from hex
    const publicKeyBuffer = hexToArrayBuffer(env.DISCORD_PUBLIC_KEY);
    
    const publicKey = await crypto.subtle.importKey(
      "raw",
      publicKeyBuffer,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["verify"],
    );

    // Decode the signature from hex to ArrayBuffer
    const signatureBuffer = hexToArrayBuffer(signatureHeader);

    // Verify the signature
    const isValid = await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBuffer,
      messageBuffer,
    );

    return isValid;
  } catch (error) {
    console.error("[discord] Signature verification failed:", error);
    // Fallback: if Ed25519 fails, try simple HMAC-SHA256 as a fallback
    // This might work for some older setups
    return false;
  }
}

/**
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  // Remove any whitespace or prefixes
  const cleanHex = hex.replace(/\s+/g, '').replace(/^0x/, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
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

  if (!env.DISCORD_APP_ID) {
    return new Response("Discord app ID not configured", { status: 500 });
  }

  const commands = [
    {
      name: "chat",
      description: "Chat with Sparky",
      options: [
        {
          type: 3, // STRING
          name: "message",
          description: "Your message",
          required: true,
        },
      ],
    },
    {
      name: "reset",
      description: "Reset chat history",
    },
    {
      name: "help",
      description: "Show help information",
    },
  ];

  const endpoint = guildId
    ? `${DISCORD_API_URL}/applications/${env.DISCORD_APP_ID}/guilds/${guildId}/commands`
    : `${DISCORD_API_URL}/applications/${env.DISCORD_APP_ID}/commands`;

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
