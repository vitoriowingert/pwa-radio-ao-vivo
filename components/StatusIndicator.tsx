"use client";

import Image from "next/image";

const RADIO_NAME = "Exercito de Maria";
const RADIO_SUBTITLE = "Rádio Web ao vivo";
const RADIO_FULL_TITLE = "Exercito de Maria Rádio Web";

function RadioLogo({
  logoUrl,
  className,
  alt,
}: {
  logoUrl?: string;
  className: string;
  alt: string;
}) {
  if (!logoUrl) return null;

  return (
    <Image
      src={logoUrl}
      alt={alt}
      className={className}
      width={28}
      height={28}
      priority={false}
    />
  );
}

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

type Props = {
  status: PlayerStatus;
  prefersReducedMotion: boolean;
  variant?: "full" | "mini";
  logoUrl?: string;
};

function Equalizer({
  prefersReducedMotion,
  variant,
}: {
  prefersReducedMotion: boolean;
  variant: "full" | "mini";
}) {
  const bars =
    variant === "mini"
      ? [
          { h: "55%", d: 0 },
          { h: "70%", d: 0.12 },
          { h: "40%", d: 0.24 },
          { h: "65%", d: 0.36 },
          { h: "45%", d: 0.48 },
        ]
      : [
          { h: "60%", d: 0 },
          { h: "90%", d: 0.15 },
          { h: "45%", d: 0.3 },
          { h: "80%", d: 0.45 },
          { h: "55%", d: 0.6 },
        ];

  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {bars.map((bar, i) => (
        <span
          key={i}
          className={[
            "w-1 rounded-sm bg-emerald-400/90",
            prefersReducedMotion ? "" : "radio-equalize",
          ].join(" ")}
          style={{
            height: bar.h,
            animationDuration: "1s",
            animationDelay: `${bar.d}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function StatusIndicator({
  status,
  prefersReducedMotion,
  variant = "full",
  logoUrl,
}: Props) {
  if (status === "idle") {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <RadioLogo
            logoUrl={logoUrl}
            className="h-6 w-6 object-cover shrink-0"
            alt={`${RADIO_NAME} logo`}
          />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight">
              {RADIO_NAME}
            </h1>
            <span className="block truncate text-[11px] text-zinc-400">
              {RADIO_SUBTITLE}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="mx-auto flex max-w-full items-center justify-center gap-3">
          <RadioLogo
            logoUrl={logoUrl}
            className="h-10 w-10 object-cover shrink-0"
            alt={`${RADIO_NAME} logo`}
          />
          <h1 className="text-2xl font-bold tracking-tight">{RADIO_FULL_TITLE}</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          Pronto para transmitir ao vivo
        </p>
      </div>
    );
  }

  if (status === "loading") {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <RadioLogo
            logoUrl={logoUrl}
            className="h-6 w-6 object-cover shrink-0"
            alt={`${RADIO_NAME} logo`}
          />
          <div className="flex h-6 w-6 items-center justify-center shrink-0">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-50"
              role="status"
              aria-label="Conectando..."
            />
          </div>
          <span className="min-w-0 truncate text-xs text-zinc-200">Conectando...</span>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-50"
            role="status"
            aria-label="Conectando..."
          />
        </div>
        <p className="mt-3 text-sm text-zinc-200">Conectando...</p>
      </div>
    );
  }

  if (status === "playing") {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-3 min-w-0">
          <RadioLogo
            logoUrl={logoUrl}
            className="h-6 w-6 object-cover shrink-0"
            alt={`${RADIO_NAME} logo`}
          />
          <span className="text-[11px] font-semibold tracking-[0.22em] text-emerald-300">
            AO VIVO
          </span>
          <Equalizer
            prefersReducedMotion={prefersReducedMotion}
            variant={variant}
          />
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-semibold tracking-[0.2em] text-emerald-300">
            AO VIVO
          </span>
          <Equalizer
            prefersReducedMotion={prefersReducedMotion}
            variant={variant}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">Transmissão ativa</p>
      </div>
    );
  }

  if (variant === "mini") {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <RadioLogo
          logoUrl={logoUrl}
          className="h-6 w-6 object-cover shrink-0"
          alt={`${RADIO_NAME} logo`}
        />
        <div className="inline-flex items-center justify-center rounded-full bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200">
          Erro
        </div>
        <span className="text-xs text-zinc-400">tentando...</span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto inline-flex items-center justify-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
        Erro
      </div>
      <p className="mt-3 text-sm text-zinc-200">
        Erro ao conectar com o stream da Rádio Web
      </p>
      <p className="mt-2 text-xs text-zinc-400">
        Vamos tentar novamente automaticamente.
      </p>
    </div>
  );
}

