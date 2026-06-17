import type { Env, TelegramUpdate } from "../types/index.js";
import { processTelegramUpdate } from "./telegram.js";

const TEST_USER_ID = 0;
const TEST_CHAT_ID = 0;

/**
 * Generate the HTML test GUI interface
 */
function getTestGUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sparky Bot Test GUI</title>
</head>
<body>
  <div class="container">
    <h1>🤖 Sparky Bot Test GUI</h1>
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
        showStatus('✓ Request sent successfully', 'success');
      } catch (error) {
        responseOutput.value = \`Error: \${error.message}\`;
        showStatus('✗ Request failed', 'error');
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
  </script>
</body>
</html>`;
}

/**
 * Handle test GUI requests
 */
export async function handleTestGUI(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  // Allow disabling the test GUI in the env variables panel
  if (env.ENABLE_TEST_GUI === "false") {
    return new Response("Test GUI is disabled by the bot owner lil bro", {
      status: 403,
    });
  }
  // GET request - return the HTML GUI
  if (req.method === "GET") {
    return new Response(getTestGUI(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // POST request - process the test command
  if (req.method === "POST") {
    try {
      const update = (await req.json()) as TelegramUpdate;
      const response = await processTelegramUpdate(env, update);
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return new Response(`Error: ${errorMsg}`, {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
