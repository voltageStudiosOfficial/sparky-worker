export interface Env {
  OPENROUTER_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  WEBHOOK_URL?: string;
  DISCORD_BOT_TOKEN?: string;
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_APP_ID?: string;
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
  // For multimodal messages (images, etc.)
  images?: string[];
  audio?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width?: number;
  height?: number;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramEntity {
  type: "mention" | "text_mention" | "bot_command" | string;
  offset: number;
  length: number;
  user?: { id: number; username?: string; first_name?: string };
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  username?: string;
  language_code?: string;
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
  from?: TelegramUser;
  chat: {
    id: number;
    type?: string;
    username?: string;
    first_name?: string;
  };
  message_id: number;
  date?: number;
  
  // Media
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  document?: TelegramDocument;
  audio?: TelegramVoice;
  video?: TelegramVoice;
  video_note?: TelegramVoice;
  
  // Mentions and entities
  entities?: TelegramEntity[];
  caption?: string;
  caption_entities?: TelegramEntity[];
  
  // Reply info
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface MemoryStore {
  h: ChatMessage[];
}

export interface TypingSignal {
  done: boolean;
}

// Discord types
export interface DiscordAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url: string;
  width?: number;
  height?: number;
}

export interface DiscordMention {
  id: string;
  username: string;
  bot?: boolean;
}

export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
    discriminator?: string;
  };
  channel_id: string;
  guild_id?: string;
  attachments?: DiscordAttachment[];
  mentions?: DiscordMention[];
  mention_everyone?: boolean;
  mention_roles?: string[];
  // For message components (buttons, etc.)
  components?: any[];
}

export interface DiscordInteraction {
  type: number;
  data?: {
    name?: string;
    options?: Array<{
      name: string;
      value: string;
      type?: number;
    }>;
    attachments?: DiscordAttachment[];
    resolved?: any;
  };
  message?: DiscordMessage;
  member?: {
    user: {
      id: string;
      username: string;
      bot?: boolean;
    };
    roles?: string[];
  };
  token: string;
  guild_id?: string;
  channel_id?: string;
  // For application commands with attachments
  application_id?: string;
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
