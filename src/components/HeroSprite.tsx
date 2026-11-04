"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { H, HEAD_BOX, heroRuns, W, type HeroLook } from "@/lib/hero";

/**
 * Pixel hero from a look. `size` is the height in px (full body) or the
 * width/height of the square head crop when `head` is set. Blinks now and
 * then unless `still`.
 */
export const HeroSprite = memo(function HeroSprite({
  look,
  size = 96,
  head = false,
  still = false,
  title,
  className,
}: {
  look: HeroLook;
  size?: number;
  head?: boolean;
  still?: boolean;
  title?: string;
  className?: string;
}) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (still) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          loop();
        }, 140);
      }, 2200 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(t);
  }, [still]);

  const open = useMemo(() => heroRuns(look), [look]);
  const closed = useMemo(() => heroRuns(look, { blink: true }), [look]);
  const runs = blink ? closed : open;
  const [hx, hy, hs] = HEAD_BOX;
  const viewBox = head ? `${hx} ${hy} ${hs} ${hs}` : `0 0 ${W} ${H}`;

  return (
    <svg
      className={className}
      width={head ? size : Math.round((size * W) / H)}
      height={size}
      viewBox={viewBox}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
});
