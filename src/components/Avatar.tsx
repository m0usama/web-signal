"use client";

import { useState } from "react";
import { AVATAR_A, AVATAR_B } from "@/lib/pixels";
import type { AvatarKey } from "@/lib/types";
import { PixelArt } from "./PixelArt";

/**
 * Shows /public/avatars/<key>.png when it exists (your own pixel art),
 * otherwise the built-in placeholder sprite.
 */
export function Avatar({ avatarKey, size, label }: { avatarKey: AvatarKey; size: number; label?: string }) {
  const [custom, setCustom] = useState<"loading" | "ok" | "missing">("loading");
  return (
    <span className="avatar-art" style={{ width: size, height: size * 1.125 }}>
      {custom !== "ok" && (
        <PixelArt sprite={avatarKey === "a" ? AVATAR_A : AVATAR_B} size={size} title={custom === "missing" ? label : undefined} />
      )}
      {custom !== "missing" && (
        <img
          src={`/avatars/${avatarKey}.png`}
          alt={label ?? ""}
          width={size}
          height={size * 1.125}
          className="pixelated"
          style={custom === "ok" ? undefined : { position: "absolute", opacity: 0, pointerEvents: "none" }}
          onLoad={() => setCustom("ok")}
          onError={() => setCustom("missing")}
          draggable={false}
        />
      )}
    </span>
  );
}
