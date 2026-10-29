import { memo } from "react";
import type { City } from "@/lib/city";

const NIGHT = {
  sky: "#071A3B",
  water: "#0A2350",
  waterLine: "#123A78",
  land: "#0F2E63",
  shore: "#1C4E9A",
  street: "#2A62B8",
  roof: ["#173D7D", "#1E4A92", "#2A3F96", "#3B2F8F"],
  roofEdge: "#4F86E0",
  window: ["#FFB347", "#FFE59A", "#FF65AD", "#9CD9FF"],
  park: "#14504A",
  parkPath: "#2B7A6B",
  pond: "#0B3C6E",
  bridge: "#5C6BA8",
  bridgeRail: "#A75CFF",
  mainland: "#0C2858",
};

const DAY = {
  sky: "#9FD8FF",
  water: "#53B6F0",
  waterLine: "#7FCBF6",
  land: "#D7ECFF",
  shore: "#F8F5FF",
  street: "#FFFFFF",
  roof: ["#A7C7F0", "#8FB3EA", "#B2A7EE", "#C79BE8"],
  roofEdge: "#5A7FC4",
  window: ["#5A7FC4", "#6E8FD0", "#8C7AD8", "#5A7FC4"],
  park: "#7ED6A4",
  parkPath: "#F8F5FF",
  pond: "#53B6F0",
  bridge: "#8091C9",
  bridgeRail: "#6126CF",
  mainland: "#C2E0FF",
};

