export interface Env {
  OPENROUTER_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  SYSTEM_PROMPT?: string;
  PRIMARY_MODEL?: string;
  AI_API?: string;
  KV?: KVNamespace;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: string;
}

export interface TelegramMessage {
  text?: string;
  from?: {
    username?: string;
    first_name?: string;
  };
  chat: {
    id: number;
  };
  message_id: number;
}

export interface TelegramUpdate {
  message: TelegramMessage;
}

export interface MemoryStore {
  h: ChatMessage[];
}

export interface TypingSignal {
  done: boolean;
}
