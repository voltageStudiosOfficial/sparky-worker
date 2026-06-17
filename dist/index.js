var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/modules/model.ts
function getModel(env) {
  return env.PRIMARY_MODEL && env.PRIMARY_MODEL.trim() ? env.PRIMARY_MODEL : null;
}
__name(getModel, "getModel");

// src/modules/system.ts
function getSystemPrompt(env) {
  const prompt = env.SYSTEM_PROMPT;
  return prompt && prompt.trim() ? [{ role: "system", content: prompt }] : [];
}
__name(getSystemPrompt, "getSystemPrompt");

// src/modules/typing.ts
async function typingLoop(env, chatId, signal) {
  try {
    while (!signal.done) {
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            action: "typing"
          })
        }
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch {
  }
}
__name(typingLoop, "typingLoop");

// src/services/telegram.ts
async function sendMessage(env, chatId, text, replyToId) {
  const body = { chat_id: chatId, text };
  if (replyToId) body.reply_to_message_id = replyToId;
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
}
__name(sendMessage, "sendMessage");
function formatUserMessage(msg) {
  const username = msg.from?.username || msg.from?.first_name || "user";
  return {
    role: "user",
    content: `@${username}: ${msg.text || ""}`
  };
}
__name(formatUserMessage, "formatUserMessage");
async function checkBotStatus(env) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`
    );
    const data = await response.json();
    return data?.ok && !!env.OPENROUTER_API_KEY;
  } catch {
    return false;
  }
}
__name(checkBotStatus, "checkBotStatus");

// src/services/memory.ts
function getKVStore(env) {
  return env.KV || null;
}
__name(getKVStore, "getKVStore");
async function loadHistory(env, chatId) {
  try {
    const store = getKVStore(env);
    if (!store) return { h: [] };
    const raw = await store.get(`c:${chatId}`);
    return { h: raw ? JSON.parse(raw) : [] };
  } catch {
    return { h: [] };
  }
}
__name(loadHistory, "loadHistory");
async function saveHistory(env, chatId, history) {
  try {
    const store = getKVStore(env);
    if (!store) return;
    await store.put(`c:${chatId}`, JSON.stringify(history.slice(-20)));
  } catch {
  }
}
__name(saveHistory, "saveHistory");
async function clearHistory(env, chatId) {
  try {
    const store = getKVStore(env);
    if (!store) return;
    await store.delete(`c:${chatId}`);
  } catch {
  }
}
__name(clearHistory, "clearHistory");

// src/services/ai.ts
var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
async function callAI(env, messages, model) {
  const url = env.AI_API || OPENROUTER_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6
    })
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
__name(callAI, "callAI");

// src/handlers/telegram.ts
async function handleStart(env, chatId, msgId, username) {
  await clearHistory(env, chatId);
  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);
  const helloMsg = {
    role: "user",
    content: `@${username}: hello`
  };
  const data = await callAI(
    env,
    [...getSystemPrompt(env), helloMsg],
    getModel(env) || ""
  );
  signal.done = true;
  await typingTask;
  const reply = data?.choices?.[0]?.message?.content || "AI failed";
  await sendMessage(env, chatId, reply, msgId);
}
__name(handleStart, "handleStart");
async function handleReset(env, chatId, msgId) {
  await clearHistory(env, chatId);
  await sendMessage(env, chatId, "hello", msgId);
}
__name(handleReset, "handleReset");
async function handleMessage(env, chatId, msgId, update) {
  const mem = await loadHistory(env, chatId);
  const history = mem.h;
  history.push(formatUserMessage(update.message));
  const messages = [...getSystemPrompt(env), ...history];
  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);
  const data = await callAI(env, messages, getModel(env) || "");
  signal.done = true;
  await typingTask;
  const reply = data?.choices?.[0]?.message?.content || "AI failed";
  history.push({
    role: "assistant",
    content: reply
  });
  await saveHistory(env, chatId, history);
  await sendMessage(env, chatId, reply, msgId);
}
__name(handleMessage, "handleMessage");
async function processTelegramUpdate(env, update) {
  const msg = update.message;
  if (!msg?.text) return new Response("ok");
  const chatId = msg.chat.id;
  const text = msg.text;
  const msgId = msg.message_id;
  const username = msg.from?.username || msg.from?.first_name || "user";
  const model = getModel(env);
  if (!model) {
    await sendMessage(
      env,
      chatId,
      "yo tanner forgot the model \u{1F480} go fix that",
      msgId
    );
    return new Response("no_model");
  }
  if (text === "/start") {
    await handleStart(env, chatId, msgId, username);
    return new Response("start");
  }
  if (text === "/reset") {
    await handleReset(env, chatId, msgId);
    return new Response("reset");
  }
  await handleMessage(env, chatId, msgId, update);
  return new Response("ok");
}
__name(processTelegramUpdate, "processTelegramUpdate");
async function checkStatus(env) {
  const ok = await checkBotStatus(env);
  return new Response(ok ? "OK" : "FAIL", {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "text/plain" }
  });
}
__name(checkStatus, "checkStatus");

// src/handlers/test-gui.ts
function getTestGUI() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sparky Bot Test GUI</title>
</head>
<body>
  <div class="container">
    <h1>\u{1F916} Sparky Bot Test GUI</h1>
    <p class="subtitle">Emulate bot commands and messages</p>

    <div class="info-box">
      <strong>Test User ID:</strong> 0 | <strong>Test Chat ID:</strong> 0
    </div>

    <div class="section">
      <div class="section-title">Quick Commands</div>
      <div class="button-group">
        <button class="btn-command" onclick="sendCommand('/start')">Start Command</button>
        <button class="btn-command" onclick="sendCommand('/reset')">Reset Command</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Send Custom Message</div>
      <div class="input-group">
        <input type="text" id="messageInput" placeholder="Enter your message..." />
        <button class="btn-send" onclick="sendMessage()">Send</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Response</div>
      <div class="loading" id="loading">
        <span class="spinner"></span> Processing...
      </div>
      <div class="response-label">Server Response:</div>
      <textarea id="responseOutput" readonly></textarea>
      <div class="status" id="status"></div>
    </div>
  </div>

  <script>
    const responseOutput = document.getElementById('responseOutput');
    const statusBox = document.getElementById('status');
    const loading = document.getElementById('loading');
    const messageInput = document.getElementById('messageInput');

    async function sendCommand(command) {
      await sendUpdate({ text: command });
    }

    async function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) {
        showStatus('Please enter a message', 'error');
        return;
      }
      await sendUpdate({ text });
      messageInput.value = '';
    }

    async function sendUpdate(messageData) {
      const update = {
        message: {
          text: messageData.text,
          from: {
            username: 'testuser',
            first_name: 'Test'
          },
          chat: {
            id: 0
          },
          message_id: Date.now()
        }
      };

      loading.classList.add('active');
      statusBox.style.display = 'none';

      try {
        const response = await fetch('/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update)
        });

        const text = await response.text();
        responseOutput.value = text;
        showStatus('\u2713 Request sent successfully', 'success');
      } catch (error) {
        responseOutput.value = \`Error: \${error.message}\`;
        showStatus('\u2717 Request failed', 'error');
      } finally {
        loading.classList.remove('active');
      }
    }

    function showStatus(message, type) {
      statusBox.textContent = message;
      statusBox.className = \`status \${type}\`;
    }

    // Allow Enter key to send message
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  <\/script>
</body>
</html>`;
}
__name(getTestGUI, "getTestGUI");
async function handleTestGUI(req, env) {
  const url = new URL(req.url);
  if (env.ENABLE_TEST_GUI === "false") {
    return new Response("Test GUI is disabled by the bot owner lil bro", {
      status: 403
    });
  }
  if (req.method === "GET") {
    return new Response(getTestGUI(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  }
  if (req.method === "POST") {
    try {
      const update = await req.json();
      const response = await processTelegramUpdate(env, update);
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return new Response(`Error: ${errorMsg}`, {
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
  return new Response("Method not allowed", { status: 405 });
}
__name(handleTestGUI, "handleTestGUI");

// src/services/discord.ts
async function verifyDiscordRequest(env, interaction) {
  return !!env.DISCORD_PUBLIC_KEY;
}
__name(verifyDiscordRequest, "verifyDiscordRequest");

// src/handlers/discord.ts
async function handleDiscordInteraction(env, interaction) {
  const isValid = await verifyDiscordRequest(env, interaction);
  if (!isValid) {
    return new Response("Invalid request signature", { status: 401 });
  }
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  if (interaction.type === 2) {
    const commandName = interaction.data?.name;
    if (commandName === "chat") {
      const userMessage = interaction.data?.options?.[0]?.value || "";
      if (!userMessage) {
        return await sendDiscordResponse(
          interaction,
          "yo you gotta send a message fr"
        );
      }
      const userId = interaction.member?.user.id || "unknown";
      const username = interaction.member?.user.username || "user";
      const memKey = `${userId}`;
      try {
        const model = getModel(env);
        if (!model) {
          return await sendDiscordResponse(
            interaction,
            "yo tanner forgot the model \u{1F480}"
          );
        }
        const mem = await loadHistory(env, parseInt(memKey) || 0);
        const history = mem.h;
        history.push({
          role: "user",
          content: `@${username}: ${userMessage}`
        });
        const messages = [...getSystemPrompt(env), ...history];
        const data = await callAI(env, messages, model);
        const reply = data?.choices?.[0]?.message?.content || "AI took an L fr \u{1F62D}";
        history.push({
          role: "assistant",
          content: reply
        });
        await saveHistory(env, parseInt(memKey) || 0, history);
        return await sendDiscordResponse(interaction, reply);
      } catch (error) {
        console.error("Discord chat error:", error);
        return await sendDiscordResponse(
          interaction,
          "sparky broke something \u{1F62D}"
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
__name(handleDiscordInteraction, "handleDiscordInteraction");
async function sendDiscordResponse(interaction, message) {
  return new Response(
    JSON.stringify({
      type: 4,
      // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: message
      }
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
__name(sendDiscordResponse, "sendDiscordResponse");

// src/handlers/openai.ts
async function handleOpenAIChatCompletions(env, request, authHeader) {
  if (!env.OPENAI_API_KEY || !authHeader) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Unauthorized",
          type: "invalid_request_error",
          param: null,
          code: "invalid_api_key"
        }
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  const token = authHeader.replace("Bearer ", "");
  if (token !== env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Unauthorized",
          type: "invalid_request_error",
          param: null,
          code: "invalid_api_key"
        }
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  const model = request.model || getModel(env) || "";
  const messages = request.messages || [];
  if (!model) {
    return new Response(
      JSON.stringify({
        error: {
          message: "model not configured",
          type: "invalid_request_error",
          param: "model",
          code: "invalid_request_error"
        }
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          message: "messages must be a non-empty array",
          type: "invalid_request_error",
          param: "messages",
          code: "invalid_request_error"
        }
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  try {
    const aiResponse = await callAI(env, messages, model);
    if (aiResponse.error) {
      return new Response(
        JSON.stringify({
          error: {
            message: aiResponse.error,
            type: "invalid_request_error",
            param: null,
            code: "server_error"
          }
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const content = aiResponse?.choices?.[0]?.message?.content || "No response";
    const openaiResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1e3),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: Math.ceil(messages.join(" ").length / 4),
        completion_tokens: Math.ceil(content.length / 4),
        total_tokens: Math.ceil(
          (messages.join(" ").length + content.length) / 4
        )
      }
    };
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("OpenAI endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Internal server error",
          type: "server_error",
          param: null,
          code: "server_error"
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(handleOpenAIChatCompletions, "handleOpenAIChatCompletions");

// src/index.ts
var index_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/test" || url.pathname === "/test-gui") {
      return await handleTestGUI(req, env);
    }
    if (url.pathname === "/status" && req.method === "GET") {
      return await checkStatus(env);
    }
    if (url.pathname === "/set-webhook" && req.method === "GET") {
      const webhookUrl = env.WEBHOOK_URL;
      if (!webhookUrl) {
        return new Response("yo webhook url is missing fr \u{1F62D}", {
          status: 500
        });
      }
      const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
      const response = await fetch(telegramApiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (req.method === "GET") {
      return new Response("\u2728 sparky api is vibin");
    }
    if (req.method !== "POST") {
      return new Response("ok");
    }
    if (url.pathname === "/discord") {
      try {
        const interaction = await req.json();
        return await handleDiscordInteraction(env, interaction);
      } catch (error) {
        console.log("discord took an L:", error);
        return new Response("ok");
      }
    }
    if (url.pathname === "/v1/chat/completions") {
      try {
        const requestBody = await req.json();
        const authHeader = req.headers.get("Authorization") || void 0;
        return await handleOpenAIChatCompletions(env, requestBody, authHeader);
      } catch (error) {
        console.log("openai endpoint took an L:", error);
        return new Response(
          JSON.stringify({
            error: {
              message: "Invalid request",
              type: "invalid_request_error"
            }
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    if (url.pathname === "/telegram") {
      try {
        const update = await req.json();
        return await processTelegramUpdate(env, update);
      } catch (error) {
        console.log("sparky took an L:", error);
        return new Response("ok");
      }
    }
    return new Response("nah");
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
