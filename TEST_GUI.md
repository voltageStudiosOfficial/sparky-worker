# Sparky Bot Test GUI

A simple web interface for testing bot commands without needing a real Telegram webhook.

## Access

- **GET** `/test` or `/test-gui` - Opens the interactive test GUI
- **POST** `/test` or `/test-gui` - Sends a test message (used by the GUI)

## Features

### Quick Commands
- **Start Command**: Sends `/start` command to initialize conversation
- **Reset Command**: Sends `/reset` command to clear conversation history

### Custom Messages
- Type any message in the input field and click "Send" or press Enter
- Messages are sent as if they came from user ID 0

### Response Display
- All server responses are displayed in the response textarea
- Status indicators show success or error messages
- Loading indicator while request is processing

## Usage

1. Start your local development server: `npm run dev`
2. Open your browser to `http://localhost:8787/test`
3. Use the GUI to test bot commands and messages
4. View responses in real-time

## Test Data

All requests use:
- **User ID**: 0
- **Chat ID**: 0
- **Username**: `testuser`
- **First Name**: `Test`
- **Unique Message IDs**: Generated using timestamp (Date.now())

## Implementation Details

The test GUI:
- Sends properly formatted `TelegramUpdate` objects to the same `processTelegramUpdate` function used by real Telegram webhooks
- Allows testing of `/start`, `/reset`, and custom messages
- Displays both response status and any error messages from the bot
- Provides immediate feedback with success/error indicators
