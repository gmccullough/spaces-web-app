import { createServerSupabase } from "@/app/lib/supabase/server";

export type SessionTags = Record<string, unknown>;

export interface LogModelInvocationInput {
  sessionId?: string;
  messageId?: string;
  provider: string;
  model: string;
  params?: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  success?: boolean;
  error?: Record<string, unknown> | null;
}

export class TranscriptLogger {
  async createSession(spaceId?: string | null, tags?: SessionTags): Promise<{ sessionId: string }> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("unauthorized");
    const insert = {
      space_id: spaceId ?? null,
      user_id: user.id,
      tags: tags ?? {},
    } as any;
    const { data, error } = await supabase.from("chat_sessions").insert(insert).select("id").single();
    if (error) throw error;
    return { sessionId: data.id };
  }

  async logMessage(sessionId: string, role: "user" | "assistant" | "system", content: string, attachments?: Array<Record<string, unknown>>, metadata?: Record<string, unknown>): Promise<{ messageId: string }> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("unauthorized");
    const insert = {
      session_id: sessionId,
      role,
      content,
      attachments: attachments ?? [],
      metadata: metadata ?? {},
    } as any;
    const { data, error } = await supabase.from("chat_messages").insert(insert).select("id").single();
    if (error) throw error;
    return { messageId: data.id };
  }

  async logModelInvocation(input: LogModelInvocationInput): Promise<{ id: string }> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("unauthorized");

    const insert = {
      session_id: input.sessionId ?? null,
      message_id: input.messageId ?? null,
      provider: input.provider,
      model: input.model,
      params: input.params ?? {},
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      success: input.success ?? null,
      error: input.error ?? null,
    } as any;
    const { data, error } = await supabase.from("model_invocations").insert(insert).select("id").single();
    if (error) throw error;
    return { id: data.id };
  }
}


