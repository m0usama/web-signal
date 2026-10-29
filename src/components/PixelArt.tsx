import { memo } from "react";
import type { Sprite } from "@/lib/pixels";

/** Renders a character-grid sprite as crisp SVG (adjacent pixels are merged into runs). */
export const PixelArt = memo(function PixelArt({
  sprite,
  size,
  className,
  title,
}: {
  sprite: Sprite;
  size: number;
  className?: string;
  title?: string;
}) {
  const h = sprite.grid.length;
  const w = sprite.grid[0]?.length ?? 0;
  const rects: React.ReactElement[] = [];
  sprite.grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === ".") {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === c) run++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={sprite.palette[c]} />);
      x += run;
    }
  });
  return (
    <svg
      className={className}
      width={size}
      height={(size * h) / w}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
});
