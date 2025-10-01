"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import { createBrowserSupabase } from "@/app/lib/supabase/client";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import Toolbar from "./components/Toolbar";
import SpacesFilesPanel from "./components/SpacesFilesPanel";
import MindMapInspector from "./components/MindMapInspector";
import SpacePickerModal from "./components/SpacePickerModal";
import { SpaceSelectionProvider, useSpaceSelection } from "./contexts/SpaceSelectionContext";
import { MindMapProvider } from "./contexts/MindMapContext";

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { mindMapDiffJsonSchema } from "@/app/lib/spaces/types";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { useSpacesMindMap } from "./hooks/useSpacesMindMap";
import { useMindMapOOB } from "./hooks/useMindMapOOB";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { chatSupervisorScenario } from "@/app/agentConfigs/chatSupervisor";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";

// Map used by connect logic for scenarios defined via the SDK.
const sdkScenarioMap: Record<string, RealtimeAgent[]> = {
  chatSupervisor: chatSupervisorScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function AppInner() {
  const searchParams = useSearchParams()!;
  const supabase = React.useMemo(() => createBrowserSupabase(), []);

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    transcriptItems,
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const mindMap = useSpacesMindMap();
  const { loggedEvents, logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);
  const reconnectOnVoiceChangeRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [inputDevices, setInputDevices] = useState<Array<{ deviceId: string; label: string }>>([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'default';
    return localStorage.getItem('selectedInputDeviceId') || 'default';
  });
  const [selectedMicStream, setSelectedMicStream] = useState<MediaStream | undefined>(undefined);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window === 'undefined') return 'sage';
    return localStorage.getItem('voice') || 'sage';
  });

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    async function ensureDeviceLabels() {
      try {
        // Request permission to access at least the default mic so device labels populate
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // ignore; user may grant later
      }
    }
    ensureDeviceLabels();

    const refreshDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label }));
        setInputDevices(audioInputs);
      } catch (err) {
        console.warn('Failed to enumerate devices', err);
      }
    };
    refreshDevices();

    const handleDeviceChange = () => refreshDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', handleDeviceChange as any);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', handleDeviceChange as any);
    };
  }, []);

  // Acquire mic stream for selected device
  useEffect(() => {
    let cancelled = false;
    async function getMic() {
      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedInputDeviceId && selectedInputDeviceId !== 'default'
            ? { deviceId: { exact: selectedInputDeviceId } as ConstrainDOMString }
            : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setSelectedMicStream(stream);
      } catch (err) {
        console.error('Failed to getUserMedia for selected device', err);
        setSelectedMicStream(undefined);
      }
    }
    getMic();
    localStorage.setItem('selectedInputDeviceId', selectedInputDeviceId);
    return () => {
      cancelled = true;
    };
  }, [selectedInputDeviceId]);

  useEffect(() => {
    const agents = allAgentSets[defaultAgentSetKey];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, []);

  const { hasMadeInitialSelection, selectedSpaceName } = useSpaceSelection();

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED" && hasMadeInitialSelection) {
      connectToRealtime();
    }
  }, [selectedAgentName, hasMadeInitialSelection]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      if (selectedSpaceName) {
        addTranscriptBreadcrumb(`Space: ${selectedSpaceName}`);
      }
      updateSession(!handoffTriggeredRef.current);
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus, selectedSpaceName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = defaultAgentSetKey;
    if (sdkScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Ensure the selectedAgentName is first so that it becomes the root
        const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        // Ensure the root agent uses the selected voice for this connection
        try {
          const root = reorderedAgents[0] as any;
          if (root && selectedVoice) {
            root.voice = selectedVoice;
          }
        } catch {}

        // Ensure mic stream is live before connecting (some browsers end tracks on PC close)
        let micStreamToUse = selectedMicStream;
        const needsNewMic =
          !micStreamToUse ||
          !micStreamToUse.active ||
          micStreamToUse.getAudioTracks().length === 0 ||
          micStreamToUse.getAudioTracks().every((t) => t.readyState !== 'live');

        if (needsNewMic) {
          try {
            const constraints: MediaStreamConstraints = {
              audio: selectedInputDeviceId && selectedInputDeviceId !== 'default'
                ? { deviceId: { exact: selectedInputDeviceId } as ConstrainDOMString }
                : true,
            };
            const fresh = await navigator.mediaDevices.getUserMedia(constraints);
            micStreamToUse = fresh;
            setSelectedMicStream(fresh);
          } catch (err) {
            console.error('Failed to reacquire microphone stream for reconnect', err);
            micStreamToUse = undefined;
          }
        }

        const companyName = chatSupervisorCompanyName;
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          mediaStream: micStreamToUse,
          outputGuardrails: [guardrail],
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });

        // Create transcript session (user-scoped; no explicit space linkage yet)
        try {
          const res = await fetch('/api/transcripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'create_session' }),
          });
          if (res.ok) {
            const json = await res.json();
            (window as any)._transcriptSessionId = json.sessionId;
          }
        } catch (e) {
          console.warn('Failed to create transcript session', e);
        }
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    // Clear any existing remote stream from the audio element to avoid overlap
    try {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      }
    } catch {}
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');

    // Log user message
    try {
      const sessionId = (window as any)._transcriptSessionId as string | undefined;
      if (sessionId) {
        fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'log_message', sessionId, role: 'user', content: text }),
        });
      }
    } catch {}
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
        voice: selectedVoice,
      },
    });

    // Send an initial priming message to trigger the agent
    if (shouldTriggerResponse) {
      if (selectedSpaceName) {
        sendSimulatedUserMessage(`Use the Space "${selectedSpaceName}" for file operations.`);
      } else {
        sendSimulatedUserMessage('hi');
      }
    }
    return;
  }

  useEffect(() => {
    localStorage.setItem('voice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    if (sessionStatus === 'DISCONNECTED' && reconnectOnVoiceChangeRef.current) {
      reconnectOnVoiceChangeRef.current = false;
      // Small delay to ensure previous peer connection fully closes before reconnect
      setTimeout(() => {
        connectToRealtime();
      }, 150);
    }
  }, [sessionStatus]);

  const handleVoiceChange = (newVoice: string) => {
    // Persist immediately
    try { localStorage.setItem('voice', newVoice); } catch {}
    if (sessionStatus === 'CONNECTED' || sessionStatus === 'CONNECTING') {
      try { interrupt(); } catch {}
      reconnectOnVoiceChangeRef.current = true;
      handoffTriggeredRef.current = true; // avoid auto-greet on reconnect
      setSelectedVoice(newVoice);
      disconnectFromRealtime();
      return;
    }
    setSelectedVoice(newVoice);
  };

  // If user switches space mid-session, prime the assistant
  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && hasMadeInitialSelection && selectedSpaceName !== null) {
      addTranscriptBreadcrumb(`Space: ${selectedSpaceName || 'Just talk'}`);
      if (selectedSpaceName) {
        sendSimulatedUserMessage(`Switch to the Space "${selectedSpaceName}" for file operations.`);
      }
    }
  }, [selectedSpaceName]);

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    // Log user message
    try {
      const sessionId = (window as any)._transcriptSessionId as string | undefined;
      if (sessionId) {
        fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'log_message', sessionId, role: 'user', content: userText.trim() }),
        });
      }
    } catch {}

    setUserText("");
  };

  // OOB orchestration via dedicated hook
  const { analyzeNow } = useMindMapOOB({
    sessionStatus,
    sendEvent: (evt: any, suffix?: string) => sendClientEvent(evt, suffix),
  });

  // OOB orchestration now handled by useMindMapOOB

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    // Default to ON so the app is not listening after reloads (PTT required)
    if (storedPushToTalkUI === null) {
      setIsPTTActive(true);
      localStorage.setItem("pushToTalkUI", "true");
    } else {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  return (
    <div className="text-base flex flex-col min-h-screen bg-gray-100 text-gray-800 relative">
      {/* Header removed; logo moved into Toolbar */}

      <div className="px-2 pb-2">
        <Toolbar
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
          isPTTActive={isPTTActive}
          setIsPTTActive={setIsPTTActive}
          isPTTUserSpeaking={isPTTUserSpeaking}
          handleTalkButtonDown={handleTalkButtonDown}
          handleTalkButtonUp={handleTalkButtonUp}
          isEventsPaneExpanded={isEventsPaneExpanded}
          setIsEventsPaneExpanded={setIsEventsPaneExpanded}
          isAudioPlaybackEnabled={isAudioPlaybackEnabled}
          setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
          codec={urlCodec}
          onCodecChange={handleCodecChange}
          voice={selectedVoice}
          onVoiceChange={handleVoiceChange}
          inputDevices={inputDevices}
          selectedInputDeviceId={selectedInputDeviceId}
          onInputDeviceChange={setSelectedInputDeviceId}
          onLogoClick={() => window.location.reload()}
          onLogout={handleLogout}
          onAnalyzeNow={analyzeNow}
          onToggleInspector={() => setIsInspectorOpen((v)=>!v)}
        />
      </div>

      <div className="px-2 pb-2">
        <SpacesFilesPanel />
      </div>

      <div className="flex flex-1 gap-2 px-2 relative flex-col md:flex-row overflow-visible md:overflow-hidden min-h-0">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={
            sessionStatus === "CONNECTED"
          }
        />

        <Events isExpanded={isEventsPaneExpanded} />
      </div>

      <MindMapInspector isOpen={isInspectorOpen} onClose={() => setIsInspectorOpen(false)} />

      
    </div>
  );
}

function App() {
  return (
    <SpaceSelectionProvider>
      <MindMapProvider>
        <ModalPortalWrapper />
        <HideUIUntilSelection>
          <AppInner />
        </HideUIUntilSelection>
      </MindMapProvider>
    </SpaceSelectionProvider>
  );
}

function ModalPortalWrapper() {
  const { isPickerOpen, isFirstLoadBlocking, selectJustTalk, selectSpace, closePicker } = useSpaceSelection();

  React.useEffect(() => {
    const handler = () => closePicker();
    window.addEventListener('spaces:closePicker', handler);
    return () => window.removeEventListener('spaces:closePicker', handler);
  }, [closePicker]);

  // Always render to ensure focus trap and first-load overlay
  return (
    <SpacePickerModal
      isOpen={isPickerOpen}
      isBlocking={isFirstLoadBlocking}
      onSelectJustTalk={selectJustTalk}
      onSelectSpace={selectSpace}
    />
  );
}

export default App;

function HideUIUntilSelection({ children }: { children: React.ReactNode }) {
  const { hasMadeInitialSelection } = useSpaceSelection();
  if (!hasMadeInitialSelection) {
    // Hide content behind modal during first-load selection
    return null;
  }
  return <>{children}</>;
}
