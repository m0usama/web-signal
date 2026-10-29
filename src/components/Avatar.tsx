"use client";

import { useState } from "react";
import { AVATAR_A, AVATAR_B } from "@/lib/pixels";
import type { AvatarKey } from "@/lib/types";
import { PixelArt } from "./PixelArt";

/**
 * Shows the portrait in /public/avatars/<key>.png
 * (a = SpiderZiya, b = Spidey), falling back to a pixel placeholder.
 */
export function Avatar({ avatarKey, size, label }: { avatarKey: AvatarKey; size: number; label?: string }) {
  const [custom, setCustom] = useState<"loading" | "ok" | "missing">("loading");
  return (
    <span className={`avatar-art avatar-${avatarKey} ${custom === "ok" ? "is-portrait" : ""}`} style={{ width: size, height: size }}>
      {custom !== "ok" && (
        <PixelArt sprite={avatarKey === "a" ? AVATAR_A : AVATAR_B} size={size * 0.89} title={custom === "missing" ? label : undefined} />
      )}
      {custom !== "missing" && (
        <img
          src={`/avatars/${avatarKey}.png`}
          alt={label ?? ""}
          width={size}
          height={size}
          style={custom === "ok" ? undefined : { position: "absolute", opacity: 0, pointerEvents: "none" }}
          onLoad={() => setCustom("ok")}
          onError={() => setCustom("missing")}
          draggable={false}
        />
      )}
    </span>
  );
}
