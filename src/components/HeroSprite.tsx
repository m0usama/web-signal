"use client";

import { memo, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { COLORS, glowOn, H, HAIR_COLORS, HEAD_BOX, hexOf, shade, SKINS, W, type HeroLook } from "@/lib/hero";

const INK = "#10101E";
const WHITE = "#FFFFFF";
const PINK = "#FF5C8A";
const YELLOW = "#FFD84D";
const SILVER = "#D6D9E8";
const SW = 3.2; // outline width (drawn at half size, so ~1.6 grid pixels)
/** Grid pixels per art unit: 120×160 art → 60×80 pixel grid. */
const PX = 0.5;
const CACHE = new Map<string, string>();

/** Draw the SVG onto a tiny canvas, snap alpha to on/off, return a PNG URL. */
function pixelate(markup: string, w: number, h: number): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h);
        const a = d.data;
        for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 110 ? 255 : 0;
        ctx.putImageData(d, 0, 0);
        resolve(c.toDataURL());
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

const EYE_Y = 58;
const EYE_L = 43;
const EYE_R = 77;

const EMBLEMS: Record<string, string> = {
  star: "M0,-10 L2.9,-3.1 L10,-3.1 L4.3,1.4 L6.5,8.6 L0,4.3 L-6.5,8.6 L-4.3,1.4 L-10,-3.1 L-2.9,-3.1 Z",
  heart: "M0,8 C-14,-2 -8,-13 0,-6 C8,-13 14,-2 0,8 Z",
  bolt: "M3,-11 L-7,1 L-1,1 L-4,11 L7,-2 L1,-2 Z",
  moon: "M4,-10 A10,10 0 1,0 4,10 A8,8 0 1,1 4,-10 Z",
};

