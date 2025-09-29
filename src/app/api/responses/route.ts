import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabase } from '@/app/lib/supabase/server';
import { TranscriptLogger } from '@/app/lib/transcripts/logger';

// Proxy endpoint for the OpenAI Responses API
export async function POST(req: NextRequest) {
  const body = await req.json();

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (body.text?.format?.type === 'json_schema') {
    return await structuredResponse(openai, body);
  } else {
    return await textResponse(openai, body);
  }
}

/**
 * Remove private, underscore-prefixed fields before sending payload to OpenAI.
 * Keeps original `body` intact for server-side logging.
 */
function sanitizeBodyForOpenAI<T extends Record<string, any>>(input: T): T {
  if (!input || typeof input !== 'object') return input;
  const sanitizedEntries = Object.entries(input).filter(([key]) => !key.startsWith('_'));
  return Object.fromEntries(sanitizedEntries) as T;
}

async function structuredResponse(openai: OpenAI, body: any) {
  try {
    const openaiBody = sanitizeBodyForOpenAI(body);
    const response = await openai.responses.parse({
      ...(openaiBody as any),
      stream: false,
    });

    // Log model invocation when context is provided (non-blocking)
    try {
      const logger = new TranscriptLogger();
      if (body?._sessionId || body?._invocationContext) {
        const startedMs = body?._invocationContext?.startedMs as number | undefined;
        const latencyMs = startedMs ? Math.max(0, Date.now() - startedMs) : undefined;
        const tokenUsage = (response as any)?.usage || {};
        await logger.logModelInvocation({
          sessionId: body?._sessionId,
          messageId: body?._messageId,
          provider: 'openai',
          model: body?.model || 'unknown',
          params: { temperature: body?.temperature, top_p: body?.top_p },
          inputTokens: tokenUsage?.input_tokens,
          outputTokens: tokenUsage?.output_tokens,
          latencyMs,
          success: true,
          error: null,
        });
      }
    } catch (e) {
      console.warn('model_invocation logging failed', e);
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    try {
      const logger = new TranscriptLogger();
      if (body?._sessionId || body?._invocationContext) {
        await logger.logModelInvocation({
          sessionId: body?._sessionId,
          messageId: body?._messageId,
          provider: 'openai',
          model: body?.model || 'unknown',
          params: { temperature: body?.temperature, top_p: body?.top_p },
          success: false,
          error: { message: String(err?.message || err) },
        });
      }
    } catch {}
    return NextResponse.json({ error: 'failed' }, { status: 500 }); 
  }
}

async function textResponse(openai: OpenAI, body: any) {
  try {
    const openaiBody = sanitizeBodyForOpenAI(body);
    const response = await openai.responses.create({
      ...(openaiBody as any),
      stream: false,
    });

    // Log model invocation when context is provided (non-blocking)
    try {
      const logger = new TranscriptLogger();
      if (body?._sessionId || body?._invocationContext) {
        const startedMs = body?._invocationContext?.startedMs as number | undefined;
        const latencyMs = startedMs ? Math.max(0, Date.now() - startedMs) : undefined;
        const tokenUsage = (response as any)?.usage || {};
        await logger.logModelInvocation({
          sessionId: body?._sessionId,
          messageId: body?._messageId,
          provider: 'openai',
          model: body?.model || 'unknown',
          params: { temperature: body?.temperature, top_p: body?.top_p },
          inputTokens: tokenUsage?.input_tokens,
          outputTokens: tokenUsage?.output_tokens,
          latencyMs,
          success: true,
          error: null,
        });
      }
    } catch (e) {
      console.warn('model_invocation logging failed', e);
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('responses proxy error', err);
    try {
      const logger = new TranscriptLogger();
      if (body?._sessionId || body?._invocationContext) {
        await logger.logModelInvocation({
          sessionId: body?._sessionId,
          messageId: body?._messageId,
          provider: 'openai',
          model: body?.model || 'unknown',
          params: { temperature: body?.temperature, top_p: body?.top_p },
          success: false,
          error: { message: String(err?.message || err) },
        });
      }
    } catch {}
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
  