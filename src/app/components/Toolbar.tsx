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
          <Image src="/spaces-logo.png" alt="Spaces Logo" width={24} height={24} className="mr-2" />
          <div>Spaces</div>
        </div>
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <button onClick={onToggleConnection} className={getConnectionButtonClasses()} disabled={isConnecting}>
            {getConnectionButtonLabel()}
          </button>
          <div className="flex flex-row items-center gap-2 max-w-full">
            <input
              id="push-to-talk"
              type="checkbox"
              checked={isPTTActive}
              onChange={(e) => setIsPTTActive(e.target.checked)}
              disabled={!isConnected}
              className="w-4 h-4"
            />
            <label htmlFor="push-to-talk" className="flex items-center cursor-pointer">
              PTT
            </label>
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              disabled={!isPTTActive}
              className={(isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200") +
                " py-1 px-4 cursor-pointer rounded-md" + (!isPTTActive ? " bg-gray-100 text-gray-400" : "")}
            >
              Talk
            </button>
            <button className="text-sm underline" onClick={() => setShowMore((v) => !v)}>
              {showMore ? "Less" : "More"}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden extras: shown when More is toggled, on all widths */}
      <div className={(showMore ? "flex" : "hidden") + " flex-wrap items-center gap-3 w-full mt-3"}>

        <div className="flex flex-row items-center gap-1 max-w-full">
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

        <div className="flex flex-row items-center gap-2 max-w-full">
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

        <div className="flex flex-row items-center gap-2 max-w-full">
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

        <div className="flex flex-row items-center gap-2 max-w-full">
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

        <div className="flex flex-row items-center gap-2 max-w-full">
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

        <div className="flex flex-row items-center gap-2 max-w-full">
          <button
            onClick={onLogout}
            className="text-sm rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;


