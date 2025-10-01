import React from "react";
import Image from "next/image";
import { SessionStatus } from "@/app/types";

interface ToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isTranscriptPaneExpanded?: boolean;
  setIsTranscriptPaneExpanded?: (val: boolean) => void;
  isInspectorPaneExpanded?: boolean;
  setIsInspectorPaneExpanded?: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
  voice: string;
  onVoiceChange: (newVoice: string) => void;
  inputDevices: Array<{ deviceId: string; label: string }>;
  selectedInputDeviceId: string;
  onInputDeviceChange: (deviceId: string) => void;
  onLogoClick: () => void;
  onLogout: () => void;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="10" rx="3"></rect>
      <path d="M5 11a7 7 0 0014 0" strokeLinecap="round"></path>
      <path d="M12 18v3" strokeLinecap="round"></path>
      <path d="M9 21h6" strokeLinecap="round"></path>
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"></path>
      <path d="M19.4 15a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2-1.5-2-3.5-2.4.9a7.6 7.6 0 0 0-1.7-1L13.8 4h-3.6l-.5 2.4a7.6 7.6 0 0 0-1.7 1L5.6 6.5l-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1 7.8 7.8 0 0 0 .1 1l-2 1.5 2 3.5 2.4-.9c.5.4 1.1.7 1.7 1l.5 2.4h3.6l.5-2.4c.6-.3 1.2-.6 1.7-1l2.4.9 2-3.5-2-1.5z" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
  );
}

function Toolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isTranscriptPaneExpanded,
  setIsTranscriptPaneExpanded,
  isInspectorPaneExpanded,
  setIsInspectorPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  codec,
  onCodecChange,
  voice,
  onVoiceChange,
  inputDevices,
  selectedInputDeviceId,
  onInputDeviceChange,
  onLogoClick,
  onLogout,
}: ToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";
  const [showMore, setShowMore] = React.useState(false);

  const handleCodecSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCodecChange(e.target.value);
  };

  const handleVoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onVoiceChange(e.target.value);
  };

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white text-base p-2 w-36 rounded-md h-full";
    const cursorClass = isConnecting ? "cursor-not-allowed" : "cursor-pointer";
    if (isConnected) return `bg-red-600 hover:bg-red-700 ${cursorClass} ${baseClasses}`;
    return `bg-black hover:bg-gray-900 ${cursorClass} ${baseClasses}`;
  }

  return (
    <div className="p-4">
      {/* Top row: logo on left, default controls on right */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center cursor-pointer" onClick={onLogoClick}>
          <Image src="/logo-new.png" alt="Spaces Logo" width={48} height={48} className="mr-2" />
          <div className="uppercase font-medium">Spaces</div>
        </div>
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <div className="flex flex-row items-center gap-2 max-w-full">
            {/* Talk button placeholder on the left to keep toggle position stable */}
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              disabled={!isPTTActive}
              className={
                (isPTTActive
                  ? (isPTTUserSpeaking ? "bg-blue-600 text-white" : "bg-blue-700 text-white hover:bg-blue-800")
                  : "invisible") +
                " py-1 px-3 cursor-pointer rounded-md" + (!isPTTActive ? " pointer-events-none" : "")
              }
              aria-hidden={!isPTTActive}
              aria-label={isPTTActive ? "Hold to talk" : undefined}
              title={isPTTActive ? "Hold to talk" : undefined}
            >
              Talk
            </button>
            <button
              onClick={() => setIsPTTActive((v) => !v)}
              disabled={!isConnected}
              aria-pressed={isPTTActive}
              aria-label={isPTTActive ? "Manual mode" : "Auto mode"}
              className={
                (isPTTActive
                  ? "bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200"
                  : "bg-green-600 text-white hover:bg-green-700 border-green-700") +
                " border rounded-md px-3 py-1 flex items-center"
              }
              title={isPTTActive ? "Manual (push-to-talk)" : "Auto (voice activity detection)"}
            >
              <MicIcon className="w-4 h-4 mr-2" />
              {isPTTActive ? "Manual" : "Auto"}
            </button>
            <button
              className={(isConnected ? "text-gray-700" : "text-gray-400") + " border border-gray-300 rounded-md p-2 hover:bg-gray-50"}
              onClick={() => setShowMore(true)}
              aria-label="Open settings"
              title="Settings"
            >
              <GearIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">Settings</div>
              <button
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close settings"
                onClick={() => setShowMore(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">

              <div className="flex flex-row items-center gap-2">
                <div>Mic:</div>
                <select
                  id="mic-select"
                  value={selectedInputDeviceId}
                  onChange={(e) => onInputDeviceChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer max-w-xs"
                >
                  <option value="default">System default</option>
                  {inputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || d.deviceId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice */}
              <div className="flex flex-row items-center gap-2">
                <div>Voice:</div>
                <select
                  id="voice-select"
                  value={voice}
                  onChange={handleVoiceSelectChange}
                  className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer max-w-[12rem]"
                >
                  <option value="alloy">alloy</option>
                  <option value="ash">ash</option>
                  <option value="ballad">ballad</option>
                  <option value="coral">coral</option>
                  <option value="echo">echo</option>
                  <option value="sage">sage</option>
                  <option value="shimmer">shimmer</option>
                  <option value="verse">verse</option>
                </select>
              </div>

              {/* Codec */}
              <div className="flex flex-row items-center gap-2">
                <div>Codec:</div>
                <select
                  id="codec-select"
                  value={codec}
                  onChange={handleCodecSelectChange}
                  className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none cursor-pointer max-w-[12rem]"
                >
                  <option value="opus">Opus (48 kHz)</option>
                  <option value="pcmu">PCMU (8 kHz)</option>
                  <option value="pcma">PCMA (8 kHz)</option>
                </select>
              </div>
              

              <div className="flex flex-row items-center gap-2">
                <input
                  id="audio-playback"
                  type="checkbox"
                  checked={isAudioPlaybackEnabled}
                  onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
                  disabled={!isConnected}
                  className="w-4 h-4"
                />
                <label htmlFor="audio-playback" className="flex items-center cursor-pointer">
                  Audio playback
                </label>
              </div>

              {/* Transcript */}
              <div className="flex flex-row items-center gap-2">
                <input
                  id="transcript"
                  type="checkbox"
                  checked={!!isTranscriptPaneExpanded}
                  onChange={(e) => setIsTranscriptPaneExpanded?.(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="transcript" className="flex items-center cursor-pointer">
                  Transcript
                </label>
              </div>

              {/* Logs */}
              <div className="flex flex-row items-center gap-2">
                <input
                  id="logs"
                  type="checkbox"
                  checked={isEventsPaneExpanded}
                  onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="logs" className="flex items-center cursor-pointer">
                  Logs
                </label>
              </div>

              {/* Concept inspector */}
              <div className="flex flex-row items-center gap-2">
                <input
                  id="inspector"
                  type="checkbox"
                  checked={!!isInspectorPaneExpanded}
                  onChange={(e) => setIsInspectorPaneExpanded?.(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="inspector" className="flex items-center cursor-pointer">
                  Concept inspector
                </label>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button onClick={onToggleConnection} className={getConnectionButtonClasses() + " w-full"} disabled={isConnecting}>
                  {getConnectionButtonLabel()}
                </button>
                <button
                  onClick={onLogout}
                  className="text-base rounded-md border border-gray-300 p-2 hover:bg-gray-50 w-full"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Toolbar;