/** Static city artwork. Re-renders only when switching day/night. */
export const CitySvg = memo(function CitySvg({ city, night }: { city: City; night: boolean }) {
  const c = night ? NIGHT : DAY;
  const W = city.width;
  const H = city.height;

  // Coastline as stacked row rectangles (pixel-stepped look).
  const island = city.rows.map(([y, l, r]) => <rect key={`r${y}`} x={l} y={y} width={r - l} height={16} fill={c.land} />);
  const shore = city.rows.map(([y, l, r]) => (
    <g key={`s${y}`}>
      <rect x={l - 4} y={y} width={4} height={16} fill={c.shore} />
      <rect x={r} y={y} width={4} height={16} fill={c.shore} />
    </g>
  ));

  return (
    <svg
      className="city-svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <defs>
        <pattern id="waves" width="32" height="16" patternUnits="userSpaceOnUse">
          <rect width="32" height="16" fill={c.water} />
          <rect x="4" y="6" width="8" height="2" fill={c.waterLine} />
          <rect x="20" y="13" width="6" height="2" fill={c.waterLine} />
        </pattern>
        <pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect x="2" y="2" width="2" height="2" fill={night ? "#A75CFF" : "#6126CF"} opacity="0.18" />
        </pattern>
        <clipPath id="island-clip">
          {city.rows.map(([y, l, r]) => (
            <rect key={`c${y}`} x={l} y={y} width={r - l} height={16} />
          ))}
        </clipPath>
      </defs>

      {/* water + mainland strips */}
      <rect width={W} height={H} fill="url(#waves)" />
      <rect x={0} y={0} width={city.mainlandLeft} height={H} fill={c.mainland} />
      <rect x={city.mainlandRight} y={0} width={W - city.mainlandRight} height={H} fill={c.mainland} />
      {Array.from({ length: 24 }, (_, i) => (
        <g key={`ml${i}`}>
          <rect x={8} y={24 + i * 48} width={36} height={32} fill={c.roof[i % 4]} />
          <rect x={city.mainlandRight + 12} y={40 + i * 48} width={32} height={28} fill={c.roof[(i + 2) % 4]} />
        </g>
      ))}

      {/* island */}
      {island}
      {shore}

      {/* streets, clipped to the island */}
      <g clipPath="url(#island-clip)">
        {city.avenues.map((x) => (
          <rect key={`av${x}`} x={x - 2} y={40} width={4} height={H - 80} fill={c.street} opacity={0.55} />
        ))}
        {city.streets.map((y) => (
          <rect key={`st${y}`} x={120} y={y - 1} width={560} height={2} fill={c.street} opacity={0.35} />
        ))}
      </g>
      {/* park */}
      <rect x={city.park.x} y={city.park.y} width={city.park.w} height={city.park.h} fill={c.park} />
      <rect x={city.park.x} y={city.park.y} width={city.park.w} height={city.park.h} fill="url(#halftone)" />
      <rect x={city.park.x + 8} y={city.park.y + city.park.h / 2} width={city.park.w - 16} height={4} fill={c.parkPath} />
      <rect x={city.park.x + city.park.w / 2 - 2} y={city.park.y + 8} width={4} height={city.park.h - 16} fill={c.parkPath} />
      <rect x={city.pond.x} y={city.pond.y} width={city.pond.w} height={city.pond.h} fill={c.pond} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={`tree${i}`}
          x={city.park.x + 16 + (i % 3) * 52}
          y={city.park.y + 140 + Math.floor(i / 3) * 40}
          width={12}
          height={12}
          fill={night ? "#1E7A5E" : "#3FBF7F"}
        />
      ))}

      {/* buildings */}
      {city.buildings.map((b) => (
        <g key={b.id}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={c.roof[b.level - 1]} />
          <rect x={b.x} y={b.y} width={b.w} height={2} fill={c.roofEdge} opacity={0.8} />
          <rect x={b.x} y={b.y} width={2} height={b.h} fill={c.roofEdge} opacity={0.5} />
          {b.level >= 3 && <rect x={b.x + 4} y={b.y + 4} width={b.w - 8} height={b.h - 8} fill="url(#halftone)" />}
          {b.windows.map(([wx, wy], i) => (
            <rect
              key={i}
              x={wx}
              y={wy}
              width={3}
              height={3}
              fill={c.window[(i + b.level) % c.window.length]}
              className={night && i % 5 === 0 ? "twinkle" : undefined}
              style={night && i % 5 === 0 ? { animationDelay: `${(i * 0.37) % 4}s` } : undefined}
            />
          ))}
          {b.waterTower && (
            <g>
              <rect x={b.x + b.w - 14} y={b.y + 4} width={10} height={9} fill="#7A4A2B" />
              <rect x={b.x + b.w - 14} y={b.y + 4} width={10} height={2} fill="#A86A3E" />
              <rect x={b.x + b.w - 13} y={b.y + 13} width={2} height={3} fill="#4E2F1C" />
              <rect x={b.x + b.w - 7} y={b.y + 13} width={2} height={3} fill="#4E2F1C" />
            </g>
          )}
          {b.antenna && (
            <g>
              <rect x={b.x + 6} y={b.y + 4} width={2} height={12} fill="#F8F5FF" />
              <rect x={b.x + 5} y={b.y + 2} width={4} height={3} fill="#FF65AD" className={night ? "blink" : undefined} />
            </g>
          )}
        </g>
      ))}

      {/* bridges */}
      {city.bridges.map((b) => (
        <g key={b.id}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={c.bridge} />
          <rect x={b.x} y={b.y} width={b.w} height={2} fill={c.bridgeRail} />
          <rect x={b.x} y={b.y + b.h - 2} width={b.w} height={2} fill={c.bridgeRail} />
          {Array.from({ length: Math.floor(b.w / 16) }, (_, i) => (
            <rect key={i} x={b.x + 6 + i * 16} y={b.y + 7} width={6} height={2} fill={c.shore} opacity={0.7} />
          ))}
        </g>
      ))}

      {/* stars over the water at night */}
      {night &&
        city.stars.map(([x, y], i) => (
          <rect key={`star${i}`} x={x} y={y} width={2} height={2} fill="#F8F5FF" opacity={0.5} className="twinkle" style={{ animationDelay: `${(i * 0.61) % 5}s` }} />
        ))}

      {/* hidden message in the river: only visible if you look closely */}
      <text x={24} y={H - 18} fontSize="8" fill={night ? "#1C4E9A" : "#7FCBF6"} fontFamily="monospace">
        TWO SIGNALS, ONE CITY
      </text>
    </svg>
  );
});
