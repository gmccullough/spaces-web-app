"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ClipboardCopyIcon, DownloadIcon, PaperPlaneIcon } from "@radix-ui/react-icons";

import Pane from "@/app/components/ui/Pane";
import IconButton from "@/app/components/ui/IconButton";
import EmptyState from "@/app/components/ui/EmptyState";
import { usePersistentState } from "@/app/lib/ui/usePersistentState";
import { cn } from "@/app/lib/ui/cn";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useUILayout } from "@/app/contexts/UILayoutContext";
import { TranscriptItem } from "@/app/types";
import { GuardrailChip } from "../GuardrailChip";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

export default function TranscriptPane({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { isTranscriptOpen } = useUILayout();
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showSystem, setShowSystem] = usePersistentState<boolean>(
    "transcriptShowSystem",
    false
  );

  const visibleItems = useMemo(() => {
    if (showSystem) return transcriptItems;
    return transcriptItems.filter((item) => {
      if (item.type !== "MESSAGE") return false;
      const hasText = (item.title || "").trim().length > 0;
      const role = (item as any).role;
      const isUserOrAssistant = role === "user" || role === "assistant";
      return isUserOrAssistant && hasText;
    });
  }, [transcriptItems, showSystem]);

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      requestAnimationFrame(() => scrollToBottom());
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom());
  }, [showSystem]);

  const scrollToBottom = () => {
    if (!transcriptRef.current) return;
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  };

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  if (!isTranscriptOpen) {
    return null;
  }

  return (
    <Pane className="flex-1 min-h-0" id="transcript-pane">
      <Pane.Header
        title="Transcript"
        actions={
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <label className="flex items-center gap-1 leading-none">
              <input
                type="checkbox"
                checked={showSystem}
                onChange={(event) => setShowSystem(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show system
            </label>
            <IconButton
              ariaLabel="Copy transcript"
              icon={<ClipboardCopyIcon className="h-3.5 w-3.5" />}
              variant="ghost"
              size="sm"
              onClick={handleCopyTranscript}
            />
            <IconButton
              ariaLabel="Download audio"
              icon={<DownloadIcon className="h-3.5 w-3.5" />}
              variant="ghost"
              size="sm"
              onClick={downloadRecording}
            />
            <span className="text-[11px] text-gray-500">
              {justCopied ? "Copied!" : ""}
            </span>
          </div>
        }
      />
      <Pane.Body className="p-0">
        <div
          ref={transcriptRef}
          className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-4 md:max-h-none"
        >
          {visibleItems.length === 0 ? (
            <EmptyState
              dense
              title="No transcript yet"
              description="Start a conversation to see the transcript."
            />
          ) : (
            [...visibleItems]
              .sort((a, b) => a.createdAtMs - b.createdAtMs)
              .map((item) => <TranscriptItemRow key={item.itemId} item={item} onToggleExpand={toggleTranscriptItemExpand} />)
          )}
        </div>
      </Pane.Body>
      <Pane.Footer>
        <div className="flex w-full items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userText}
            onChange={(event) => setUserText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canSend) {
                onSendMessage();
              }
            }}
            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Type a message…"
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={!canSend || !userText.trim()}
            className={cnSendButton(canSend && userText.trim().length > 0)}
            aria-label="Send message"
          >
            <PaperPlaneIcon className="h-4 w-4" />
          </button>
        </div>
      </Pane.Footer>
    </Pane>
  );
}

type TranscriptItemRowProps = {
  item: TranscriptItem;
  onToggleExpand: (id: string) => void;
};

function TranscriptItemRow({ item, onToggleExpand }: TranscriptItemRowProps) {
  const {
    itemId,
    type,
    role,
    data,
    expanded,
    timestamp,
    title = "",
    isHidden,
    guardrailResult,
  } = item;

  if (isHidden) return null;

  if (type === "MESSAGE") {
    const isUser = role === "user";
    const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
    const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;
    const bubbleClasses = cnMessageBubble(isUser);

    return (
      <div className={cnColumn(isUser)}>
        <div className="max-w-lg">
          <div className={bubbleClasses}>
            <div className={cnTimestamp(isUser)}>{timestamp}</div>
            <div className={cnContent(isBracketedMessage)}>
              <ReactMarkdown>{displayTitle}</ReactMarkdown>
            </div>
          </div>
          {guardrailResult ? (
            <div className="rounded-b-xl bg-gray-200 px-3 py-2">
              <GuardrailChip guardrailResult={guardrailResult} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (type === "BREADCRUMB") {
    return (
      <div className="flex flex-col items-start justify-start text-sm text-gray-600">
        <span className="text-xs font-mono text-gray-400">{timestamp}</span>
        <button
          type="button"
          className="flex items-center whitespace-pre-wrap font-mono text-sm text-left text-gray-800 transition hover:text-gray-900"
          onClick={() => data && onToggleExpand(itemId)}
        >
          {data ? (
            <span
              className={cn(
                "mr-2 select-none text-gray-400 transition-transform duration-200",
                expanded ? "rotate-90" : "rotate-0"
              )}
              aria-hidden="true"
            >
              ▶
            </span>
          ) : null}
          {title}
        </button>
        {expanded && data ? (
          <pre className="mt-2 max-w-full overflow-auto whitespace-pre-wrap break-words rounded border-l-2 border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex justify-center text-sm italic text-gray-500">
      Unknown item type: {type}
      <span className="ml-2 text-xs text-gray-400">{timestamp}</span>
    </div>
  );
}

function cnMessageBubble(isUser: boolean) {
  return isUser
    ? "rounded-t-xl rounded-bl-xl bg-gray-900 p-3 text-gray-100"
    : "rounded-t-xl rounded-br-xl bg-gray-100 p-3 text-gray-900";
}

function cnTimestamp(isUser: boolean) {
  return isUser ? "text-xs text-gray-400" : "text-xs text-gray-500";
}

function cnContent(isBracketedMessage: boolean) {
  return isBracketedMessage ? "whitespace-pre-wrap italic text-gray-400" : "whitespace-pre-wrap";
}

function cnColumn(isUser: boolean) {
  return isUser
    ? "flex justify-end"
    : "flex justify-start";
}

function cnSendButton(isEnabled: boolean) {
  return isEnabled
    ? "flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-800"
    : "flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-500";
}
