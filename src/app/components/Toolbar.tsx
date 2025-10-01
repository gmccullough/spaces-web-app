"use client";

import React from "react";
import Image from "next/image";
import { GearIcon, PersonIcon, SpeakerLoudIcon } from "@radix-ui/react-icons";

import ToggleGroup from "@/app/components/ui/ToggleGroup";
import IconButton from "@/app/components/ui/IconButton";
import SettingsModal from "@/app/components/modals/SettingsModal";
import { SessionStatus } from "@/app/types";
import { cn } from "@/app/lib/ui/cn";
import { useUILayout } from "@/app/contexts/UILayoutContext";

type DeviceOption = {
  deviceId: string;
  label: string;
};

interface ToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  codec: string;
  onCodecChange: (newCodec: string) => void;
  voice: string;
  onVoiceChange: (newVoice: string) => void;
  inputDevices: DeviceOption[];
  selectedInputDeviceId: string;
  onInputDeviceChange: (deviceId: string) => void;
  onLogoClick: () => void;
  onLogout: () => void;
}

const TALK_MODE_OPTIONS = [
  {
    value: "auto",
    label: "Auto",
    icon: <SpeakerLoudIcon className="h-4 w-4" />,
  },
  {
    value: "manual",
    label: "Manual",
    icon: <PersonIcon className="h-4 w-4" />,
  },
];

function Toolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
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
  const {
    isEventsOpen,
    setEventsOpen,
    isInspectorOpen,
    setInspectorOpen,
  } = useUILayout();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const talkMode = isPTTActive ? "manual" : "auto";
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  const handleTalkModeChange = React.useCallback(
    (mode: string) => {
      setIsPTTActive(mode === "manual");
    },
    [setIsPTTActive]
  );

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-3 transition hover:opacity-80"
          >
            <Image src="/logo-new.png" alt="Spaces Logo" width={40} height={40} className="rounded" />
            <span className="text-lg font-semibold text-gray-900">Spaces</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-3 md:flex">
              <ToggleGroup
                value={talkMode}
                onChange={handleTalkModeChange}
                options={TALK_MODE_OPTIONS}
                ariaLabel="Speech input mode"
                disabled={!isConnected}
              />
              <TalkButton
                isVisible={talkMode === "manual"}
                isSpeaking={isPTTUserSpeaking}
                onPress={handleTalkButtonDown}
                onRelease={handleTalkButtonUp}
                disabled={!isConnected || isConnecting}
              />
            </div>
            <IconButton
              icon={<GearIcon className="h-4 w-4" />}
              ariaLabel="Open settings"
              variant="ghost"
              onClick={() => setIsSettingsOpen(true)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              value={talkMode}
              onChange={handleTalkModeChange}
              options={TALK_MODE_OPTIONS}
              ariaLabel="Speech input mode"
              disabled={!isConnected}
            />
            <TalkButton
              isVisible={talkMode === "manual"}
              isSpeaking={isPTTUserSpeaking}
              onPress={handleTalkButtonDown}
              onRelease={handleTalkButtonUp}
              disabled={!isConnected || isConnecting}
            />
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        onLogout={onLogout}
        inputDevices={inputDevices}
        selectedInputDeviceId={selectedInputDeviceId}
        onInputDeviceChange={onInputDeviceChange}
        voice={voice}
        onVoiceChange={onVoiceChange}
        codec={codec}
        onCodecChange={onCodecChange}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        isEventsPaneExpanded={isEventsOpen}
        setIsEventsPaneExpanded={setEventsOpen}
        isInspectorPaneExpanded={isInspectorOpen}
        setIsInspectorPaneExpanded={setInspectorOpen}
      />
    </>
  );
}

export default Toolbar;

type TalkButtonProps = {
  isVisible: boolean;
  isSpeaking: boolean;
  disabled: boolean;
  onPress: () => void;
  onRelease: () => void;
};

function TalkButton({ isVisible, isSpeaking, disabled, onPress, onRelease }: TalkButtonProps) {
  if (!isVisible) {
    return null;
  }

  const label = isSpeaking ? "Release to send" : "Hold to talk";
  const classes = cn(
    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    disabled && "cursor-not-allowed opacity-60",
    !disabled && (isSpeaking ? "bg-blue-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700")
  );

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
    >
      <SpeakerLoudIcon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
