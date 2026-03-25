"use client";

import { useCallback, useMemo } from "react";

type Props = {
  volume: number; // 0..1
  isMuted: boolean;
  onSetVolume: (value: number) => void;
  onToggleMute: () => void;
  variant?: "full" | "mini";
};

function SpeakerIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M11 5L6 9H2V15H6L11 19V5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M20 9L17 12L20 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M11 5L6 9H2V15H6L11 19V5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15.54 8.46C16.43 9.35 17 10.66 17 12C17 13.34 16.43 14.65 15.54 15.54"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19.07 4.93C20.84 6.7 22 9.1 22 12C22 14.9 20.84 17.3 19.07 19.07"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function VolumeControl({
  volume,
  isMuted,
  onSetVolume,
  onToggleMute,
  variant = "full",
}: Props) {
  const containerClassName = useMemo(() => {
    if (variant === "mini") {
      return "rounded-2xl bg-zinc-900/60 px-3 py-2";
    }
    return "rounded-2xl bg-zinc-900/50 px-4 py-3";
  }, [variant]);

  const percent = Math.round(volume * 100);

  const handleRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      onSetVolume(next);
    },
    [onSetVolume]
  );

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? "Ativar som" : "Mudo"}
          className="inline-flex items-center justify-center rounded-xl p-2 text-zinc-200 hover:bg-white/5"
        >
          <SpeakerIcon muted={isMuted} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleRangeChange}
            className="w-full accent-emerald-400"
          />

          {variant === "full" ? (
            <span className="shrink-0 text-xs text-zinc-400">{percent}%</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

