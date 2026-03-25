import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import dotenv from "dotenv";

dotenv.config();

const logoUrl = process.env.NEXT_PUBLIC_RADIO_LOGO_URL?.trim();
if (!logoUrl) {
  throw new Error("Missing NEXT_PUBLIC_RADIO_LOGO_URL in environment.");
}

const iconsDir = path.join(process.cwd(), "public", "icons");

async function ensureDir() {
  await fs.mkdir(iconsDir, { recursive: true });
}

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch logo image. status=${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildIcon({ size, outFile, buffer }) {
  // Creates a square icon with black background and centers the logo.
  const background = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const resized = await sharp(buffer)
    .resize(size, size, {
      fit: "contain",
      withoutEnlargement: true,
    })
    .toBuffer();

  await sharp(background).composite([{ input: resized, gravity: "center" }]).png().toFile(outFile);
}

async function main() {
  await ensureDir();

  const buffer = await fetchImageBuffer(logoUrl);

  await buildIcon({
    size: 192,
    outFile: path.join(iconsDir, "icon-192.png"),
    buffer,
  });

  await buildIcon({
    size: 512,
    outFile: path.join(iconsDir, "icon-512.png"),
    buffer,
  });
}

await main();

