"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { GRID, spiderRuns, type SpiderLook } from "@/lib/spider";

/** Pixel spider from a look. Blinks now and then unless `still`. */
export const SpiderSprite = memo(function SpiderSprite({
  look,
  size = 96,
  thread = false,
  still = false,
  title,
  className,
}: {
  look: SpiderLook;
  size?: number;
  thread?: boolean;
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

  const open = useMemo(() => spiderRuns(look, { thread }), [look, thread]);
  const closed = useMemo(() => spiderRuns(look, { thread, blink: true }), [look, thread]);
  const runs = blink ? closed : open;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
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
