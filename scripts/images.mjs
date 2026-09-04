import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const PAPER = { r: 244, g: 240, b: 230, alpha: 1 };
const INK = { r: 20, g: 18, b: 16 };

/* Luminance window used to turn the scanned logo into an alpha mask. Anything
   at or above WHITE is paper (fully transparent); at or below BLACK is ink. */
const WHITE = 242;
const BLACK = 30;

/* Paper grain in the scan sits just under WHITE and would otherwise register
   as faint ink, loosening the trim box. Anything under this alpha is paper. */
const NOISE_FLOOR = 26;

async function emit(outFile, buffer) {
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, buffer);
  return buffer.length;
}

/**
 * The supplied logo is a scan: black brush ink on cream paper, baked in. Left
 * as-is it renders a visible off-colour rectangle on the page. So we drop the
 * paper out to transparency — luminance drives alpha, which keeps every soft
 * brush edge — and repaint the strokes in brand ink. The mark can then sit on
 * any background, and the page's own grain shows through it.
 */
export async function knockOutPaper(source) {
  const { data, info } = await sharp(source)
    .rotate()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const rgba = Buffer.allocUnsafe(pixels * 4);
  const span = WHITE - BLACK;

  for (let i = 0; i < pixels; i += 1) {
    const luma = data[i * info.channels];
    let alpha = ((WHITE - luma) / span) * 255;
    if (alpha < NOISE_FLOOR) alpha = 0;
    else if (alpha > 255) alpha = 255;

    const o = i * 4;
    rgba[o] = INK.r;
    rgba[o + 1] = INK.g;
    rgba[o + 2] = INK.b;
    rgba[o + 3] = alpha;
  }

  // Trim the scan's margin so layout spacing is driven by CSS, not by however
  // much paper happened to be around the mark.
  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 2 })
    .png()
    .toBuffer();
}

/** Ink coverage per row / per column — used to find words and letters. */
async function profiles(pngBuffer) {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows = new Float64Array(info.height);
  const cols = new Float64Array(info.width);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      rows[y] += alpha;
      cols[x] += alpha;
    }
  }
  return { rows, cols, width: info.width, height: info.height };
}

/** Contiguous runs where coverage clears a fraction of the profile's peak. */
function runs(profile, floor = 0.02) {
  const peak = Math.max(...profile);
  const cut = peak * floor;
  const found = [];
  let start = -1;

  for (let i = 0; i < profile.length; i += 1) {
    if (profile[i] > cut) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      found.push({ start, end: i, size: i - start });
      start = -1;
    }
  }
  if (start !== -1) found.push({ start, end: profile.length, size: profile.length - start });
  return found;
}

/**
 * Isolate the first letter of the top word — the brush "S". Done by reading
 * the ink profile rather than by hardcoded ratios, so a redrawn or vectorised
 * logo still crops correctly.
 */
export async function cropInitial(logoPng) {
  const { rows } = await profiles(logoPng);
  const words = runs(rows, 0.02);
  const topWord = words[0];
  if (!topWord) return logoPng;

  const band = await sharp(logoPng)
    .extract({
      left: 0,
      top: topWord.start,
      width: (await sharp(logoPng).metadata()).width,
      height: topWord.size,
    })
    .png()
    .toBuffer();

  const { cols } = await profiles(band);
  const letters = runs(cols, 0.02);
  const first = letters[0];
  if (!first) return band;

  const glyph = await sharp(band)
    .extract({ left: first.start, top: 0, width: first.size, height: topWord.size })
    .png()
    .toBuffer();

  // Centre the glyph on a square of paper with a little breathing room.
  const side = Math.round(Math.max(first.size, topWord.size) * 1.34);
  return sharp({
    create: { width: side, height: side, channels: 4, background: PAPER },
  })
    .composite([{ input: glyph, gravity: "centre" }])
    .png()
    .toBuffer();
}

/** Hero logo: WebP for the bytes, PNG for the fallback. Both keep alpha. */
export async function buildLogo({ logoPng, outDir }) {
  const { width = 1400, height = 1400 } = await sharp(logoPng).metadata();
  const targetWidth = Math.min(width, 1400);
  const targetHeight = Math.round((targetWidth / width) * height);

  const resized = () => sharp(logoPng).resize({ width: targetWidth });

  await emit(
    path.join(outDir, "img/logo.png"),
    await resized().png({ compressionLevel: 9 }).toBuffer(),
  );
  await emit(
    path.join(outDir, "img/logo.webp"),
    await resized().webp({ quality: 92, alphaQuality: 100 }).toBuffer(),
  );

  return {
    png: "/img/logo.png",
    webp: "/img/logo.webp",
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * The link preview card. Most people meet this company through a pasted link,
 * so the card gets the same treatment as the page: the mark, on paper.
 */
export async function buildOgImage({ logoPng, outDir }) {
  const W = 1200;
  const H = 630;

  const mark = await sharp(logoPng)
    .resize({
      width: Math.round(W * 0.5),
      height: Math.round(H * 0.5),
      fit: "inside",
    })
    .toBuffer();

  await emit(
    path.join(outDir, "img/og.png"),
    await sharp({ create: { width: W, height: H, channels: 4, background: PAPER } })
      .composite([{ input: mark, gravity: "centre" }])
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

  return { url: "/img/og.png", width: W, height: H };
}

/** Favicons, all cut from the brush "S". */
export async function buildFavicons({ logoPng, outDir, override }) {
  const square = override
    ? await sharp(override).flatten({ background: PAPER }).png().toBuffer()
    : await cropInitial(logoPng);

  for (const [name, size] of [
    ["favicon-16.png", 16],
    ["favicon-32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ]) {
    await emit(
      path.join(outDir, name),
      await sharp(square)
        .resize(size, size, { fit: "cover" })
        .flatten({ background: PAPER })
        .png({ compressionLevel: 9 })
        .toBuffer(),
    );
  }
}

/**
 * Artist photos: two widths, WebP + JPEG, so the roster stays sharp on a phone
 * without shipping a print-resolution file to it.
 */
export async function buildArtistPhoto({ source, slug, outDir }) {
  const { width: sourceWidth = 1600, height: sourceHeight = 1600 } =
    await sharp(source).metadata();

  const widths = [800, 1600].filter((w) => w <= sourceWidth);
  if (widths.length === 0) widths.push(sourceWidth);

  const made = [];
  for (const width of widths) {
    const resized = () => sharp(source).rotate().resize({ width });
    const webp = `img/artists/${slug}-${width}.webp`;
    const jpg = `img/artists/${slug}-${width}.jpg`;
    await emit(path.join(outDir, webp), await resized().webp({ quality: 82 }).toBuffer());
    await emit(
      path.join(outDir, jpg),
      await resized().jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    );
    made.push({ width, webp: `/${webp}`, jpg: `/${jpg}` });
  }

  const largest = made[made.length - 1];
  return {
    src: largest.jpg,
    webpSrcset: made.map((m) => `${m.webp} ${m.width}w`).join(", "),
    jpgSrcset: made.map((m) => `${m.jpg} ${m.width}w`).join(", "),
    width: largest.width,
    height: Math.round((largest.width / sourceWidth) * sourceHeight),
  };
}
