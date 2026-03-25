"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlayerButton from "./PlayerButton";
import StatusIndicator, { type PlayerStatus } from "./StatusIndicator";
import VolumeControl from "./VolumeControl";

type RadioPlayerProps = {
  streamUrl?: string;
  logoUrl?: string;
};

const RETRY_DELAY_MIN_MS = 3000;
const RETRY_DELAY_MAX_MS = 5000;
const WAITING_TIMEOUT_MS = 15000;
const STALL_TIMEOUT_MS = 15000;
const AUTO_ERROR_AFTER_FAILURES = 2; // quantas falhas consecutivas antes de mostrar "Erro"

type AttemptMode = "autoplay" | "user" | "retry";

type AttemptOptions = {
  reload?: boolean;
  silentOnFail?: boolean;
};

export default function RadioPlayer({ streamUrl, logoUrl }: RadioPlayerProps) {
  const STREAM_URL = streamUrl?.trim() ?? "";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const [status, setStatus] = useState<PlayerStatus>(STREAM_URL ? "idle" : "error");
  const statusRef = useRef<PlayerStatus>("idle");

  const shouldPlayRef = useRef<boolean>(true);
  const retryTimeoutRef = useRef<number | null>(null);
  const monitorIntervalRef = useRef<number | null>(null);

  const waitingSinceRef = useRef<number | null>(null);
  const lastProgressAtRef = useRef<number>(0);
  const lastKnownCurrentTimeRef = useRef<number>(0);

  const autoplayFailureCountRef = useRef<number>(0);
  const playAttemptIdRef = useRef<number>(0);
  const recoverFailureCountRef = useRef<number>(0);

  const attemptPlayRef = useRef<
    (mode: AttemptMode, options?: AttemptOptions) => Promise<void>
  >(async () => {});

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [volume, setVolume] = useState(0.8); // 0..1
  const [isMuted, setIsMuted] = useState(false);
  const lastNonZeroVolumeRef = useRef<number>(0.8);

  const persistVolume = useCallback((value: number) => {
    try {
      localStorage.setItem("radio:volume", String(value));
    } catch {
      // ignore
    }
  }, []);

  const persistMuted = useCallback((value: boolean) => {
    try {
      localStorage.setItem("radio:muted", String(value));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const persistShouldPlay = useCallback((value: boolean) => {
    try {
      localStorage.setItem("radio:shouldPlay", String(value));
    } catch {
      // ignore
    }
  }, []);

  const setStatusSafe = useCallback((next: PlayerStatus) => {
    setStatus(next);
  }, []);

  const computeRetryDelayMs = useCallback(() => {
    const range = RETRY_DELAY_MAX_MS - RETRY_DELAY_MIN_MS;
    return RETRY_DELAY_MIN_MS + Math.floor(Math.random() * range);
  }, []);

  const scheduleRetry = useCallback(
    (opts: { reason: string; showError: boolean; reload: boolean }) => {
      if (!shouldPlayRef.current) return;
      if (retryTimeoutRef.current != null) {
        if (opts.showError) setStatusSafe("error");
        else setStatusSafe("loading");
        return;
      }

      if (opts.showError) setStatusSafe("error");
      else setStatusSafe("loading");

      const delayMs = computeRetryDelayMs();
      retryTimeoutRef.current = window.setTimeout(() => {
        retryTimeoutRef.current = null;
        if (!shouldPlayRef.current) return;

        void attemptPlayRef.current("retry", { reload: opts.reload });
      }, delayMs);
    },
    [computeRetryDelayMs, setStatusSafe]
  );

  const attemptPlay = useCallback(
    async (mode: AttemptMode, options?: AttemptOptions) => {
      if (!STREAM_URL) {
        setStatusSafe("error");
        return;
      }

      const audio = audioRef.current;
      if (!audio) return;
      if (!shouldPlayRef.current && mode !== "autoplay") return;

      if (retryTimeoutRef.current != null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      playAttemptIdRef.current += 1;
      const attemptId = playAttemptIdRef.current;

      waitingSinceRef.current = null;
      lastProgressAtRef.current = Date.now();

      // Loading state: on play attempt we show the connection progress
      setStatusSafe("loading");

      if (audio.currentSrc !== STREAM_URL) {
        audio.src = STREAM_URL;
      }

      if (options?.reload) {
        try {
          audio.load();
        } catch {
          // ignore
        }
      }

      try {
        const maybePromise = audio.play();
        await maybePromise;

        if (attemptId !== playAttemptIdRef.current) return;

        autoplayFailureCountRef.current = 0;
        setStatusSafe("playing");
      } catch {
        if (attemptId !== playAttemptIdRef.current) return;

        const silentOnFail = mode === "autoplay" && options?.silentOnFail;
        if (silentOnFail) {
          const isFirstFailure = autoplayFailureCountRef.current === 0;
          autoplayFailureCountRef.current += 1;

          if (isFirstFailure) {
            // Em autoplay, o navegador pode rejeitar o play sem emitir eventos.
            // Não queremos "sumir" com a UI: mantemos o estado visual de conexão
            // até a próxima tentativa automática.
            setStatusSafe("loading");
          } else {
            setStatusSafe("error");
          }

          scheduleRetry({
            reason: "autoplay",
            showError: !isFirstFailure,
            // Quando o autoplay falha "silenciosamente", forçamos reload no retry
            // para reduzir o tempo até a conexão efetiva do stream.
            reload: true,
          });
          return;
        }

        recoverFailureCountRef.current += 1;
        const showError =
          recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
        setStatusSafe(showError ? "error" : "loading");
        scheduleRetry({
          reason: mode,
          showError,
          reload: options?.reload ?? true,
        });
      }
    },
    [STREAM_URL, scheduleRetry, setStatusSafe]
  );

  useEffect(() => {
    attemptPlayRef.current = attemptPlay;
  }, [attemptPlay]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPrefersReducedMotion(mql.matches);
    apply();

    // Safari fallback
    try {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    } catch {
      // Older Safari uses addListener/removeListener
      type MediaQueryListWithListener = MediaQueryList & {
        addListener: (listener: () => void) => void;
        removeListener: (listener: () => void) => void;
      };

      const legacyMql = mql as unknown as MediaQueryListWithListener;
      legacyMql.addListener(apply);
      return () => {
        legacyMql.removeListener(apply);
      };
    }
  }, []);

  const handlePause = useCallback(() => {
    shouldPlayRef.current = false;
    persistShouldPlay(false);

    if (retryTimeoutRef.current != null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
      } catch {
        // ignore
      }
    }

    setStatusSafe("idle");
  }, [persistShouldPlay, setStatusSafe]);

  const handlePlay = useCallback(() => {
    shouldPlayRef.current = true;
    persistShouldPlay(true);

    autoplayFailureCountRef.current = 0;
    void attemptPlay("user", { reload: true, silentOnFail: false });
  }, [attemptPlay, persistShouldPlay]);

  const handleRetry = useCallback(() => {
    shouldPlayRef.current = true;
    persistShouldPlay(true);

    void attemptPlay("user", { reload: true, silentOnFail: false });
  }, [attemptPlay, persistShouldPlay]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prevMuted) => {
      if (prevMuted) {
        const nextVol = volume > 0 ? volume : lastNonZeroVolumeRef.current;
        const finalVol = nextVol > 0 ? nextVol : 0.8;
        setVolume(finalVol);
        persistVolume(finalVol);
        persistMuted(false);
        return false;
      }

      persistMuted(true);
      return true;
    });
  }, [persistMuted, persistVolume, volume]);

  const handleSetVolume = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next));
      if (clamped > 0) lastNonZeroVolumeRef.current = clamped;

      setVolume(clamped);
      persistVolume(clamped);

      if (clamped === 0) {
        setIsMuted(true);
        persistMuted(true);
      } else {
        setIsMuted(false);
        persistMuted(false);
      }
    },
    [persistMuted, persistVolume]
  );

  useEffect(() => {
    let cancelled = false;

    // Restore persisted preferences
    try {
      // Este app deve tocar automaticamente na primeira carga.
      // Ignoramos a preferência persistida de "pausar" para o reload.
      shouldPlayRef.current = true;
      localStorage.setItem("radio:shouldPlay", "true");

      const rawVolume = localStorage.getItem("radio:volume");
      const nextVolume =
        rawVolume !== null && !Number.isNaN(Number(rawVolume))
          ? Math.min(1, Math.max(0, Number(rawVolume)))
          : 0.8;

      lastNonZeroVolumeRef.current = nextVolume > 0 ? nextVolume : 0.8;

      const rawMuted = localStorage.getItem("radio:muted");
      const nextMuted =
        rawMuted !== null ? rawMuted === "true" : nextVolume <= 0;

      const apply = () => {
        if (cancelled) return;
        setVolume(nextVolume);
        setIsMuted(nextMuted);
      };

      if (typeof queueMicrotask === "function") queueMicrotask(apply);
      else void Promise.resolve().then(apply);
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!STREAM_URL) {
      let cancelled = false;
      const apply = () => {
        if (cancelled) return;
        setStatusSafe("error");
        setAudioReady(false);
      };

      if (typeof queueMicrotask === "function") queueMicrotask(apply);
      else void Promise.resolve().then(apply);

      audioRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    // Register SW for PWA "install" support
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const audio = new Audio(STREAM_URL);
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    const applyAudioReady = () => setAudioReady(true);
    if (typeof queueMicrotask === "function") queueMicrotask(applyAudioReady);
    else void Promise.resolve().then(applyAudioReady);

    // Preload once to reduce "time to first audio" on some browsers.
    // Only do this when the user preference allows playing.
    try {
      audio.load();
    } catch {
      // ignore
    }

    const onPlaying = () => {
      if (!shouldPlayRef.current) return;
      waitingSinceRef.current = null;
      lastProgressAtRef.current = Date.now();
      autoplayFailureCountRef.current = 0;
      recoverFailureCountRef.current = 0;
      setStatusSafe("playing");
    };

    const onWaiting = () => {
      if (!shouldPlayRef.current) return;
      waitingSinceRef.current = Date.now();
      if (statusRef.current !== "error") {
        setStatusSafe("loading");
      }
    };

    const onStalled = () => {
      if (!shouldPlayRef.current) return;
      recoverFailureCountRef.current += 1;
      const showError = recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
      setStatusSafe(showError ? "error" : "loading");
      scheduleRetry({
        reason: "stalled",
        showError,
        reload: true,
      });
    };

    const onError = () => {
      if (!shouldPlayRef.current) return;
      recoverFailureCountRef.current += 1;
      const showError = recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
      setStatusSafe(showError ? "error" : "loading");
      scheduleRetry({
        reason: "error",
        showError,
        reload: true,
      });
    };

    const onEnded = () => {
      if (!shouldPlayRef.current) return;
      recoverFailureCountRef.current += 1;
      const showError = recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
      setStatusSafe(showError ? "error" : "loading");
      scheduleRetry({
        reason: "ended",
        showError,
        reload: true,
      });
    };

    const onTimeUpdate = () => {
      lastProgressAtRef.current = Date.now();
      if (waitingSinceRef.current != null) waitingSinceRef.current = null;
    };

    const onProgress = () => {
      // Quando o navegador está baixando dados do stream (mesmo sem "playing" ainda),
      // o evento `progress` ajuda a evitar timeouts/falsos "error".
      lastProgressAtRef.current = Date.now();
      if (waitingSinceRef.current != null) waitingSinceRef.current = null;
      if (statusRef.current === "error") setStatusSafe("loading");
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("progress", onProgress);

    // Autoplay on load (silent failure)
    const runAutoplay = () => {
      void attemptPlay("autoplay", { reload: true, silentOnFail: true });
    };
    if (typeof queueMicrotask === "function") queueMicrotask(runAutoplay);
    else void Promise.resolve().then(runAutoplay);

    return () => {
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("progress", onProgress);
      audioRef.current = null;
      setAudioReady(false);

      if (retryTimeoutRef.current != null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (monitorIntervalRef.current != null) {
        window.clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [STREAM_URL, attemptPlay, scheduleRetry, setStatusSafe]);

  useEffect(() => {
    if (!audioReady) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = isMuted || volume === 0;
  }, [audioReady, volume, isMuted]);

  useEffect(() => {
    if (!audioReady) return;
    persistVolume(volume);
    persistMuted(isMuted);
  }, [audioReady, isMuted, persistMuted, persistVolume, volume]);

  useEffect(() => {
    // minimização removida: nada a persistir aqui
  }, []);

  useEffect(() => {
    // Stall detector: if "playing" but the stream isn't progressing, reconnect.
    monitorIntervalRef.current = window.setInterval(() => {
      if (!shouldPlayRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      const now = Date.now();
      const currentTime = audio.currentTime;
      const readyState = audio.readyState; // 0..4

      if (waitingSinceRef.current != null) {
        const waitingSince = waitingSinceRef.current;
        // Se o navegador já tem dados atuais, não trate como waiting timeout.
        // HAVE_CURRENT_DATA === 2
        if (readyState >= 2) {
          waitingSinceRef.current = null;
        } else if (Number.isFinite(currentTime)) {
          if (currentTime !== lastKnownCurrentTimeRef.current) {
            lastKnownCurrentTimeRef.current = currentTime;
            lastProgressAtRef.current = now;
            waitingSinceRef.current = null;
          }
        }

        if (waitingSinceRef.current != null && now - waitingSince > WAITING_TIMEOUT_MS) {
          waitingSinceRef.current = null;
          recoverFailureCountRef.current += 1;
          const showError =
            recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
          setStatusSafe(showError ? "error" : "loading");
          scheduleRetry({
            reason: "waiting-timeout",
            showError,
            reload: true,
          });
          return;
        }
      }

      // Se currentTime avança, consideramos que está "vivo" e mantemos o loading/playing.
      if (Number.isFinite(currentTime) && currentTime !== lastKnownCurrentTimeRef.current) {
        lastKnownCurrentTimeRef.current = currentTime;
        lastProgressAtRef.current = now;
        waitingSinceRef.current = null;
        recoverFailureCountRef.current = 0;
        if (statusRef.current !== "playing") setStatusSafe("playing");
        return;
      }

      if (statusRef.current === "playing") {
        const last = lastProgressAtRef.current;
        // Evita falsos stalls: se o readyState já indica buffer atual, não reconecta.
        if (last !== 0 && now - last > STALL_TIMEOUT_MS && readyState < 2) {
          recoverFailureCountRef.current += 1;
          const showError =
            recoverFailureCountRef.current > AUTO_ERROR_AFTER_FAILURES;
          setStatusSafe(showError ? "error" : "loading");
          scheduleRetry({
            reason: "stall-monitor",
            showError,
            reload: true,
          });
        }
      }
    }, 2000);

    return () => {
      if (monitorIntervalRef.current != null) {
        window.clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [scheduleRetry, setStatusSafe]);

  const cardClassName = useMemo(
    () =>
      [
        "w-full rounded-2xl border border-zinc-800/60 bg-zinc-950/80 p-3 backdrop-blur",
      ].join(" "),
    []
  );

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className={cardClassName}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <StatusIndicator
              status={status}
              prefersReducedMotion={prefersReducedMotion}
              variant="mini"
              logoUrl={logoUrl}
            />
          </div>

          <PlayerButton
            status={status}
            onPlay={handlePlay}
            onPause={handlePause}
            onRetry={handleRetry}
            variant="mini"
          />
        </div>

        <div className="mt-2">
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onSetVolume={handleSetVolume}
            onToggleMute={handleToggleMute}
            variant="mini"
          />
        </div>
      </div>
    </div>
  );
}

