"use client";

import React from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useSpaceSelection } from "@/app/contexts/SpaceSelectionContext";
import { useMindMap } from "@/app/contexts/MindMapContext";
import { SPACES_MINDMAP_CHANNEL, MINDMAP_DEBOUNCE_MS, MINDMAP_INFLIGHT_TIMEOUT_MS, MINDMAP_MAX_CONTEXT_TURNS, buildMindMapOOBRequest } from "@/app/lib/spaces/types";
import { v4 as uuidv4 } from "uuid";
import { getResponseChannel, getResponseSpace, getResponseId, parseResponseJson } from "@/app/lib/realtime/parsers";

type UseMindMapOOBOptions = {
  sessionStatus: string;
  sendEvent: (evt: any, nameSuffix?: string) => void;
};

export function useMindMapOOB(options: UseMindMapOOBOptions) {
  const { sessionStatus, sendEvent } = options;
  const { transcriptItems, addTranscriptBreadcrumb } = useTranscript();
  const { loggedEvents, logClientEvent } = useEvent();
  const { selectedSpaceName } = useSpaceSelection();
  const mindMap = useMindMap();

  const inFlightRef = React.useRef<boolean>(false);
  const analyzeTimeoutRef = React.useRef<number | null>(null);
  const lastProcessedResponseIdRef = React.useRef<string | null>(null);
  const autoTimerRef = React.useRef<number | null>(null);
  const lastScheduledFinalItemIdRef = React.useRef<string | null>(null);
  const lastScheduledResponseIdRef = React.useRef<string | null>(null);
  const currentCorrelationIdRef = React.useRef<string | null>(null);
  const lastAppliedCorrelationIdRef = React.useRef<string | null>(null);

  const analyzeNow = React.useCallback(() => {
    try {
      const newCorrelationId = uuidv4();
      const msgs = transcriptItems
        .filter((i) => i.type === 'MESSAGE')
        .slice(-MINDMAP_MAX_CONTEXT_TURNS)
        .map((i) => `${i.role}: ${i.title}`)
        .join('\n');

      const instructions = `You are a concept extractor. Return ONLY a JSON object with an "ops" array; no prose, no audio. Each op is an OBJECT with a "type" field where type ∈ {add_node, update_node, add_edge, remove_edge}.\n\nFor type=add_node or update_node, include: {"type": "add_node|update_node", "label": string, "summary"?: string, "keywords"?: string[], "salience"?: number 1-10}.\nFor type=add_edge, include: {"type": "add_edge", "sourceLabel": string, "targetLabel": string, "relation"?: string, "confidence"?: number 0-1}.\nFor type=remove_edge, include: {"type": "remove_edge", "sourceLabel": string, "targetLabel": string, "relation"?: string}.\n\nAnalyze the conversation (most recent last) and produce minimal diffs strictly in this flat format. Conversation follows:\n\n${msgs}`;
      const base = buildMindMapOOBRequest({ spaceName: selectedSpaceName || undefined, instructions });
      const eventObj = {
        ...base,
        response: {
          ...base.response,
          metadata: { ...base.response.metadata, oobCorrelationId: newCorrelationId },
        },
      } as typeof base;

      try { sendEvent(eventObj, 'analyze_now'); } catch {}
      try {
        if (inFlightRef.current) {
          logClientEvent({ type: 'oob.supersede', prevCorrelationId: currentCorrelationIdRef.current, newCorrelationId });
        } else {
          logClientEvent({ type: 'oob.analyze_start', contextChars: msgs.length, correlationId: newCorrelationId });
        }
      } catch {}
      inFlightRef.current = true;
      currentCorrelationIdRef.current = newCorrelationId;
      if (analyzeTimeoutRef.current) window.clearTimeout(analyzeTimeoutRef.current);
      analyzeTimeoutRef.current = window.setTimeout(() => {
        // Only clear in-flight if the timeout corresponds to the current correlation
        if (currentCorrelationIdRef.current === newCorrelationId) {
          inFlightRef.current = false;
        }
        try { addTranscriptBreadcrumb('MindMap analyze timeout; guard reset'); } catch {}
        try { logClientEvent({ type: 'oob.inflight_reset_timeout' }); } catch {}
      }, MINDMAP_INFLIGHT_TIMEOUT_MS);
    } catch (err) {
      console.error('Analyze now failed', err);
    }
  }, [transcriptItems, selectedSpaceName, sendEvent, logClientEvent, addTranscriptBreadcrumb]);

  // Apply diffs on response.done for our channel and current space
  React.useEffect(() => {
    const rev = [...loggedEvents].reverse();
    const found = rev.find((e) => e.direction === 'server' && e.eventName === 'response.done');
    if (!found) return;
    const response = found.eventData?.response;
    if (!response) return;
    const channel = getResponseChannel(response);
    const space = getResponseSpace(response);
    if (channel !== 'spaces-mindmap') return;
    if (selectedSpaceName && space && space !== selectedSpaceName) return;
    const corr = response?.metadata?.oobCorrelationId as string | undefined;
    if (corr && currentCorrelationIdRef.current && corr !== currentCorrelationIdRef.current) {
      // Ignore out-of-date completion from superseded request
      return;
    }
    const responseId = getResponseId(response);
    if (responseId && lastProcessedResponseIdRef.current === responseId) return;
    const diff = parseResponseJson(response);
    if (!diff || !diff.ops) return;
    mindMap.applyDiff(diff);
    try { logClientEvent({ type: 'oob.applied', ops: diff.ops.length, responseId }); } catch {}
    inFlightRef.current = false;
    if (corr) lastAppliedCorrelationIdRef.current = corr;
    if (responseId) lastProcessedResponseIdRef.current = responseId;
    if (analyzeTimeoutRef.current) {
      window.clearTimeout(analyzeTimeoutRef.current);
      analyzeTimeoutRef.current = null;
    }
  }, [loggedEvents, selectedSpaceName, mindMap.applyDiff, logClientEvent]);

  // Debounced auto scheduling based on transcript final items and assistant done
  React.useEffect(() => {
    if (sessionStatus !== 'CONNECTED') return;
    const rev = [...loggedEvents].reverse();
    const lastFinal = rev.find((e) => e.direction === 'client' && e.eventName === 'oob.transcript_update' && e.eventData?.isFinal);
    const itemId = lastFinal?.eventData?.itemId as string | undefined;
    if (itemId && lastScheduledFinalItemIdRef.current !== itemId) {
      lastScheduledFinalItemIdRef.current = itemId;
      try { logClientEvent({ type: 'oob.schedule', reason: 'final_transcript', itemId }); } catch {}
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = window.setTimeout(() => { analyzeNow(); }, MINDMAP_DEBOUNCE_MS);
      return;
    }
    const lastDone = rev.find((e) => e.direction === 'server' && e.eventName === 'response.done');
    const resp = lastDone?.eventData?.response;
    const channel = resp?.metadata?.channel;
    const respId = resp?.id as string | undefined;
    if (channel === SPACES_MINDMAP_CHANNEL) return;
    if (respId && lastScheduledResponseIdRef.current !== respId) {
      lastScheduledResponseIdRef.current = respId;
      try { logClientEvent({ type: 'oob.schedule', reason: 'assistant_done', responseId: respId }); } catch {}
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = window.setTimeout(() => { analyzeNow(); }, MINDMAP_DEBOUNCE_MS);
    }
  }, [loggedEvents, sessionStatus, analyzeNow, logClientEvent]);

  // Reset in-flight on response.error for OOB channel
  React.useEffect(() => {
    const rev = [...loggedEvents].reverse();
    const found = rev.find((e) => e.direction === 'server' && e.eventName === 'response.error');
    if (!found) return;
    const payload = found.eventData;
    const channel = payload?.response?.metadata?.channel;
    const corr = payload?.response?.metadata?.oobCorrelationId as string | undefined;
    if (channel !== 'spaces-mindmap') return;
    if (!corr || corr === currentCorrelationIdRef.current) {
      inFlightRef.current = false;
    }
    if (analyzeTimeoutRef.current) {
      window.clearTimeout(analyzeTimeoutRef.current);
      analyzeTimeoutRef.current = null;
    }
    try { logClientEvent({ type: 'oob.inflight_reset_error' }); } catch {}
  }, [loggedEvents]);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
      if (analyzeTimeoutRef.current) window.clearTimeout(analyzeTimeoutRef.current);
    };
  }, []);

  return {
    analyzeNow,
  } as const;
}


