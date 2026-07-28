function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// Gibt "R G B" (space-getrennt, für CSS-Variablen mit rgb(var(--x) / alpha)) zurück
function toCssTriplet(rgb: [number, number, number]): string {
  return rgb.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(" ");
}

export function generateBrandShades(hex: string): Record<string, string> {
  let rgb: [number, number, number];
  try {
    rgb = hexToRgb(hex);
  } catch {
    rgb = hexToRgb("#2F5FFF");
  }
  const [h, s] = rgbToHsl(rgb);

  return {
    "50": toCssTriplet(hslToRgb([h, Math.min(s, 45), 95])),
    "100": toCssTriplet(hslToRgb([h, Math.min(s, 65), 88])),
    "300": toCssTriplet(hslToRgb([h, s, 75])),
    "500": toCssTriplet(rgb),
    "600": toCssTriplet(hslToRgb([h, s, Math.max(rgbToHsl(rgb)[2] - 10, 15)])),
    "700": toCssTriplet(hslToRgb([h, s, Math.max(rgbToHsl(rgb)[2] - 20, 8)])),
  };
}
