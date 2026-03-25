import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import dotenv from "dotenv";
import pngToIco from "png-to-ico";

dotenv.config();

const logoUrl = process.env.NEXT_PUBLIC_RADIO_LOGO_URL?.trim();
if (!logoUrl) {
  throw new Error("Missing NEXT_PUBLIC_RADIO_LOGO_URL in environment.");
}

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch logo image. status=${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildSquareIconPng({ size, outFile, buffer }) {
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
    .resize(size, size, { fit: "contain", withoutEnlargement: true })
    .toBuffer();

  const composite = await sharp(background)
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(outFile);

  return composite;
}

async function buildFaviconIcoFromPng256({
  outFile,
  buffer,
}) {
  const size = 256;
  const tempPng = path.join(process.cwd(), "public", "favicon-256x256.png");

  await buildSquareIconPng({
    size,
    outFile: tempPng,
    buffer,
  });

  // png-to-ico returns a Buffer containing a multi-size ICO.
  const icoBuffer = await pngToIco(tempPng);
  await fs.writeFile(outFile, icoBuffer);
}

const publicDir = path.join(process.cwd(), "public");
await fs.mkdir(publicDir, { recursive: true });

const logoBuffer = await fetchImageBuffer(logoUrl);

await buildSquareIconPng({
  size: 16,
  outFile: path.join(publicDir, "favicon-16x16.png"),
  buffer: logoBuffer,
});

await buildSquareIconPng({
  size: 32,
  outFile: path.join(publicDir, "favicon-32x32.png"),
  buffer: logoBuffer,
});

await buildFaviconIcoFromPng256({
  outFile: path.join(publicDir, "favicon.ico"),
  buffer: logoBuffer,
});

