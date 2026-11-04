"use client";

import { useState } from "react";
import { AVATAR_A, AVATAR_B } from "@/lib/pixels";
import type { AvatarKey } from "@/lib/types";
import { PixelArt } from "./PixelArt";
import { HeroSprite } from "./HeroSprite";
import { useAvatarLook } from "@/lib/lookStore";
import { hasLook, normaliseHero } from "@/lib/hero";

/**
 * Round avatar = the head of the person's hero (their saved look, or the
 * default hero for their avatar key). J.A.R.V.I.S keeps its photo
 * (/public/avatars/c.png) until a hero is saved for it.
 */
export function Avatar({ avatarKey, size, label }: { avatarKey: AvatarKey; size: number; label?: string }) {
  const look = useAvatarLook(avatarKey);
  if (hasLook(look) || avatarKey !== "c") {
    return (
      <span className={`avatar-art avatar-${avatarKey} is-hero`} style={{ width: size, height: size }}>
        <HeroSprite look={normaliseHero(look, avatarKey)} size={size} head still={size < 40} title={label} />
      </span>
    );
  }
  return <PhotoAvatar avatarKey={avatarKey} size={size} label={label} />;
}

function PhotoAvatar({ avatarKey, size, label }: { avatarKey: AvatarKey; size: number; label?: string }) {
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
