import type { Env } from "../types/index.js";

/**
 * Transcription service for voice messages
 * 
 * Uses OpenRouter's whisper-1 model which has a free tier.
 * Requires OPENROUTER_API_KEY to be set.
 * 
 * Alternative options you could implement:
 * - OpenAI Whisper API (direct)
 * - Google Cloud Speech-to-Text
 * - AWS Transcribe
 * - Local Whisper instance
 */

const OPENROUTER_AUDIO_URL = "https://openrouter.ai/api/v1/audio/transcriptions";

/**
 * Transcribe audio using OpenRouter's Whisper model
 * 
 * Note: OpenRouter supports audio transcription with whisper-1 model
 * The audio should be in a supported format (mp3, wav, etc.)
 */
export async function transcribeAudio(
  env: Env,
  audioData: ArrayBuffer,
  mimeType: string = "audio/mpeg",
): Promise<string | null> {
  try {
    const response = await fetch(OPENROUTER_AUDIO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/whisper-1",
        // Note: OpenRouter expects the audio as a data URL or URL
        // For now, we'll need to handle this differently
      }),
    });

    if (!response.ok) {
      console.error("[transcription] Failed to transcribe audio:", response.status);
      return null;
    }

    const data = (await response.json()) as { text?: string; error?: string };
    return data.text || null;
  } catch (error) {
    console.error("[transcription] Transcription error:", error);
    return null;
  }
}

/**
 * Transcribe audio from a URL using OpenRouter
 */
export async function transcribeAudioFromUrl(
  env: Env,
  audioUrl: string,
): Promise<string | null> {
  try {
    // First, we need to download the audio
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error("[transcription] Failed to download audio:", audioResponse.status);
      return null;
    }

    const audioData = await audioResponse.arrayBuffer();
    
    // Convert to base64
    const base64 = arrayBufferToBase64(audioData);
    const mimeType = audioResponse.headers.get("content-type") || "audio/mpeg";

    // Create data URL
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Now send to OpenRouter
    const response = await fetch(OPENROUTER_AUDIO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/whisper-1",
        audio: dataUrl,
      }),
    });

    if (!response.ok) {
      console.error("[transcription] Failed to transcribe audio:", response.status);
      return null;
    }

    const data = (await response.json()) as { text?: string; error?: string };
    return data.text || null;
  } catch (error) {
    console.error("[transcription] Transcription error:", error);
    return null;
  }
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Transcribe a Telegram voice message
 * 
 * Note: This requires the file_id and downloads the voice message from Telegram
 */
export async function transcribeTelegramVoice(
  env: Env,
  fileId: string,
  duration: number,
): Promise<string | null> {
  try {
    // Get file path
    const filePathResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
    );
    const filePathData = (await filePathResponse.json()) as {
      result?: { file_path?: string };
    };
    
    const filePath = filePathData.result?.file_path;
    if (!filePath) {
      console.error("[transcription] Could not get file path for:", fileId);
      return null;
    }

    // Download the voice file
    const voiceUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    return transcribeAudioFromUrl(env, voiceUrl);
  } catch (error) {
    console.error("[transcription] Failed to transcribe Telegram voice:", error);
    return null;
  }
}
