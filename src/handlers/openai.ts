import type { Env, OpenAIRequest, OpenAIResponse } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { callAI } from "../services/ai.js";

// handle openai-like chat completions endpoint
export async function handleOpenAIChatCompletions(
  env: Env,
  request: OpenAIRequest,
  authHeader?: string,
): Promise<Response> {
  // verify api key
  if (!env.OPENAI_API_KEY || !authHeader) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Unauthorized",
          type: "invalid_request_error",
          param: null,
          code: "invalid_api_key",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
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
          code: "invalid_api_key",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const model = request.model || getModel(env);
  const messages = request.messages || [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          message: "messages must be a non-empty array",
          type: "invalid_request_error",
          param: "messages",
          code: "invalid_request_error",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
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
            code: "server_error",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const content = aiResponse?.choices?.[0]?.message?.content || "No response";

    const openaiResponse: OpenAIResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: Math.ceil(messages.join(" ").length / 4),
        completion_tokens: Math.ceil(content.length / 4),
        total_tokens: Math.ceil(
          (messages.join(" ").length + content.length) / 4,
        ),
      },
    };

    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OpenAI endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Internal server error",
          type: "server_error",
          param: null,
          code: "server_error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
