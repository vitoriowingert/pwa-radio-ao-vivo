import Image from "next/image";

import RadioPlayer from "@/components/RadioPlayer";

export default function Home() {
  const streamUrl =
    process.env.NEXT_PUBLIC_RADIO_STREAM_URL ??
    process.env.RADIO_STREAM_URL;

  const logoUrl = process.env.NEXT_PUBLIC_RADIO_LOGO_URL ?? "";

  return (
    <div className="min-h-[calc(100vh-0px)] flex flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        {logoUrl ? (
          <div className="relative w-full aspect-square max-h-72">
            <Image
              src={logoUrl}
              alt="Exercito de Maria logo"
              fill
              sizes="(max-width: 640px) 100vw, 384px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div
            className="relative w-full aspect-square max-h-72 rounded-none bg-zinc-900/60 border border-zinc-800/60"
            aria-hidden="true"
          />
        )}
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Exercito de Maria
        </h1>
        <p className="mt-2 text-sm text-zinc-400">Rádio Web ao vivo</p>
      </div>

      <RadioPlayer streamUrl={streamUrl} logoUrl={logoUrl} />
    </div>
  );
}
