import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Render at 2x then downscale for crisp text
const SCALE = 2;
const OUT_W = 1200;
const OUT_H = 627;
const W = OUT_W * SCALE;
const H = OUT_H * SCALE;
const AVATAR_SIZE = 280 * SCALE;

// Palette aligned with the site (recruiter / dark anthracite)
const BG_COLOR = "#111827"; // ink / gray-900
const ACCENT = "#a8b1ff"; // lavender (accent-soft, readable on dark)
const TEXT_PRIMARY = "#fafafa";
const TEXT_SECONDARY = "#9ca3af"; // muted gray
const TEXT_TERTIARY = "#6b7280";

const NAME = "Jonathan Aerts";
const TITLE = "Senior Cloud Platform Architect";
const SUBTITLE = "Azure Landing Zone · Terraform · GitOps · Platform Engineering";
const URL = "john6810.github.io/Astro/recruiter";

async function generate() {
  const avatarBuffer = readFileSync(resolve(root, "public/images/avatar.jpg"));
  const avatar = await sharp(avatarBuffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}">
      <circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="white"/>
    </svg>`
  );

  const circularAvatar = await sharp(avatar)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const cx = 300 * SCALE;
  const textX = 500 * SCALE;

  const svgOverlay = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- top/bottom accent bands -->
      <rect x="0" y="0" width="${W}" height="${8}" fill="${ACCENT}" />
      <rect x="0" y="${H - 8}" width="${W}" height="${8}" fill="${ACCENT}" />

      <!-- avatar ring -->
      <circle cx="${cx}" cy="${H / 2}" r="${AVATAR_SIZE / 2 + 8}" fill="none" stroke="${ACCENT}" stroke-width="6" />

      <!-- name -->
      <text x="${textX}" y="${240 * SCALE}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${56 * SCALE}" font-weight="800" fill="${TEXT_PRIMARY}" letter-spacing="-1">
        ${NAME}
      </text>

      <!-- title -->
      <text x="${textX}" y="${310 * SCALE}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${28 * SCALE}" font-weight="500" fill="${ACCENT}">
        ${TITLE}
      </text>

      <!-- subtitle -->
      <text x="${textX}" y="${365 * SCALE}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${20 * SCALE}" fill="${TEXT_SECONDARY}">
        ${SUBTITLE}
      </text>

      <!-- url -->
      <text x="${textX}" y="${430 * SCALE}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${20 * SCALE}" fill="${TEXT_TERTIARY}">
        ${URL}
      </text>
    </svg>
  `);

  const avatarX = cx - AVATAR_SIZE / 2;
  const avatarY = Math.round(H / 2 - AVATAR_SIZE / 2);

  const composed = await sharp({
    create: { width: W, height: H, channels: 4, background: BG_COLOR },
  })
    .composite([
      { input: svgOverlay, top: 0, left: 0 },
      { input: circularAvatar, top: avatarY, left: avatarX },
    ])
    .png()
    .toBuffer();

  await sharp(composed)
    .resize(OUT_W, OUT_H, { kernel: "lanczos3" })
    .png()
    .toFile(resolve(root, "public/images/og-preview.png"));

  console.log("Generated: public/images/og-preview.png (1200x627) — 2x supersampled");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
