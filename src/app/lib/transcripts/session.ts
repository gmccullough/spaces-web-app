let currentSessionId: string | null = null;

export function setTranscriptSessionId(id: string) {
  currentSessionId = id;
}

export function getTranscriptSessionId(): string | null {
  return currentSessionId;
}


