#!/usr/bin/env node
/**
 * Generates 20 .cube LUT files:
 * - 10 for DJI D-Log M footage (dji/)
 * - 10 for iPhone footage (iphone/)
 *
 * Run with: node scripts/generate-luts.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dir, '../public/luts');
const N = 17; // 17×17×17 LUT — good quality, ~290KB per file

// ─── Color Math ──────────────────────────────────────────────────────────────

function clamp(v) { return Math.max(0, Math.min(1, v)); }

/** Hermite spline interpolation between two points */
function hermite(t, p0, p1, m0, m1) {
  const t2 = t * t, t3 = t2 * t;
  return (2*t3 - 3*t2 + 1)*p0 + (t3 - 2*t2 + t)*m0 +
         (-2*t3 + 3*t2)*p1 + (t3 - t2)*m1;
}

/**
 * D-Log M tone curve: maps encoded log values to scene-linear-like display values.
 * Calibrated to DJI reference points:
 *   black point ≈ 0.117, 18% grey ≈ 0.45 → output 0.42, highlights 0.96 → 1.0
 */
function dlogmToneCurve(v) {
  if (v <= 0.117) return 0;
  if (v >= 0.960) return 1;
  const t = (v - 0.117) / (0.960 - 0.117);
  // Two-segment hermite — lower (toe-mid) and upper (mid-shoulder)
  if (t < 0.40) {
    return hermite(t / 0.40, 0, 0.42, 0, 1.0);
  }
  return hermite((t - 0.40) / 0.60, 0.42, 1.0, 1.0, 0.40);
}

/**
 * CDL-style transform: (v * slope + offset) ^ (1/power)
 * Standard industry color correction model.
 */
function cdl(v, slope = 1, offset = 0, power = 1) {
  v = clamp(v * slope + offset);
  if (power !== 1 && v > 0) v = Math.pow(v, 1.0 / power);
  return clamp(v);
}

/** Adjust saturation using Rec.709 luma coefficients */
function satAdjust(r, g, b, sat) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [clamp(luma + sat * (r - luma)),
          clamp(luma + sat * (g - luma)),
          clamp(luma + sat * (b - luma))];
}

/**
 * Apply a look object { global, channels, saturation }
 * channels = { r, g, b } each with { slope, offset, power }
 * global   = { slope, offset, power }
 */
function applyLook(r, g, b, look) {
  const ch = look.channels ?? {};
  r = cdl(r, ch.r?.slope, ch.r?.offset, ch.r?.power);
  g = cdl(g, ch.g?.slope, ch.g?.offset, ch.g?.power);
  b = cdl(b, ch.b?.slope, ch.b?.offset, ch.b?.power);

  if (look.global) {
    const { slope, offset, power } = look.global;
    r = cdl(r, slope, offset, power);
    g = cdl(g, slope, offset, power);
    b = cdl(b, slope, offset, power);
  }

  if (look.saturation != null && look.saturation !== 1) {
    [r, g, b] = satAdjust(r, g, b, look.saturation);
  }
  return [r, g, b];
}

/** Generate a .cube file string from a transform function */
function buildCube(title, transformFn) {
  const lines = [
    `TITLE "${title}"`,
    `LUT_3D_SIZE ${N}`,
    `DOMAIN_MIN 0.0 0.0 0.0`,
    `DOMAIN_MAX 1.0 1.0 1.0`,
    '',
  ];
  for (let bi = 0; bi < N; bi++) {
    for (let gi = 0; gi < N; gi++) {
      for (let ri = 0; ri < N; ri++) {
        const r = ri / (N - 1), g = gi / (N - 1), b = bi / (N - 1);
        const [or, og, ob] = transformFn(r, g, b);
        lines.push(`${or.toFixed(6)} ${og.toFixed(6)} ${ob.toFixed(6)}`);
      }
    }
  }
  return lines.join('\n');
}

// ─── DJI D-Log M LUT Definitions ─────────────────────────────────────────────

