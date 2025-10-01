"use client";

import React from "react";
import Modal from "@/app/components/ui/Modal";
import { SessionStatus } from "@/app/types";
import { cn } from "@/app/lib/ui/cn";

type DeviceOption = {
  deviceId: string;
  label: string;
};

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  onLogout: () => void;
  inputDevices: DeviceOption[];
  selectedInputDeviceId: string;
  onInputDeviceChange: (deviceId: string) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  codec: string;
  onCodecChange: (codec: string) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isInspectorPaneExpanded?: boolean;
  setIsInspectorPaneExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function SettingsModal({
  isOpen,
  onClose,
  sessionStatus,
  onToggleConnection,
  onLogout,
  inputDevices,
  selectedInputDeviceId,
  onInputDeviceChange,
  voice,
  onVoiceChange,
  codec,
  onCodecChange,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isInspectorPaneExpanded,
  setIsInspectorPaneExpanded,
}: SettingsModalProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  const connectionLabel = isConnected ? "Disconnect" : isConnecting ? "Connecting…" : "Connect";
  const connectionClasses = cn(
    "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition",
    isConnected ? "bg-red-600 text-white hover:bg-red-700" : "bg-blue-600 text-white hover:bg-blue-700",
    isConnecting && "cursor-not-allowed opacity-80"
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <Modal.Body>
        <div className="space-y-6">
          <Section title="Audio">
            <Field label="Microphone" htmlFor="settings-mic">
              <select
                id="settings-mic"
                value={selectedInputDeviceId}
                onChange={(event) => onInputDeviceChange(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="default">System default</option>
                {inputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || device.deviceId}
                  </option>
                ))}
              </select>
            </Field>

            <ToggleField
              id="settings-audio-playback"
              label="Audio playback"
              checked={isAudioPlaybackEnabled}
              onChange={(event) => setIsAudioPlaybackEnabled(event.target.checked)}
              disabled={!isConnected}
              caption="Stream agent responses through the browser"
            />
          </Section>

          <Section title="Voice">
            <Field label="Voice" htmlFor="settings-voice">
              <select
                id="settings-voice"
                value={voice}
                onChange={(event) => onVoiceChange(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            </Field>

            <Field label="Codec" htmlFor="settings-codec">
              <select
                id="settings-codec"
                value={codec}
                onChange={(event) => onCodecChange(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="opus">Opus (48 kHz)</option>
                <option value="pcmu">PCMU (8 kHz)</option>
                <option value="pcma">PCMA (8 kHz)</option>
              </select>
            </Field>
          </Section>

          <Section title="Workspace">
            <ToggleField
              id="settings-events"
              label="Logs"
              checked={isEventsPaneExpanded}
              onChange={(event) => setIsEventsPaneExpanded(event.target.checked)}
              caption="Show event log pane"
            />
            <ToggleField
              id="settings-inspector"
              label="Concept inspector"
              checked={!!isInspectorPaneExpanded}
              onChange={(event) => setIsInspectorPaneExpanded?.(event.target.checked)}
              caption="Show mind map inspector"
            />
          </Section>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row">
          <button
            type="button"
            onClick={onToggleConnection}
            disabled={isConnecting}
            className={connectionClasses}
          >
            {connectionLabel}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700" htmlFor={htmlFor}>
      <span className="font-medium text-gray-800">{label}</span>
      {children}
    </label>
  );
}

type ToggleFieldProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  caption?: string;
};

function ToggleField({ id, label, checked, onChange, disabled, caption }: ToggleFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={id} className="flex flex-col text-sm">
        <span className="font-medium text-gray-800">{label}</span>
        {caption ? <span className="text-xs text-gray-500">{caption}</span> : null}
      </label>
    </div>
  );
}
