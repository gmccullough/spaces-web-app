import { NextRequest, NextResponse } from 'next/server';
import { TranscriptLogger } from '@/app/lib/transcripts/logger';
import { createServerSupabase } from '@/app/lib/supabase/server';

/**
 * POST /api/transcripts
 * Body can be one of:
 * { type: 'create_session', spaceId?: string, tags?: Record<string, unknown> }
 * { type: 'log_message', sessionId: string, role: 'user'|'assistant'|'system', content: string, attachments?: any[], metadata?: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const logger = new TranscriptLogger();

    if (body.type === 'create_session') {
      const { spaceId, tags } = body as { spaceId?: string; tags?: Record<string, unknown> };
      const { sessionId } = await logger.createSession(spaceId ?? null, tags ?? {});
      return NextResponse.json({ sessionId });
    }

    if (body.type === 'log_message') {
      const { sessionId, role, content, attachments, metadata } = body as { sessionId: string; role: 'user'|'assistant'|'system'; content: string; attachments?: any[]; metadata?: Record<string, unknown> };
      if (!sessionId || !role || !content) {
        return NextResponse.json({ error: 'missing fields' }, { status: 400 });
      }
      const { messageId } = await logger.logMessage(sessionId, role, content, attachments, metadata);
      return NextResponse.json({ messageId });
    }

    return NextResponse.json({ error: 'unsupported operation' }, { status: 400 });
  } catch (err: any) {
    console.error('/api/transcripts error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