const DJI = [
  {
    filename: 'lk-dji-neutral.cube',
    title: 'LK DJI Neutral',
    look: {},  // pure D-Log M decode, no grade
  },
  {
    filename: 'lk-dji-warm-film.cube',
    title: 'LK DJI Warm Film',
    look: {
      global: { slope: 0.97, offset: 0.015, power: 1.05 },
      channels: {
        r: { slope: 1.04, offset: 0.006, power: 1.02 },
        g: { slope: 0.99, offset: 0.004, power: 1.0 },
        b: { slope: 0.90, offset: -0.008, power: 0.97 },
      },
      saturation: 0.92,
    },
  },
  {
    filename: 'lk-dji-teal-orange.cube',
    title: 'LK DJI Teal & Orange',
    look: {
      global: { slope: 0.98, offset: -0.007, power: 1.0 },
      channels: {
        r: { slope: 1.06, offset: 0.005, power: 0.99 },
        g: { slope: 0.97, offset: 0.0,   power: 0.99 },
        b: { slope: 0.97, offset: 0.018, power: 1.02 },
      },
      saturation: 1.09,
    },
  },
  {
    filename: 'lk-dji-golden-hour.cube',
    title: 'LK DJI Golden Hour',
    look: {
      global: { slope: 0.96, offset: -0.012, power: 1.03 },
      channels: {
        r: { slope: 1.11, offset: 0.009, power: 1.02 },
        g: { slope: 1.0,  offset: 0.002, power: 1.01 },
        b: { slope: 0.84, offset: -0.012, power: 0.95 },
      },
      saturation: 1.06,
    },
  },
  {
    filename: 'lk-dji-moody-dark.cube',
    title: 'LK DJI Moody Dark',
    look: {
      global: { slope: 0.95, offset: -0.034, power: 0.96 },
      channels: {
        r: { slope: 0.97, offset: 0.0,   power: 0.99 },
        g: { slope: 0.97, offset: 0.0,   power: 0.99 },
        b: { slope: 1.05, offset: 0.012, power: 1.01 },
      },
      saturation: 0.87,
    },
  },
  {
    filename: 'lk-dji-pastel.cube',
    title: 'LK DJI Pastel',
    look: {
      global: { slope: 0.87, offset: 0.055, power: 1.08 },
      channels: {
        r: { slope: 1.01, offset: 0.005, power: 1.0 },
        g: { slope: 0.99, offset: 0.006, power: 1.0 },
        b: { slope: 1.01, offset: 0.010, power: 1.0 },
      },
      saturation: 0.72,
    },
  },
  {
    filename: 'lk-dji-fuji.cube',
    title: 'LK DJI Fuji',
    look: {
      global: { slope: 0.97, offset: 0.010, power: 1.02 },
      channels: {
        r: { slope: 0.97, offset: 0.004, power: 1.0  },
        g: { slope: 1.02, offset: 0.008, power: 1.01 },
        b: { slope: 1.04, offset: 0.010, power: 1.01 },
      },
      saturation: 0.96,
    },
  },
  {
    filename: 'lk-dji-kodak.cube',
    title: 'LK DJI Kodak',
    look: {
      global: { slope: 0.97, offset: 0.008, power: 1.03 },
      channels: {
        r: { slope: 1.07, offset: 0.008, power: 1.02 },
        g: { slope: 0.99, offset: 0.002, power: 1.0  },
        b: { slope: 0.90, offset: -0.010, power: 0.97 },
      },
      saturation: 0.93,
    },
  },
  {
    filename: 'lk-dji-street.cube',
    title: 'LK DJI Street',
    look: {
      global: { slope: 1.03, offset: -0.044, power: 0.93 },
      channels: {
        r: { slope: 1.0,  offset: 0.0, power: 0.99 },
        g: { slope: 0.99, offset: 0.0, power: 0.99 },
        b: { slope: 1.01, offset: 0.0, power: 1.0  },
      },
      saturation: 0.84,
    },
  },
  {
    filename: 'lk-dji-sunset.cube',
    title: 'LK DJI Sunset',
    look: {
      global: { slope: 0.97, offset: -0.014, power: 1.0 },
      channels: {
        r: { slope: 1.10, offset: 0.010, power: 1.03 },
        g: { slope: 0.95, offset: 0.0,   power: 0.99 },
        b: { slope: 0.90, offset: 0.018, power: 0.97 },
      },
      saturation: 1.08,
    },
  },
];

// ─── iPhone LUT Definitions ───────────────────────────────────────────────────

