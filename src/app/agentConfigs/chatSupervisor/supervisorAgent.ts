import { RealtimeItem, tool } from '@openai/agents/realtime';


import { listSpaceFiles, readSpaceFile, writeSpaceFile, listSpaces, createSpace } from '@/app/lib/spaces/client';

export const supervisorAgentInstructions = `You are an expert ideation supervisor agent. You guide a junior assistant to capture, refine, and persist ideas for the user using Spaces file tools (list, read, write).

# Principles
- Be concise and action-oriented; keep responses short and clear.
- Prefer doing (via tools) over talking. Only ask for missing parameters you truly need.
- Never claim a save/list/read succeeded unless the tool returned a successful result.

# Session Kickoff (REQUIRED)
- First, call list_space_names to discover available Spaces and their recent activity.
- If Spaces exist: ask the user to pick one or name a new one.
- If none: ask the user to name a new Space (suggest 'ideas'). If new is chosen, call create_space first.

# When to Use Tools
- Saving content, reading a file, listing files in a Space, creating a new Space.
- If required parameters are missing, ask the user for them before calling the tool.

# Parameter Collection Rules
- Required: spaceName for any file operation. If not provided, ask “Which Space should I use? For example, 'ideas'.” If user has no preference, default to 'ideas'.
- For write: require path and content. Default path convention: short-title.md (kebab-case) at the root of the selected Space.
- Confirm before overwriting; support create-only with If-None-Match: * when the user asks to avoid overwrites.

# File Safety & Behavior
- Paths must be relative (no leading '/'). Do not include the space name in the path.
- If the server returns an error, relay a short explanation and propose a next step (e.g., choose another name).

# Output Style
- Produce a single short message for the junior agent to read verbatim to the user.

==== Spaces File IO Guidance ====
- Prefer saving new files at the root of the selected Space unless the user specifies another location (e.g., a subdirectory like notes/ or ideas/).
- Confirm before overwriting existing files. Use list_space_files to check for path conflicts.
- For write-only-if-new requests, set If-None-Match: *.
- If a provided path is invalid, briefly explain and ask for a safe path.
- If required parameters are missing for a tool call, you MUST ask the user for them (e.g., ask for spaceName or file path). Do not attempt to call a tool with placeholders or empty values.
- When a user mentions the "file system" or "files", interpret this as their Space storage. Proactively use list_space_files. If no spaceName is provided, ask: "Which Space should I check? For example, 'ideas'." If the user has no preference, default to 'ideas'.
`;

export const supervisorAgentTools = [
  {
    type: 'function',
    name: 'list_space_names',
    description: 'List available user spaces with recent activity ordering.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'create_space',
    description: 'Create a new user space by name. Idempotent.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_space_files',
    description: 'List files in the specified user space. Optionally limit to a directory and disable recursion.',
    parameters: {
      type: 'object',
      properties: {
        spaceName: { type: 'string' },
        dir: { type: 'string' },
        recursive: { type: 'boolean', default: true },
      },
      required: ['spaceName'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_space_file',
    description: 'Read a file from a user space. Returns base64 content and content type.',
    parameters: {
      type: 'object',
      properties: {
        spaceName: { type: 'string' },
        path: { type: 'string' },
      },
      required: ['spaceName', 'path'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'write_space_file',
    description: 'Write or overwrite a file in a user space.',
    parameters: {
      type: 'object',
      properties: {
        spaceName: { type: 'string' },
        path: { type: 'string' },
        content: { type: 'string', description: 'UTF-8 text or base64 for binary (as plain string).' },
        contentType: { type: 'string' },
        ifNoneMatch: { type: 'string', enum: ['*'] },
      },
      required: ['spaceName', 'path', 'content', 'contentType'],
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

function missingParams(args: any, required: string[]): string[] {
  const a = args || {};
  return required.filter((k) => a[k] === undefined || a[k] === null || String(a[k]).trim() === '');
}

function missingParamError(missing: string[]) {
  return { error: { code: 'MISSING_PARAM', message: `Missing required parameter(s): ${missing.join(', ')}` } };
}

async function getToolResponse(fName: string, args: any) {
  switch (fName) {
    case 'list_space_names': {
      return await listSpaces();
    }
    case 'create_space': {
      const missing = missingParams(args, ['name']);
      if (missing.length) return missingParamError(missing);
      const { name } = args || {};
      return await createSpace(name);
    }
    case 'list_space_files': {
      const missing = missingParams(args, ['spaceName']);
      if (missing.length) return missingParamError(missing);
      const { spaceName, dir, recursive } = args || {};
      return await listSpaceFiles(spaceName, { dir, recursive });
    }
    case 'read_space_file': {
      const missing = missingParams(args, ['spaceName', 'path']);
      if (missing.length) return missingParamError(missing);
      const { spaceName, path } = args || {};
      return await readSpaceFile(spaceName, path);
    }
    case 'write_space_file': {
      const missing = missingParams(args, ['spaceName', 'path', 'content', 'contentType']);
      if (missing.length) return missingParamError(missing);
      const { spaceName, path, content, contentType, ifNoneMatch } = args || {};
      const first = await writeSpaceFile(spaceName, path, content, contentType, { ifNoneMatch });
      // If user asked for create-only (If-None-Match: *) but the object exists, retry without the header
      if ((first as any)?.error?.code === 'CONFLICT' && ifNoneMatch === '*') {
        return await writeSpaceFile(spaceName, path, content, contentType);
      }
      return first;
    }
    default:
      return { result: true };
  }
}

/**
 * Iteratively handles function calls returned by the Responses API until the
 * supervisor produces a final textual answer. Returns that answer as a string.
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      const toolRes = await getToolResponse(fName, args);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'Key information from the user described in their most recent message. This is critical to provide as the supervisor agent with full context as the last message might not be available. Okay to omit if the user message didn\'t add any new information.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    // Attach session context for server-side logging
    try {
      const sessionId = (globalThis as any)?.window?._transcriptSessionId;
      const startedMs = Date.now();
      (body as any)._sessionId = sessionId;
      (body as any)._invocationContext = { startedMs };
    } catch {}

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    // Log assistant message
    try {
      const sessionId = (globalThis as any)?.window?._transcriptSessionId as string | undefined;
      if (sessionId && typeof finalText === 'string' && finalText.trim().length) {
        fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'log_message', sessionId, role: 'assistant', content: finalText }),
        });
      }
    } catch {}

    return { nextResponse: finalText as string };
  },
});
  