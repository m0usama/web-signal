"use client";

import { memo, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { faceChars, H, HAIR_COLORS, HEAD_BOX, hexOf, shade, SKINS, TOP, W, type HeroLook } from "@/lib/hero";
import { drawAccessory, drawEyewear, drawHat, drawMask, drawOutfit, EYE_L, EYE_R, EYE_Y, glyph, INK, MOUTH, o, PINK, WHITE } from "./heroParts";

/** Grid pixels per art unit: 120×164 view → 60×82 pixel grid. */
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

/**
 * Pixel hero drawn from a look. `size` is the height in px (full
 * body) or the side of the square head crop when `head` is set. Blinks now
 * and then unless `still`.
 */
export const HeroSprite = memo(function HeroSprite({
  look,
  size = 96,
  head = false,
  pose = "stand",
  still = false,
  title,
  className,
}: {
  look: HeroLook;
  size?: number;
  head?: boolean;
  /** "swing" raises the right hand to hold a web line (at HAND). */
  pose?: "stand" | "swing";
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
  const viewBox = head ? `${hx} ${hy} ${hs} ${hs}` : `0 ${TOP} ${W} ${H}`;
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
  }, [look, blink, head, pose, gw, gh]);

  return (
    <span className={`hero-px ${className ?? ""}`} style={{ width, height: size }} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <svg ref={src} xmlns="http://www.w3.org/2000/svg" width={gw} height={gh} viewBox={viewBox} shapeRendering="crispEdges" className={img ? "hero-px-src" : "hero-px-fallback"}>
        <HeroArt look={look} blink={blink} uid={uid} pose={pose} />
      </svg>
      {img && <img src={img} alt="" width={width} height={size} draggable={false} />}
    </span>
  );
});

const CLOSED = new Set(["-", "_", "^", "u", "=", "~", ">", "<", "v", "x", "X", "‿", "'"]);
/** Masks with eye holes: the eyes are redrawn on top in the mask's colour. */
const EYE_HOLES = new Set(["masquerade", "feather", "owl", "carnival", "lion"]);