const IPHONE = [
  {
    filename: 'lk-iphone-natural.cube',
    title: 'LK iPhone Natural',
    look: {
      channels: {
        r: { slope: 1.02, offset: 0.003, power: 1.01 },
        g: { slope: 1.0,  offset: 0.0,   power: 1.0  },
        b: { slope: 0.96, offset: -0.005, power: 0.99 },
      },
      saturation: 1.0,
    },
  },
  {
    filename: 'lk-iphone-warm-film.cube',
    title: 'LK iPhone Warm Film',
    look: {
      global: { slope: 0.97, offset: 0.016, power: 1.04 },
      channels: {
        r: { slope: 1.04, offset: 0.005, power: 1.02 },
        g: { slope: 0.99, offset: 0.004, power: 1.0  },
        b: { slope: 0.90, offset: -0.006, power: 0.97 },
      },
      saturation: 0.90,
    },
  },
  {
    filename: 'lk-iphone-cinema.cube',
    title: 'LK iPhone Cinema',
    look: {
      global: { slope: 0.90, offset: 0.038, power: 0.98 },
      channels: {
        r: { slope: 1.01, offset: 0.003, power: 1.0 },
        g: { slope: 1.0,  offset: 0.003, power: 1.0 },
        b: { slope: 1.01, offset: 0.005, power: 1.0 },
      },
      saturation: 0.78,
    },
  },
  {
    filename: 'lk-iphone-golden.cube',
    title: 'LK iPhone Golden',
    look: {
      global: { slope: 0.97, offset: 0.008, power: 1.05 },
      channels: {
        r: { slope: 1.08, offset: 0.008, power: 1.02 },
        g: { slope: 1.0,  offset: 0.002, power: 1.01 },
        b: { slope: 0.88, offset: -0.010, power: 0.96 },
      },
      saturation: 1.05,
    },
  },
  {
    filename: 'lk-iphone-moody.cube',
    title: 'LK iPhone Moody',
    look: {
      global: { slope: 0.94, offset: -0.026, power: 0.95 },
      channels: {
        r: { slope: 0.97, offset: 0.0,   power: 0.99 },
        g: { slope: 0.97, offset: 0.0,   power: 0.99 },
        b: { slope: 1.05, offset: 0.010, power: 1.01 },
      },
      saturation: 0.87,
    },
  },
  {
    filename: 'lk-iphone-travel.cube',
    title: 'LK iPhone Travel',
    look: {
      global: { slope: 1.02, offset: 0.007, power: 1.08 },
      channels: {
        r: { slope: 1.03, offset: 0.003, power: 1.01 },
        g: { slope: 1.02, offset: 0.003, power: 1.01 },
        b: { slope: 1.04, offset: 0.003, power: 1.02 },
      },
      saturation: 1.14,
    },
  },
  {
    filename: 'lk-iphone-cool.cube',
    title: 'LK iPhone Cool',
    look: {
      global: { slope: 0.97, offset: -0.008, power: 0.98 },
      channels: {
        r: { slope: 0.97, offset: 0.0,   power: 0.99 },
        g: { slope: 0.98, offset: 0.0,   power: 0.99 },
        b: { slope: 1.06, offset: 0.018, power: 1.02 },
      },
      saturation: 0.80,
    },
  },
  {
    filename: 'lk-iphone-vintage.cube',
    title: 'LK iPhone Vintage',
    look: {
      global: { slope: 0.88, offset: 0.046, power: 1.03 },
      channels: {
        r: { slope: 1.02, offset: 0.008, power: 1.01 },
        g: { slope: 1.02, offset: 0.010, power: 1.01 },
        b: { slope: 0.93, offset: 0.005, power: 0.99 },
      },
      saturation: 0.76,
    },
  },
  {
    filename: 'lk-iphone-portrait.cube',
    title: 'LK iPhone Portrait',
    look: {
      global: { slope: 0.98, offset: 0.009, power: 1.06 },
      channels: {
        r: { slope: 1.03, offset: 0.005, power: 1.02 },
        g: { slope: 1.0,  offset: 0.003, power: 1.0  },
        b: { slope: 0.96, offset: -0.003, power: 0.99 },
      },
      saturation: 0.95,
    },
  },
  {
    filename: 'lk-iphone-night.cube',
    title: 'LK iPhone Night',
    look: {
      global: { slope: 0.98, offset: -0.016, power: 1.10 },
      channels: {
        r: { slope: 1.04, offset: 0.003, power: 1.02 },
        g: { slope: 1.0,  offset: 0.0,   power: 1.01 },
        b: { slope: 1.05, offset: 0.005, power: 1.02 },
      },
      saturation: 1.12,
    },
  },
];

// ─── Build & Write ────────────────────────────────────────────────────────────

['dji', 'iphone'].forEach(sub => {
  const dir = join(BASE, sub);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

let count = 0;

for (const lut of DJI) {
  const transform = (r, g, b) => {
    // 1. D-Log M tone curve (per channel, grey axis treated equally)
    const rg = dlogmToneCurve(r);
    const gg = dlogmToneCurve(g);
    const bg = dlogmToneCurve(b);
    // 2. Apply creative grade
    return applyLook(rg, gg, bg, lut.look);
  };
  const cube = buildCube(lut.title, transform);
  const path = join(BASE, 'dji', lut.filename);
  writeFileSync(path, cube, 'utf8');
  console.log(`✓ ${path.split('/').slice(-2).join('/')}`);
  count++;
}

for (const lut of IPHONE) {
  const transform = (r, g, b) => {
    // iPhone footage is already Rec.709 — apply grade directly
    return applyLook(r, g, b, lut.look);
  };
  const cube = buildCube(lut.title, transform);
  const path = join(BASE, 'iphone', lut.filename);
  writeFileSync(path, cube, 'utf8');
  console.log(`✓ ${path.split('/').slice(-2).join('/')}`);
  count++;
}

console.log(`\n${count} LUT files written to public/luts/`);
