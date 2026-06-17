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
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 30px;
    }

    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }

    .info-box {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
      font-size: 13px;
      color: #555;
    }

    .section {
      margin-bottom: 25px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
    }

    .button-group.full {
      grid-template-columns: 1fr;
    }

    button {
      padding: 12px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-command {
      background: #667eea;
      color: white;
    }

    .btn-command:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-command:active {
      transform: translateY(0);
    }

    .input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    input[type="text"] {
      flex: 1;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #667eea;
      background: #f9f9ff;
    }

    .btn-send {
      background: #764ba2;
      color: white;
      padding: 12px 20px;
    }

    .btn-send:hover {
      background: #653a8a;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
    }

    textarea {
      width: 100%;
      min-height: 150px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      resize: vertical;
      background: #f9f9f9;
      color: #333;
    }

    .response-label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading {
      display: none;
      text-align: center;
      padding: 15px;
      color: #667eea;
      font-weight: 500;
    }

    .loading.active {
      display: block;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .status {
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      display: none;
    }

    .status.success {
      display: block;
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status.error {
      display: block;
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  </style>
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
