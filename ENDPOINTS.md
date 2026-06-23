# Sparky Worker - New Endpoints Documentation

This document describes the newly added Discord and OpenAI-like endpoints for the Sparky AI bot.

## Endpoints

### 1. Discord Integration (`/discord`)

**Method:** POST

**Purpose:** Webhook endpoint for Discord bot interactions

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": 1,
  "token": "interaction_token",
  "member": {
    "user": {
      "id": "user_id",
      "username": "username"
    }
  },
  "channel_id": "channel_id",
  "data": {
    "name": "chat",
    "options": [
      {
        "name": "message",
        "value": "your message here"
      }
    ]
  }
}
```

**Commands:**
- `/chat <message>` - Chat with Sparky and maintain conversation history
- `/reset` - Clear chat history for the user

**Response:**
```json
{
  "type": 4,
  "data": {
    "content": "response message"
  }
}
```

**Environment Variables Required:**
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_PUBLIC_KEY` - Your Discord application public key in hex format (for Ed25519 signature verification)
- `DISCORD_APP_ID` - Your Discord application ID (for registering slash commands)
- `OPENROUTER_API_KEY` - OpenRouter API key for AI responses
- `PRIMARY_MODEL` - Model to use (e.g., "openai/gpt-3.5-turbo"). If not set, defaults to `openrouter/gpt-oss-20b:free` (free endpoint)

**Setup:**
1. Create a Discord application at https://discord.com/developers/applications
2. Enable "Message Content Intent" in Bot settings
3. Get your **Public Key** from the General Information tab (copy the hex value)
4. Get your **Application ID** from the General Information tab
5. Create slash commands `/chat` and `/reset` (or use the `registerDiscordCommands` utility)
6. Set the webhook URL to: `https://your-worker-url.workers.dev/discord`

---

### 2. OpenAI-like Endpoint (`/v1/chat/completions`)

**Method:** POST

**Purpose:** OpenAI-compatible chat completions API endpoint

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "model": "openai/gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.6,
  "max_tokens": 2048
}
```

**Response:**
```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "openai/gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response message here"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 32,
    "total_tokens": 77
  }
}
```

**Environment Variables Required:**
- `OPENAI_API_KEY` - API key for authentication (Bearer token)
- `OPENROUTER_API_KEY` - OpenRouter API key for AI responses
- `PRIMARY_MODEL` - Default model to use if not specified in request

**Features:**
- Compatible with OpenAI client libraries
- Supports custom model selection
- Includes token usage estimates
- Proper error responses matching OpenAI format

**Example Usage with Python:**
```python
import openai

openai.api_key = "your_api_key"
openai.api_base = "https://your-worker-url.workers.dev"

response = openai.ChatCompletion.create(
    model="openai/gpt-3.5-turbo",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)
```

**Example Usage with cURL:**
```bash
curl -X POST https://your-worker-url.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

## Existing Endpoints

### Telegram Integration (`/telegram`)

**Method:** POST

**Purpose:** Webhook endpoint for Telegram bot updates

**Supports:**
- `/start` - Initialize chat
- `/reset` - Clear chat history
- Regular messages for conversation

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing/invalid auth)
- `500` - Server error

---

## Configuration

Add the following environment variables to `wrangler.toml` or the Cloudflare Workers dashboard:

```toml
[env.production]
vars = {
  OPENROUTER_API_KEY = "your-key",
  TELEGRAM_BOT_TOKEN = "your-token",
  DISCORD_BOT_TOKEN = "your-token",
  DISCORD_PUBLIC_KEY = "your-public-key-hex",
  DISCORD_APP_ID = "your-application-id",
  OPENAI_API_KEY = "your-api-key",
  PRIMARY_MODEL = "openai/gpt-3.5-turbo",
  SYSTEM_PROMPT = "You are a helpful AI assistant.",
  WEBHOOK_URL = "https://your-worker-url.workers.dev/telegram"
}
```

**Note:** `PRIMARY_MODEL` is optional. If not provided, Sparky will use `openrouter/gpt-oss-20b:free` as a free fallback.

---

## Features

- **Persistent Memory**: All platforms maintain conversation history per user
- **Multiple AI Models**: Support for any model available via OpenRouter
- **Signature Verification**: Discord interaction verification using Ed25519
- **Error Handling**: Comprehensive error messages and logging
- **OpenAI Compatibility**: Use any OpenAI-compatible client library
- **Multimedia Support**: 
  - **Images**: Vision models can analyze photos and image documents
  - **Voice Messages**: Automatic transcription using Whisper
  - **Documents**: Support for various file types
- **Mention Support**: Bot responds when mentioned with @username or in reply to its messages
- **Group Chat Support**: Only responds in groups when mentioned or replied to

---

## Development

Test endpoints using the `/test-gui` endpoint:
- Visit: `https://your-worker-url.workers.dev/test`
- Emulate Telegram messages and commands

Deploy with:
```bash
npm run deploy
```

Check status:
```bash
curl https://your-worker-url.workers.dev/status
```
