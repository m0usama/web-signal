import { ICONS } from "@/lib/pixels";
import { PixelArt } from "./PixelArt";

export function Icon({ name, size = 24, title }: { name: string; size?: number; title?: string }) {
  const sprite = ICONS[name];
  if (!sprite) return null;
  return <PixelArt sprite={sprite} size={size} title={title} />;
}
