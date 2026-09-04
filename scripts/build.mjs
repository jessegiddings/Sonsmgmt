import { cp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildArtistPhoto,
  buildFavicons,
  buildLogo,
  buildOgImage,
  knockOutPaper,
} from "./images.mjs";
import { homePage, pressPage } from "../src/templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const exists = async (p) =>
  access(p, constants.R_OK).then(
    () => true,
    () => false,
  );

const readJson = async (p) => JSON.parse(await readFile(path.join(root, p), "utf8"));

/** The logo may arrive in any format; a vector redraw should win if present. */
async function findLogo() {
  for (const name of ["logo.svg", "logo.png", "logo.jpg", "logo.jpeg", "logo.webp"]) {
    const candidate = path.join(root, "assets", name);
    if (await exists(candidate)) return candidate;
  }
  throw new Error("No logo found. Expected assets/logo.{svg,png,jpg,jpeg,webp}.");
}

async function findPhoto(entry) {
  if (!entry.photo) return null;
  const direct = path.join(root, "assets", entry.photo);
  if (await exists(direct)) return direct;

  const base = path.join(root, "assets", entry.photo.replace(/\.[^.]+$/, ""));
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    if (await exists(base + ext)) return base + ext;
  }
  return null;
}

async function main() {
  const [site, roster] = await Promise.all([readJson("data/site.json"), readJson("data/roster.json")]);

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  // Static passthrough: fonts and anything else dropped into public/.
  if (await exists(path.join(root, "public"))) {
    await cp(path.join(root, "public"), dist, { recursive: true });
  }
  await cp(path.join(root, "src/styles.css"), path.join(dist, "styles.css"));

  // One knockout, reused by the hero, the OG card and the favicons, so every
  // rendition of the mark comes from the same pixels.
  const logoSource = await findLogo();
  const logoPng = await knockOutPaper(logoSource);

  const faviconOverride = (await exists(path.join(root, "assets/favicon-source.png")))
    ? path.join(root, "assets/favicon-source.png")
    : null;

  const [logo, og] = await Promise.all([
    buildLogo({ logoPng, outDir: dist }),
    buildOgImage({ logoPng, outDir: dist }),
    buildFavicons({ logoPng, outDir: dist, override: faviconOverride }),
  ]);

  const warnings = [];
  if (logo.width < 1000) {
    warnings.push(
      `Logo mark is only ${logo.width}px wide after trimming. It will look soft on ` +
        `high-density desktop displays. Drop a larger export (or a vector redraw as ` +
        `assets/logo.svg) into assets/ and rebuild — no code change needed.`,
    );
  }

  const rosterOut = [];
  for (const entry of roster) {
    const source = await findPhoto(entry);
    if (!source) {
      warnings.push(`No photo found for ${entry.name} (expected assets/${entry.photo}).`);
      rosterOut.push({ ...entry, photoAsset: null });
      continue;
    }
    rosterOut.push({
      ...entry,
      photoAsset: await buildArtistPhoto({ source, slug: entry.slug, outDir: dist }),
    });

    const missing = (entry.links || []).filter((l) => !l.url || !l.url.trim());
    if (missing.length) {
      warnings.push(
        `${entry.name}: no URL yet for ${missing.map((l) => l.label).join(", ")} — ` +
          `those links are omitted from the build.`,
      );
    }
  }

  await writeFile(path.join(dist, "index.html"), homePage({ site, roster: rosterOut, logo, og }));
  await mkdir(path.join(dist, "press"), { recursive: true });
  await writeFile(path.join(dist, "press/index.html"), pressPage({ site, og }));

  await writeFile(
    path.join(dist, "site.webmanifest"),
    `${JSON.stringify(
      {
        name: site.name,
        short_name: site.displayName,
        start_url: "/",
        display: "browser",
        background_color: "#f4f0e6",
        theme_color: "#f4f0e6",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    path.join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.domain}/sitemap.xml\n`,
  );

  await writeFile(
    path.join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site.domain}/</loc></url>\n</urlset>\n`,
  );

  console.log(`Built ${site.name} → dist/`);
  console.log(`  logo   ${logo.width}×${logo.height}`);
  console.log(`  og     ${og.width}×${og.height}`);
  console.log(`  roster ${rosterOut.length} artist${rosterOut.length === 1 ? "" : "s"}`);

  if (warnings.length) {
    console.log("\nBefore launch:");
    for (const w of warnings) console.log(`  • ${w}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
