"use client";

import type { PlayerStatus } from "./StatusIndicator";

type Props = {
  status: PlayerStatus;
  onPlay: () => void;
  onPause: () => void;
  onRetry: () => void;
  variant?: "full" | "mini";
};

export default function PlayerButton({
  status,
  onPlay,
  onPause,
  onRetry,
  variant = "full",
}: Props) {
  let label = "Ouvir";
  let disabled = false;
  let onClick = onPlay;

  if (status === "loading") {
    label = "Ouvir";
    disabled = true;
  } else if (status === "playing") {
    label = "Pausar";
    onClick = onPause;
  } else if (status === "error") {
    label = "Tentar novamente";
    onClick = onRetry;
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        variant === "mini"
          ? "w-auto whitespace-nowrap rounded-xl px-3 py-2 text-sm"
          : "w-full rounded-xl px-5 py-3",
        "text-center font-semibold transition-colors",
        "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-400",
        "disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:active:bg-indigo-600",
        "cursor-pointer",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

