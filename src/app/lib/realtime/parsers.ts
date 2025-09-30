export function getResponseId(response: any): string | undefined {
  return response?.id as string | undefined;
}

export function getResponseChannel(response: any): string | undefined {
  return response?.metadata?.channel as string | undefined;
}

export function getResponseSpace(response: any): string | undefined {
  return response?.metadata?.spaceName as string | undefined;
}

// Attempts to parse JSON payload from various content forms commonly returned by models
export function parseResponseJson(response: any): any | undefined {
  try {
    const output = response?.output;
    if (!Array.isArray(output) || output.length === 0) return undefined;
    const content = output[0]?.content?.[0];
    if (!content || typeof content !== 'object') return undefined;

    if (content.type === 'text' && typeof content.text === 'string') {
      try { return JSON.parse(content.text); } catch { return undefined; }
    }
    if (content.type === 'input_text' && typeof content.text === 'string') {
      try { return JSON.parse(content.text); } catch { return undefined; }
    }
    if (content.type === 'audio' && typeof (content as any).transcript === 'string') {
      try { return JSON.parse((content as any).transcript); } catch { return undefined; }
    }
  } catch {
    // ignore parsing errors
  }
  return undefined;
}


