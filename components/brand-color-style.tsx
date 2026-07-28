import { generateBrandShades } from "@/lib/color-shades";

export function BrandColorStyle({ color }: { color: string }) {
  const shades = generateBrandShades(color);
  const css = `:root{${Object.entries(shades)
    .map(([key, val]) => `--brand-${key}:${val};`)
    .join("")}}`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
