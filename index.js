const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/* =========================
🧠 SYSTEM PROMPT
========================= */
function system(env) {
  const p = env.SYSTEM_PROMPT;
  return p && p.trim()
    ? [{ role: "system", content: p }]
    : [];
}

/* =========================
🧠 MODEL
========================= */
function getModel(env) {
  return env.PRIMARY_MODEL && env.PRIMARY_MODEL.trim()
    ? env.PRIMARY_MODEL
    : null;
}

/* =========================
⌨️ TYPING INDICATOR (STABLE)
========================= */
async function typingLoop(env, chatId, signal) {
  try {
    while (!signal.done) {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          action: "typing"
        })
      });

      await new Promise(r => setTimeout(r, 1500));
    }
  } catch {}
}

/* =========================
📩 SEND FINAL MESSAGE ONLY
========================= */
async function send(env, chatId, text, replyToId) {
  const body = { chat_id: chatId, text };
  if (replyToId) body.reply_to_message_id = replyToId;

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

/* =========================
💾 KV SAFE
========================= */
function kv(env) {
  return env.KV || null;
}

async function load(env, chatId) {
  try {
    const store = kv(env);
    if (!store) return { h: [] };

    const raw = await store.get(`c:${chatId}`);
    return { h: raw ? JSON.parse(raw) : [] };
  } catch {
    return { h: [] };
  }
}

async function save(env, chatId, history) {
  try {
    const store = kv(env);
    if (!store) return;

    await store.put(`c:${chatId}`, JSON.stringify(history.slice(-20)));
  } catch {}
}

async function clear(env, chatId) {
  try {
    const store = kv(env);
    if (!store) return;

    await store.delete(`c:${chatId}`);
  } catch {}
}

/* =========================
🧠 FORMAT USER MESSAGE
========================= */
function userMsg(msg) {
  const u = msg.from?.username || msg.from?.first_name || "user";

  return {
    role: "user",
    content: `@${u}: ${msg.text || ""}`
  };
}

/* =========================
🤖 OPENROUTER CALL
========================= */
async function ai(env, messages, model) {
  const res = await fetch(OPENROUTER_URL, {
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

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

/* =========================
🌐 STATUS
========================= */
async function status(env) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    const j = await r.json();
    return j?.ok && !!env.OPENROUTER_API_KEY;
  } catch {
    return false;
  }
}

/* =========================
🤖 MAIN
========================= */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // 🌐 STATUS (BetterStack)
    if (url.pathname === "/status") {
      const ok = await status(env);
      return new Response(ok ? "OK" : "FAIL", {
        status: ok ? 200 : 500,
        headers: { "Content-Type": "text/plain" }
      });
    }

    if (req.method === "GET") {
      return new Response("Sparky API online");
    }

    if (url.pathname !== "/telegram") {
      return new Response("ignored");
    }

    if (req.method !== "POST") return new Response("ok");

    try {
      const update = await req.json();
      const msg = update.message;

      if (!msg?.text) return new Response("ok");

      const chatId = msg.chat.id;
      const text = msg.text;
      const msgId = msg.message_id;

      const model = getModel(env);

      if (!model) {
        await send(env, chatId,
          "Seems like Tanner forgot to choose the model.",
          msgId
        );
        return new Response("no_model");
      }

      // 🔄 START
      if (text === "/start") {
        await clear(env, chatId);

        const signal = { done: false };
        const typingTask = typingLoop(env, chatId, signal);

        const helloMsg = {
          role: "user",
          content: `@${msg.from?.username || msg.from?.first_name || "user"}: hello`
        };

        const data = await ai(env, [
          ...system(env),
          helloMsg
        ], model);

        signal.done = true;
        await typingTask;

        const reply =
          data?.choices?.[0]?.message?.content ||
          "AI failed";

        await send(env, chatId, reply, msgId);
        return new Response("start");
      }

      // 🔄 RESET
      if (text === "/reset") {
        await clear(env, chatId);
        await send(env, chatId, "hello", msgId);
        return new Response("reset");
      }

      // 💾 MEMORY
      const mem = await load(env, chatId);
      const history = mem.h;

      history.push(userMsg(msg));

      const messages = [
        ...system(env),
        ...history
      ];

      // ⌨️ typing starts
      const signal = { done: false };
      const typingTask = typingLoop(env, chatId, signal);

      // 🤖 AI call
      const data = await ai(env, messages, model);

      signal.done = true;
      await typingTask;

      const reply =
        data?.choices?.[0]?.message?.content ||
        "AI failed";

      history.push({
        role: "assistant",
        content: reply
      });

      await save(env, chatId, history);

      // 📩 ONLY FINAL MESSAGE (NO STREAMING)
      await send(env, chatId, reply, msgId);

      return new Response("ok");
    } catch (e) {
      console.log("SPARKY ERROR:", e);
      return new Response("ok");
    }
  }
};