/**
 * Smooth, detailed hero drawn from a look. `size` is the height in px (full
 * body) or the side of the square head crop when `head` is set. Blinks now
 * and then unless `still`.
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
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

  const [hx, hy, hs] = HEAD_BOX;
  const viewBox = head ? `${hx} ${hy} ${hs} ${hs}` : `0 0 ${W} ${H}`;
  // Pixel grid: the detailed art is drawn small with hard edges, then scaled
  // up without smoothing, so it reads as pixel art with lots of detail.
  const gw = head ? Math.round(hs * PX) : Math.round(W * PX);
  const gh = head ? Math.round(hs * PX) : Math.round(H * PX);
  const width = head ? size : Math.round((size * W) / H);
  const src = useRef<SVGSVGElement>(null);
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    const el = src.current;
    if (!el) return;
    const markup = el.outerHTML;
    const hit = CACHE.get(markup);
    if (hit) {
      const t = setTimeout(() => setImg(hit), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    pixelate(markup, gw, gh).then(
      (url) => {
        if (!url) return;
        if (CACHE.size > 400) CACHE.clear();
        CACHE.set(markup, url);
        if (alive) setImg(url);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [look, blink, head, gw, gh]);

  return (
    <span className={`hero-px ${className ?? ""}`} style={{ width, height: size }} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg ref={src} xmlns="http://www.w3.org/2000/svg" width={gw} height={gh} viewBox={viewBox} shapeRendering="crispEdges" className={img ? "hero-px-src" : "hero-px-fallback"}>
        <HeroArt look={look} blink={blink} uid={uid} />
      </svg>
      {img && <img src={img} alt="" width={width} height={size} draggable={false} />}
    </span>
  );
});

function HeroArt({ look, blink, uid }: { look: HeroLook; blink: boolean; uid: string }) {
  const skin = hexOf(SKINS, look.skin);
  const skinDark = shade(skin, 0.84);
  const hair = hexOf(HAIR_COLORS, look.hairColor);
  const hairDark = shade(hair, 0.75);
  const hairLight = shade(hair, 1.25);
  const suit = hexOf(COLORS, look.suit);
  const suitDark = shade(suit, 0.78);
  const trim = hexOf(COLORS, look.trim);
  const trimDark = shade(trim, 0.75);
  const fullMask = look.mask === "ninja" || look.mask === "visor";
  const headFill = fullMask ? suit : skin;
  const handFill = fullMask ? trim : skin;
  const id = (n: string) => `${n}${uid}`;
  const o = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

  const back: ReactNode[] = [];
  const front: ReactNode[] = [];

  // ---------------------------------------------------------------- behind
  if (look.outfit === "cape") back.push(<path key="cape" d="M38,86 C22,110 16,134 14,152 Q60,142 106,152 C104,134 98,110 82,86 Z" fill={trimDark} {...o} />);
  if (look.outfit === "coat") back.push(<path key="coat" d="M36,96 L30,146 L56,146 L58,118 L62,118 L64,146 L90,146 L84,96 Z" fill={trimDark} {...o} />);
  if (!fullMask) {
    if (look.hair === "long")
      back.push(<path key="hl" d="M18,54 C14,90 18,112 26,120 L94,120 C102,112 106,90 102,54 C100,30 84,14 60,14 C36,14 20,30 18,54 Z" fill={hairDark} {...o} />);
    if (look.hair === "ponytail")
      back.push(
        <g key="hp">
          <path d="M92,30 C116,30 118,62 108,92 C104,100 96,98 98,88 C104,64 100,44 88,40 Z" fill={hair} {...o} />
          <circle cx={93} cy={34} r={5} fill={trim} {...o} />
        </g>,
      );
    if (look.hair === "buns")
      back.push(
        <g key="hb">
          <circle cx={26} cy={22} r={13} fill={hair} {...o} />
          <circle cx={94} cy={22} r={13} fill={hair} {...o} />
        </g>,
      );
    if (look.hair === "hood") back.push(<ellipse key="hh" cx={60} cy={54} rx={47} ry={45} fill={suit} {...o} />);
  }

  // ---------------------------------------------------------------- body
  const body = (
    <g key="body">
      {/* legs + boots */}
      <rect x={41} y={116} width={16} height={28} rx={6} fill={trim} {...o} />
      <rect x={63} y={116} width={16} height={28} rx={6} fill={trim} {...o} />
      <path d="M37,140 h22 v8 q0,5 -5,5 h-14 q-5,0 -5,-5 z" fill={trimDark} {...o} />
      <path d="M61,140 h22 v8 q0,5 -5,5 h-14 q-5,0 -5,-5 z" fill={trimDark} {...o} />
      <path d="M40,143 h16" stroke={shade(trim, 1.15)} strokeWidth={2} strokeLinecap="round" />
      <path d="M64,143 h16" stroke={shade(trim, 1.15)} strokeWidth={2} strokeLinecap="round" />
      {/* arms */}
      <rect x={22} y={88} width={15} height={32} rx={7.5} fill={look.pattern === "split" ? suit : suit} {...o} />
      <rect x={83} y={88} width={15} height={32} rx={7.5} fill={look.pattern === "split" ? trim : suit} {...o} />
      <circle cx={29.5} cy={122} r={7.5} fill={handFill} {...o} />
      <circle cx={90.5} cy={122} r={7.5} fill={handFill} {...o} />
      {/* torso */}
      <clipPath id={id("t")}>
        <rect x={35} y={84} width={50} height={38} rx={12} />
      </clipPath>
      <rect x={35} y={84} width={50} height={38} rx={12} fill={suit} />
      <g clipPath={`url(#${id("t")})`}>
        {look.pattern === "split" && <rect x={60} y={80} width={30} height={46} fill={trim} />}
        {look.pattern === "stripes" && [90, 100, 110].map((y) => <rect key={y} x={30} y={y} width={60} height={5} fill={trim} />)}
        {look.pattern === "chevron" && <path d="M30,88 L60,106 L90,88 L90,98 L60,116 L30,98 Z" fill={trim} />}
        <rect x={72} y={80} width={20} height={46} fill={suitDark} opacity={0.35} />
      </g>
      {EMBLEMS[look.pattern] && (
        <path d={EMBLEMS[look.pattern]} transform="translate(60,100)" fill={look.trim === look.suit ? WHITE : trim} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      )}
      <rect x={35} y={84} width={50} height={38} rx={12} fill="none" {...o} />
      {/* belt */}
      <rect x={36} y={113} width={48} height={7} rx={2} fill={trimDark} {...o} />
      <rect x={55} y={112} width={10} height={9} rx={2} fill={YELLOW} {...o} />
    </g>
  );

  // ---------------------------------------------------------------- outfit over the body
  const gear: ReactNode[] = [];
  if (look.outfit === "jacket" || look.outfit === "coat") {
    const j = look.outfit === "coat" ? trimDark : shade(trim, 0.9);
    gear.push(
      <g key="jk">
        <path d="M35,96 Q35,84 47,84 L52,84 L50,121 L35,121 Z" fill={j} {...o} />
        <path d="M85,96 Q85,84 73,84 L68,84 L70,121 L85,121 Z" fill={j} {...o} />
        <rect x={22} y={88} width={15} height={26} rx={7.5} fill={j} {...o} />
        <rect x={83} y={88} width={15} height={26} rx={7.5} fill={j} {...o} />
        <path d="M47,84 L56,100 M73,84 L64,100" stroke={INK} strokeWidth={2} />
      </g>,
    );
  }
  if (look.outfit === "scarf")
    gear.push(
      <g key="sc">
        <rect x={36} y={80} width={48} height={11} rx={5.5} fill={trim} {...o} />
        <path d="M66,88 L70,112 L80,110 L74,88 Z" fill={trimDark} {...o} />
      </g>,
    );
  if (look.outfit === "tie")
    gear.push(
      <g key="tie">
        <path d="M56,85 L64,85 L62,91 L58,91 Z" fill={trim} {...o} />
        <path d="M58,91 L62,91 L66,110 L60,116 L54,110 Z" fill={trimDark} {...o} />
      </g>,
    );
  if (look.outfit === "spikes")
    gear.push(
      <g key="sp" fill={SILVER} {...o}>
        <path d="M18,94 L24,78 L30,90 Z" />
        <path d="M28,90 L34,74 L40,88 Z" />
        <path d="M102,94 L96,78 L90,90 Z" />
        <path d="M92,90 L86,74 L80,88 Z" />
      </g>,
    );

  // ---------------------------------------------------------------- head
  const headShape = <ellipse cx={60} cy={52} rx={40} ry={37} />;
  const headParts: ReactNode[] = [];
  headParts.push(
    <g key="ears" fill={headFill} {...o}>
      <ellipse cx={21} cy={60} rx={7} ry={9} />
      <ellipse cx={99} cy={60} rx={7} ry={9} />
    </g>,
  );
  headParts.push(<ellipse key="hd" cx={60} cy={52} rx={40} ry={37} fill={headFill} />);
  headParts.push(
    <clipPath key="hc" id={id("h")}>
      {headShape}
    </clipPath>,
  );
  const inHead: ReactNode[] = [];
  // soft shading on the right of the face
  inHead.push(<ellipse key="shd" cx={96} cy={60} rx={22} ry={40} fill={fullMask ? suitDark : skinDark} opacity={0.45} />);

  if (look.mask === "ninja") {
    inHead.push(<rect key="slit" x={14} y={EYE_Y - 13} width={92} height={24} rx={4} fill={skin} />);
    inHead.push(<rect key="slitL" x={14} y={EYE_Y - 13} width={92} height={24} rx={4} fill="none" stroke={INK} strokeWidth={SW} />);
  }
  if (look.mask === "visor") {
    inHead.push(<rect key="vz" x={14} y={EYE_Y - 14} width={92} height={28} rx={14} fill={trim} stroke={INK} strokeWidth={SW} />);
    inHead.push(<path key="vzs" d="M26,48 Q40,44 54,46" stroke={WHITE} strokeWidth={3} strokeLinecap="round" opacity={0.55} fill="none" />);
    inHead.push(<path key="crest" d="M60,15 L60,30" stroke={shade(suit, 1.25)} strokeWidth={4} strokeLinecap="round" />);
  }
  if (look.mask === "bandana") {
    inHead.push(<path key="bd" d="M10,70 Q60,62 110,70 L110,100 L10,100 Z" fill={trim} stroke={INK} strokeWidth={SW} />);
    inHead.push(<path key="bdf" d="M40,80 l4,4 M58,82 l4,4 M76,80 l4,4" stroke={trimDark} strokeWidth={2.4} strokeLinecap="round" />);
  }

  // hair front (fringe) — hidden under full masks / hood keeps a fringe too
  if (!fullMask) {
    const fringe = "M14,58 C10,22 36,6 60,6 C84,6 110,22 106,58 C100,44 92,36 80,34 L76,42 L68,32 L56,42 L50,32 C34,34 22,44 14,58 Z";
    if (look.hair === "curly") {
      const pts: [number, number][] = [[20, 46], [22, 32], [32, 20], [46, 13], [60, 11], [74, 13], [88, 20], [98, 32], [100, 46], [34, 32], [48, 26], [62, 26], [76, 28], [86, 36]];
      inHead.push(
        <g key="curl">
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} fill={i % 2 ? hair : hairDark} />
          ))}
        </g>,
      );
    } else {
      inHead.push(<path key="fr" d={fringe} fill={look.hair === "hood" ? hair : hair} />);
      inHead.push(<path key="frh" d="M30,26 Q44,14 58,14" stroke={hairLight} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />);
    }
  }

  headParts.push(
    <g key="inside" clipPath={`url(#${id("h")})`}>
      {inHead}
    </g>,
  );
  // hair that pokes outside the head + outline
  headParts.push(<ellipse key="ho" cx={60} cy={52} rx={40} ry={37} fill="none" {...o} />);
  if (!fullMask) {
    if (look.hair === "spiky")
      headParts.push(<path key="spk" d="M22,34 L18,14 L34,22 L40,4 L52,18 L62,0 L70,16 L84,4 L86,22 L102,16 L98,34" fill={hair} {...o} />);
    if (look.hair === "curly")
      headParts.push(
        <g key="cu" fill={hair} {...o}>
          <circle cx={22} cy={36} r={9} />
          <circle cx={98} cy={36} r={9} />
          <circle cx={40} cy={16} r={10} />
          <circle cx={60} cy={11} r={10} />
          <circle cx={80} cy={16} r={10} />
        </g>,
      );
    if (look.hair === "hood") headParts.push(<path key="hr" d="M14,64 C8,22 36,8 60,8 C84,8 112,22 106,64" fill="none" stroke={suitDark} strokeWidth={7} strokeLinecap="round" />);
    if (look.hair === "long" || look.hair === "ponytail" || look.hair === "buns" || look.hair === "short" || look.hair === "spiky")
      headParts.push(<path key="fro" d="M14,58 C10,22 36,6 60,6 C84,6 110,22 106,58" fill="none" {...o} />);
  }
  if (look.mask === "ninja")
    headParts.push(
      <g key="knot" fill={trim} {...o}>
        <path d="M98,40 L114,30 L112,46 Z" />
        <path d="M98,44 L116,52 L102,56 Z" />
      </g>,
    );

  // ---------------------------------------------------------------- face
  const visor = look.mask === "visor";
  const glow = visor ? glowOn(trim) : INK;
  const face: ReactNode[] = [];
  const eye = (cx: number, kind: string, key: string): ReactNode => {
    if (blink && kind !== "shades") return <path key={key} d={`M${cx - 7},${EYE_Y + 1} Q${cx},${EYE_Y + 5} ${cx + 7},${EYE_Y + 1}`} stroke={glow} strokeWidth={3} strokeLinecap="round" fill="none" />;
    switch (kind) {
      case "big":
      case "fierce":
        return (
          <g key={key}>
            {visor ? (
              <rect x={cx - 8} y={EYE_Y - 6} width={16} height={12} rx={6} fill={glow} />
            ) : (
              <>
                <ellipse cx={cx} cy={EYE_Y} rx={7} ry={9} fill={INK} />
                <circle cx={cx - 2.5} cy={EYE_Y - 3.5} r={3} fill={WHITE} />
                <circle cx={cx + 2.5} cy={EYE_Y + 3.5} r={1.4} fill={WHITE} />
              </>
            )}
            {kind === "fierce" && (
              <path
                d={cx < 60 ? `M${cx - 10},${EYE_Y - 15} L${cx + 8},${EYE_Y - 9}` : `M${cx + 10},${EYE_Y - 15} L${cx - 8},${EYE_Y - 9}`}
                stroke={visor ? glow : INK}
                strokeWidth={4}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      case "happy":
        return <path key={key} d={`M${cx - 8},${EYE_Y + 3} Q${cx},${EYE_Y - 8} ${cx + 8},${EYE_Y + 3}`} stroke={glow} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
      case "sleepy":
        return (
          <g key={key}>
            <path d={`M${cx - 8},${EYE_Y} Q${cx},${EYE_Y + 7} ${cx + 8},${EYE_Y}`} stroke={glow} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <path d={`M${cx - 7},${EYE_Y - 4} L${cx + 7},${EYE_Y - 4}`} stroke={glow} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
          </g>
        );
      case "hearts":
        return <path key={key} d={EMBLEMS.heart} transform={`translate(${cx},${EYE_Y}) scale(0.85)`} fill={PINK} stroke={visor ? "none" : INK} strokeWidth={1.4} />;
      case "stars":
        return <path key={key} d={EMBLEMS.star} transform={`translate(${cx},${EYE_Y}) scale(0.85)`} fill={YELLOW} stroke={visor ? "none" : INK} strokeWidth={1.4} />;
    }
    return null;
  };
  if (look.mask === "domino")
    face.push(<path key="dm" d={`M22,${EYE_Y - 10} Q60,${EYE_Y - 18} 98,${EYE_Y - 10} L94,${EYE_Y + 10} Q78,${EYE_Y + 16} 64,${EYE_Y + 6} L56,${EYE_Y + 6} Q42,${EYE_Y + 16} 26,${EYE_Y + 10} Z`} fill={trim} {...o} />);
  if (look.eyes === "wink") {
    face.push(eye(EYE_L, "big", "el"), eye(EYE_R, "happy", "er"));
  } else if (look.eyes === "shades" && !visor) {
    face.push(
      <g key="sh">
        <path d={`M24,${EYE_Y - 7} L96,${EYE_Y - 7}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <path d={`M28,${EYE_Y - 7} h28 v8 q0,8 -14,8 q-14,0 -14,-8 z`} fill={INK} />
        <path d={`M64,${EYE_Y - 7} h28 v8 q0,8 -14,8 q-14,0 -14,-8 z`} fill={INK} />
        <path d={`M33,${EYE_Y - 3} l6,0 M69,${EYE_Y - 3} l6,0`} stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
      </g>,
    );
  } else {
    const k = look.eyes === "shades" ? "big" : look.eyes;
    face.push(eye(EYE_L, k, "el"), eye(EYE_R, k, "er"));
  }

  if (!fullMask) {
    if (look.mask !== "bandana") {
      face.push(<path key="nose" d="M58,68 Q60,70 62,68" stroke={skinDark} strokeWidth={2.4} strokeLinecap="round" fill="none" />);
      face.push(
        look.eyes === "fierce" ? (
          <path key="m" d="M52,77 Q60,74 68,77" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
        ) : (
          <path key="m" d="M52,74 Q60,82 68,74" stroke={INK} strokeWidth={3} strokeLinecap="round" fill={look.eyes === "happy" || look.eyes === "stars" ? "#B3263E" : "none"} />
        ),
      );
    }
    if (look.eyes !== "shades")
      face.push(
        <g key="ck" fill={PINK} opacity={0.45}>
          <ellipse cx={32} cy={71} rx={6} ry={3.5} />
          <ellipse cx={88} cy={71} rx={6} ry={3.5} />
        </g>,
      );
  }

  const covered = look.mask === "bandana";
  switch (look.face) {
    case "nosering":
      if (!fullMask && !covered) face.push(<circle key="nr" cx={63} cy={70} r={3} fill="none" stroke={YELLOW} strokeWidth={1.8} />);
      break;
    case "browring":
      if (!fullMask)
        face.push(
          <g key="br" fill={SILVER} stroke={INK} strokeWidth={0.8}>
            <circle cx={84} cy={EYE_Y - 14} r={2} />
            <circle cx={88} cy={EYE_Y - 11} r={2} />
          </g>,
        );
      break;
    case "earrings":
      face.push(
        <g key="er" fill={YELLOW} {...o} strokeWidth={1.5}>
          <circle cx={20} cy={74} r={4} />
          <circle cx={100} cy={74} r={4} />
        </g>,
      );
      break;
    case "freckles":
      if (!fullMask && !covered)
        face.push(
          <g key="fk" fill={shade(skin, 0.68)}>
            {[[30, 66], [36, 69], [33, 73], [84, 66], [90, 69], [87, 73]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={1.4} />
            ))}
          </g>,
        );
      break;
    case "glasses":
      if (look.eyes !== "shades" && !visor)
        face.push(
          <g key="gl" fill="none" stroke={INK} strokeWidth={2.6}>
            <circle cx={EYE_L} cy={EYE_Y} r={12} fill={WHITE} fillOpacity={0.15} />
            <circle cx={EYE_R} cy={EYE_Y} r={12} fill={WHITE} fillOpacity={0.15} />
            <path d={`M55,${EYE_Y} Q60,${EYE_Y - 4} 65,${EYE_Y}`} />
          </g>,
        );
      break;
    case "eyepatch":
      if (!visor)
        face.push(
          <g key="ep">
            <path d={`M20,${EYE_Y - 22} L100,${EYE_Y - 2}`} stroke={INK} strokeWidth={2.4} />
            <ellipse cx={EYE_R} cy={EYE_Y} rx={11} ry={10} fill={INK} />
          </g>,
        );
      break;
  }

  // ---------------------------------------------------------------- hats
  const hat: ReactNode[] = [];
  switch (look.hat) {
    case "cap":
      hat.push(
        <g key="cap" {...o}>
          <path d="M20,40 C20,12 42,4 60,4 C80,4 100,14 100,40 Z" fill={trim} />
          <path d="M60,36 L114,38 Q114,46 100,46 L60,44 Z" fill={trimDark} />
          <circle cx={60} cy={6} r={3} fill={trimDark} />
          <path d="M40,22 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0" fill={WHITE} stroke="none" opacity={0.85} />
        </g>,
      );
      break;
    case "beanie":
      hat.push(
        <g key="bn" {...o}>
          <path d="M20,40 C20,10 42,2 60,2 C80,2 100,10 100,40 Z" fill={trim} />
          <rect x={16} y={32} width={88} height={12} rx={6} fill={trimDark} />
          <circle cx={60} cy={2} r={7} fill={WHITE} />
          <path d="M36,16 v14 M48,10 v20 M60,8 v22 M72,10 v20 M84,16 v14" stroke={trimDark} strokeWidth={2} />
        </g>,
      );
      break;
    case "crown":
      hat.push(
        <g key="cr" {...o}>
          <path d="M38,22 L36,2 L48,12 L60,0 L72,12 L84,2 L82,22 Z" fill={YELLOW} />
          <circle cx={60} cy={14} r={3} fill={PINK} />
          <circle cx={46} cy={16} r={2} fill="#6FA8FF" />
          <circle cx={74} cy={16} r={2} fill="#6FA8FF" />
        </g>,
      );
      break;
    case "bow":
      hat.push(
        <g key="bow" fill={PINK} {...o}>
          <path d="M80,16 L66,4 L66,26 Z" />
          <path d="M80,16 L96,4 L96,26 Z" />
          <circle cx={80} cy={16} r={5} fill={shade(PINK, 0.8)} />
        </g>,
      );
      break;
    case "headphones":
      hat.push(
        <g key="hp">
          <path d="M16,56 C14,10 106,10 104,56" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
          <path d="M16,56 C14,10 106,10 104,56" fill="none" stroke={trim} strokeWidth={3} strokeLinecap="round" />
          <rect x={8} y={46} width={16} height={26} rx={7} fill={trim} {...o} />
          <rect x={96} y={46} width={16} height={26} rx={7} fill={trim} {...o} />
        </g>,
      );
      break;
    case "goggles":
      hat.push(
        <g key="gg">
          <path d="M20,30 Q60,20 100,30" stroke={INK} strokeWidth={6} fill="none" />
          <circle cx={44} cy={26} r={10} fill="#7DF9FF" {...o} strokeWidth={3.5} />
          <circle cx={76} cy={26} r={10} fill="#7DF9FF" {...o} strokeWidth={3.5} />
          <path d="M40,22 l4,-3 M72,22 l4,-3" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
        </g>,
      );
      break;
    case "catears": {
      const c = fullMask ? suit : hair;
      hat.push(
        <g key="ce" {...o}>
          <path d="M22,30 L22,2 L46,18 Z" fill={c} />
          <path d="M98,30 L98,2 L74,18 Z" fill={c} />
          <path d="M27,22 L27,11 L37,18 Z M93,22 L93,11 L83,18 Z" fill={PINK} stroke="none" />
        </g>,
      );
      break;
    }
    case "horns":
      hat.push(
        <g key="hn" fill={SILVER} {...o}>
          <path d="M28,26 C18,18 18,6 24,0 C26,10 32,16 38,20 Z" />
          <path d="M92,26 C102,18 102,6 96,0 C94,10 88,16 82,20 Z" />
        </g>,
      );
      break;
    case "halo":
      hat.push(<ellipse key="hl" cx={60} cy={6} rx={24} ry={5} fill="none" stroke={YELLOW} strokeWidth={4} />);
      break;
    case "mohawk":
      hat.push(<path key="mh" d="M44,20 L46,0 L54,14 L60,-2 L66,14 L74,0 L76,20 Z" fill={trim} {...o} />);
      break;
  }

  return (
    <g>
      {back}
      {body}
      {gear}
      {headParts}
      {face}
      {hat}
    </g>
  );
}