function HeroArt({ look, blink, uid, pose }: { look: HeroLook; blink: boolean; uid: string; pose: "stand" | "swing" }) {
  const skin = hexOf(SKINS, look.skin);
  const skinDark = shade(skin, 0.84);
  const hair = hexOf(HAIR_COLORS, look.hairColor);
  const hairDark = shade(hair, 0.75);
  const hairLight = shade(hair, 1.25);
  const id = (n: string) => `${n}${uid}`;

  const hat = drawHat(look.hat, look.hair);
  const mask = drawMask(look.mask);
  const eyewear = drawEyewear(look.eyewear);
  const acc = drawAccessory(look.accessory);
  const fit = drawOutfit(look.outfit);
  const full = !!mask?.full;
  const hooded = !!fit.hood;
  const hatOn = !!hat && !full;
  // Small toppers (crowns, halos, a cat…) sit on the hair; real hats cover it.
  const topper = hatOn && hat!.line < 30;
  const coverHat = hatOn && !topper;
  const showHair = !full && !hooded && look.hair !== "bald";
  // Under a covering hat, hair only shows below the hat's band — never behind it.
  const hairCut = coverHat ? hat!.line : -99;
  const style = look.hair;

  // ---------------------------------------------------------------- arms
  const swing = pose === "swing";
  const turnL = swing ? 58 : 12;
  const turnR = swing ? -160 : -12;
  const handAt = (sx: number, turn: number) => {
    const a = (turn * Math.PI) / 180;
    return { x: sx - 21 * Math.sin(a), y: 92 + 21 * Math.cos(a) };
  };
  const leftHand = handAt(26, turnL);
  const arm = (side: "l" | "r") => {
    const sx = side === "l" ? 26 : 94;
    const turn = side === "l" ? turnL : turnR;
    return (
      <g key={`arm${side}`} transform={`rotate(${turn} ${sx} 92)`}>
        <rect x={sx - 7} y={88} width={14} height={22} rx={7} fill={fit.sleeve} {...o} />
        <circle cx={sx} cy={113} r={7.5} fill={skin} {...o} />
      </g>
    );
  };

  // ---------------------------------------------------------------- hair
  const hairBack: ReactNode[] = [];
  if (showHair && !coverHat) {
    if (style === "long")
      hairBack.push(<path key="hl" d="M18,54 C14,90 18,112 26,120 L94,120 C102,112 106,90 102,54 C100,30 84,14 60,14 C36,14 20,30 18,54 Z" fill={hairDark} {...o} />);
    if (style === "bob")
      hairBack.push(<path key="hbob" d="M14,56 C10,82 16,92 26,92 L94,92 C104,92 110,82 106,56 C104,26 84,12 60,12 C36,12 16,26 14,56 Z" fill={hairDark} {...o} />);
    if (style === "ponytail")
      hairBack.push(
        <g key="hp">
          <path d="M92,30 C116,30 118,62 108,92 C104,100 96,98 98,88 C104,64 100,44 88,40 Z" fill={hair} {...o} />
          <circle cx={93} cy={34} r={5} fill={PINK} {...o} />
        </g>,
      );
    if (style === "pigtails")
      hairBack.push(
        <g key="hpt">
          <path d="M18,48 C2,56 0,86 8,98 C14,92 16,72 24,60 Z" fill={hair} {...o} />
          <path d="M102,48 C118,56 120,86 112,98 C106,92 104,72 96,60 Z" fill={hair} {...o} />
          <circle cx={20} cy={50} r={4.5} fill={PINK} {...o} />
          <circle cx={100} cy={50} r={4.5} fill={PINK} {...o} />
        </g>,
      );
    if (style === "buns")
      hairBack.push(
        <g key="hb">
          <circle cx={26} cy={22} r={13} fill={hair} {...o} />
          <circle cx={94} cy={22} r={13} fill={hair} {...o} />
        </g>,
      );
  }
  const fringe = "M14,58 C10,22 36,6 60,6 C84,6 110,22 106,58 C100,44 92,36 80,34 L76,42 L68,32 L56,42 L50,32 C34,34 22,44 14,58 Z";
  const hairInside: ReactNode[] = [];
  if (showHair) {
    if (style === "curly" && !coverHat) {
      const pts: [number, number][] = [[20, 46], [22, 32], [32, 20], [46, 13], [60, 11], [74, 13], [88, 20], [98, 32], [100, 46], [34, 32], [48, 26], [62, 26], [76, 28], [86, 36]];
      hairInside.push(
        <g key="curl">
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={11} fill={i % 2 ? hair : hairDark} />
          ))}
        </g>,
      );
    } else if (style === "mohawk") {
      if (!hatOn) hairInside.push(<path key="mh" d="M50,40 C50,20 54,12 60,12 C66,12 70,20 70,40 Z" fill={hair} />);
    } else {
      hairInside.push(<path key="fr" d={style === "bob" ? "M14,62 C10,22 36,6 60,6 C84,6 110,22 106,62 C100,48 92,40 60,38 C28,40 20,48 14,62 Z" : fringe} fill={hair} />);
      if (!coverHat) hairInside.push(<path key="frh" d="M30,26 Q44,14 58,14" stroke={hairLight} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />);
    }
  }
  // Volume of hair above the head (behind it), so the hairline has a shape.
  if (showHair && !coverHat && style !== "mohawk")
    hairBack.push(<path key="dome" d={style === "bob" ? "M12,64 C8,20 36,4 60,4 C84,4 112,20 108,64 Z" : "M14,58 C10,20 36,4 60,4 C84,4 110,20 106,58 Z"} fill={hair} {...o} />);
  const hairOutside: ReactNode[] = [];
  if (showHair && !hatOn) {
    if (style === "spiky") hairOutside.push(<path key="spk" d="M22,34 L18,14 L34,22 L40,4 L52,18 L62,0 L70,16 L84,4 L86,22 L102,16 L98,34" fill={hair} {...o} />);
    if (style === "curly")
      hairOutside.push(
        <g key="cu" fill={hair} {...o}>
          <circle cx={22} cy={36} r={9} />
          <circle cx={98} cy={36} r={9} />
          <circle cx={40} cy={16} r={10} />
          <circle cx={60} cy={11} r={10} />
          <circle cx={80} cy={16} r={10} />
        </g>,
      );
    if (style === "mohawk") hairOutside.push(<path key="mho" d="M50,22 L46,0 L56,10 L60,-6 L64,10 L74,0 L70,22 Z" fill={hair} {...o} />);
  }

  // ---------------------------------------------------------------- face
  const chars = faceChars(look.face);
  const [cl, cm, cr] = chars.length === 3 ? chars : ["•", "_", "•"];
  const eyeChar = (c: string) => (blink && !CLOSED.has(c) ? "-" : c);
  const faceGlyphs = (color: string, eyesOnly = false) => (
    <g key={`face${color}${eyesOnly}`}>
      {glyph(eyeChar(cl), EYE_L, EYE_Y, 1, color, "gl")}
      {glyph(eyeChar(cr), EYE_R, EYE_Y, 1, color, "gr")}
      {!eyesOnly && glyph(cm, MOUTH.x, MOUTH.y, 0.75, color, "gm")}
    </g>
  );

  return (
    <g>
      {acc?.back}
      {fit.back}
      {fit.hood}
      {hatOn && hat!.back}
      {mask?.back}
      {hairBack}

      {/* stubby legs + boots */}
      <rect x={40} y={108} width={17} height={18} rx={6} fill={fit.legs} {...o} />
      <rect x={63} y={108} width={17} height={18} rx={6} fill={fit.legs} {...o} />
      <path d="M36,122 h23 v7 q0,5 -5,5 h-13 q-5,0 -5,-5 z" fill={fit.boots} {...o} />
      <path d="M61,122 h23 v7 q0,5 -5,5 h-13 q-5,0 -5,-5 z" fill={fit.boots} {...o} />
      {!swing && arm("l")}
      {!swing && arm("r")}

      {/* round belly */}
      <clipPath id={id("t")}>
        <rect x={30} y={82} width={60} height={36} rx={18} />
      </clipPath>
      <rect x={30} y={82} width={60} height={36} rx={18} fill={fit.top} />
      <g clipPath={`url(#${id("t")})`}>
        {fit.torso}
        <ellipse cx={86} cy={104} rx={16} ry={22} fill={INK} opacity={0.12} />
        <ellipse cx={42} cy={92} rx={7} ry={4} fill={WHITE} opacity={0.25} />
      </g>
      <rect x={30} y={82} width={60} height={36} rx={18} fill="none" {...o} />
      {fit.front}
      {acc?.body}

      {/* head */}
      {!full && (
        <g fill={skin} {...o}>
          <ellipse cx={21} cy={60} rx={7} ry={9} />
          <ellipse cx={99} cy={60} rx={7} ry={9} />
        </g>
      )}
      <clipPath id={id("h")}>
        <ellipse cx={60} cy={52} rx={40} ry={37} />
      </clipPath>
      <clipPath id={id("hc")}>
        <rect x={-20} y={hairCut} width={160} height={200} />
      </clipPath>
      <ellipse cx={60} cy={52} rx={40} ry={37} fill={skin} />
      <g clipPath={`url(#${id("h")})`}>
        <ellipse cx={96} cy={60} rx={22} ry={40} fill={skinDark} opacity={0.45} />
        <g clipPath={`url(#${id("hc")})`}>{hairInside}</g>
      </g>
      <ellipse cx={60} cy={52} rx={40} ry={37} fill="none" {...o} />
      {hairOutside}

      {/* face */}
      {!full && faceGlyphs(INK)}
      {!full && look.mask !== "ninja" && (
        <g fill={PINK} opacity={0.45}>
          <ellipse cx={30} cy={71} rx={6} ry={3.5} />
          <ellipse cx={90} cy={71} rx={6} ry={3.5} />
        </g>
      )}
      {mask?.front}
      {mask && EYE_HOLES.has(look.mask) && faceGlyphs(mask.faceColor ?? INK, true)}
      {full && look.mask === "robot" && faceGlyphs(mask!.faceColor ?? "#7DF9FF")}
      {!full && eyewear?.front}
      {!full && acc?.face}

      {/* hats and head accessories */}
      {hatOn && hat!.front}
      {!full && acc?.head}

      {swing && arm("l")}
      {acc?.hand?.(leftHand.x, leftHand.y)}
      {swing && arm("r")}
    </g>
  );
}
