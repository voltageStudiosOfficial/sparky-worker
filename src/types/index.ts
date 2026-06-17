export interface Env {
  OPENROUTER_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  WEBHOOK_URL?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_PUBLIC_KEY?: string;
  OPENAI_API_KEY?: string;
  SYSTEM_PROMPT?: string;
  PRIMARY_MODEL?: string;
  AI_API?: string;
  ENABLE_TEST_GUI?: string;
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

// Discord types
export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  channel_id: string;
}

export interface DiscordInteraction {
  type: number;
  data?: {
    name?: string;
    options?: Array<{
      name: string;
      value: string;
    }>;
  };
  message?: DiscordMessage;
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
  token: string;
  guild_id?: string;
  channel_id?: string;
}

// OpenAI-like endpoint types
export interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
