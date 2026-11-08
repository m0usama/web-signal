/**
 * Drawings for every hero item (all original, all free). Coordinates are in
 * the 120 × 140 art space used by HeroSprite: head centre (60,52) rx40 ry37,
 * eyes at y58 (x43 / x77), mouth (60,74), round belly 30–90 × 82–118.
 */
import type { ReactNode } from "react";
import { shade } from "@/lib/hero";

export const INK = "#10101E";
export const WHITE = "#FFFFFF";
export const PINK = "#FF5C8A";
export const YELLOW = "#FFD84D";
export const SILVER = "#D6D9E8";
export const SW = 3.2;
export const o = { stroke: INK, strokeWidth: SW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export const EYE_Y = 58;
export const EYE_L = 43;
export const EYE_R = 77;
export const MOUTH = { x: 60, y: 75 };

const HEART = "M0,8 C-14,-2 -8,-13 0,-6 C8,-13 14,-2 0,8 Z";
const STAR = "M0,-10 L2.9,-3.1 L10,-3.1 L4.3,1.4 L6.5,8.6 L0,4.3 L-6.5,8.6 L-4.3,1.4 L-10,-3.1 L-2.9,-3.1 Z";
const heart = (x: number, y: number, s: number, fill = PINK, key?: string) => (
  <path key={key} d={HEART} transform={`translate(${x},${y}) scale(${s})`} fill={fill} {...thin} />
);
const star = (x: number, y: number, s: number, fill = YELLOW, key?: string) => (
  <path key={key} d={STAR} transform={`translate(${x},${y}) scale(${s})`} fill={fill} {...thin} />
);
const flower = (x: number, y: number, c: string, key: string) => (
  <g key={key}>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 4} cy={y + Math.sin((a * Math.PI) / 180) * 4} r={3.6} fill={c} stroke={INK} strokeWidth={1.4} />
    ))}
    <circle cx={x} cy={y} r={2.6} fill={YELLOW} stroke={INK} strokeWidth={1.2} />
  </g>
);

// ====================================================================== FACE
/** Draws one character of the 3-character face as a shape. */
export function glyph(ch: string, cx: number, cy: number, s: number, color = INK, key?: string): ReactNode {
  const line = { stroke: color, strokeWidth: 3.4 * Math.max(0.8, s), strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const P = (d: string) => <path key={key} d={d} transform={`translate(${cx},${cy}) scale(${s})`} {...line} strokeWidth={3.4 / Math.max(0.8, s)} />;
  switch (ch) {
    case "•":
      return (
        <g key={key}>
          <ellipse cx={cx} cy={cy} rx={5.5 * s} ry={6.5 * s} fill={color} />
          <circle cx={cx - 2 * s} cy={cy - 2.6 * s} r={2 * s} fill={WHITE} />
        </g>
      );
    case ".":
      return <circle key={key} cx={cx} cy={cy + 2 * s} r={2.6 * s} fill={color} />;
    case "o":
      return <circle key={key} cx={cx} cy={cy} r={5.5 * s} fill="none" stroke={color} strokeWidth={3} />;
    case "O":
      return <circle key={key} cx={cx} cy={cy} r={8 * s} fill={s < 1 ? "#B3263E" : "none"} stroke={color} strokeWidth={3} />;
    case "0":
      return <ellipse key={key} cx={cx} cy={cy} rx={5 * s} ry={8 * s} fill="none" stroke={color} strokeWidth={3} />;
    case "^":
      return P("M-7,3 L0,-5 L7,3");
    case "v":
      return P("M-7,-3 L0,5 L7,-3");
    case ">":
      return P("M-5,-6 L5,0 L-5,6");
    case "<":
      return P("M5,-6 L-5,0 L5,6");
    case "-":
      return P("M-7,0 L7,0");
    case "_":
      return P(s < 1 ? "M-7,0 L7,0" : "M-7,4 L7,4");
    case "=":
      return P("M-7,-3 L7,-3 M-7,4 L7,4");
    case "~":
      return P("M-8,1 Q-4,-5 0,0 Q4,5 8,-1");
    case "x":
    case "X":
      return P("M-5,-5 L5,5 M5,-5 L-5,5");
    case "+":
      return P("M-6,0 L6,0 M0,-6 L0,6");
    case "*":
      return star(cx, cy, 0.75 * s, color === INK ? YELLOW : color, key);
    case "★":
    case "☆":
      return star(cx, cy, 0.75 * s, YELLOW, key);
    case "♥":
    case "❤":
      return heart(cx, cy - 1, 0.85 * s, PINK, key);
    case "@":
      return (
        <g key={key} fill="none" stroke={color} strokeWidth={2.6}>
          <circle cx={cx} cy={cy} r={7 * s} />
          <path d={`M${cx},${cy - 3 * s} a${3 * s},${3 * s} 0 1,1 ${-0.1},0`} />
        </g>
      );
    case "T":
      return (
        <g key={key}>
          {P("M-7,-5 L7,-5 M0,-5 L0,5")}
          <path d={`M${cx + 5 * s},${cy + 6 * s} q2,4 0,6 q-2,-2 0,-6`} fill="#6FA8FF" stroke={INK} strokeWidth={1.2} />
        </g>
      );
    case "u":
      return P("M-6,-4 Q-6,6 0,6 Q6,6 6,-4");
    case "'":
      return P("M0,-6 L0,1");
    case ";":
      return (
        <g key={key}>
          <circle cx={cx} cy={cy - 3 * s} r={2.6 * s} fill={color} />
          <path d={`M${cx + 6 * s},${cy + 2 * s} q2,4 0,6 q-2,-2 0,-6`} fill="#6FA8FF" stroke={INK} strokeWidth={1.2} />
        </g>
      );
    case "‿":
      return P("M-7,-2 Q0,6 7,-2");
    case "w":
    case "ω":
      return P("M-8,-3 Q-4,5 0,-1 Q4,5 8,-3");
    case "3":
      return P("M-3,-6 Q5,-6 3,0 Q5,6 -3,6");
    case "D":
      return <path key={key} d={`M${cx - 8 * s},${cy - 3 * s} L${cx + 8 * s},${cy - 3 * s} Q${cx + 8 * s},${cy + 8 * s} ${cx},${cy + 8 * s} Q${cx - 8 * s},${cy + 8 * s} ${cx - 8 * s},${cy - 3 * s} Z`} fill="#B3263E" stroke={color} strokeWidth={2.6} strokeLinejoin="round" />;
    case "P":
      return (
        <g key={key}>
          {P("M-7,-2 L7,-2")}
          <path d={`M${cx - 2},${cy - 2} q0,8 5,8 q5,0 5,-8`} fill="#FF7C9C" stroke={INK} strokeWidth={1.8} />
        </g>
      );
    case "▽":
      return <path key={key} d={`M${cx - 8 * s},${cy - 4 * s} L${cx + 8 * s},${cy - 4 * s} L${cx},${cy + 6 * s} Z`} fill="#B3263E" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />;
    case "△":
      return <path key={key} d={`M${cx - 8 * s},${cy + 4 * s} L${cx + 8 * s},${cy + 4 * s} L${cx},${cy - 6 * s} Z`} fill="#B3263E" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />;
    default:
      return (
        <text key={key} x={cx} y={cy + 6 * s} fontSize={17 * s} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fill={color}>
          {ch}
        </text>
      );
  }
}

// ====================================================================== HATS
/** Hats: drawn over the head; `line` = lowest y the hat covers (hair shows only below it). */
export interface HatDraw {
  line: number;
  back?: ReactNode;
  front: ReactNode;
}

const dome = (fill: string, bottom = 36, key = "dome") => (
  <path key={key} d={`M18,${bottom} C18,8 40,0 60,0 C80,0 102,8 102,${bottom} Z`} fill={fill} {...o} />
);
const fruitHood = (fill: string, rind: string, extra: ReactNode) => ({
  line: 40,
  back: <path key="hb" d="M8,58 C4,10 34,-2 60,-2 C86,-2 116,10 112,58 C112,84 104,96 100,92 L100,52 C96,30 80,20 60,20 C40,20 24,30 20,52 L20,92 C16,96 8,84 8,58 Z" fill={fill} {...o} />,
  front: (
    <g key="hf">
      <path d="M14,46 C14,12 38,2 60,2 C82,2 106,12 106,46 C96,30 80,24 60,24 C40,24 24,30 14,46 Z" fill={fill} {...o} />
      <path d="M18,40 C24,30 40,26 60,26 C80,26 96,30 102,40" fill="none" stroke={rind} strokeWidth={3} />
      {extra}
    </g>
  ),
});

export function drawHat(hat: string, hair: string): HatDraw | null {
  switch (hat) {
    case "beanie":
      return {
        line: 34,
        front: (
          <g>
            {dome("#3C78D8", 34)}
            <rect x={14} y={26} width={92} height={12} rx={6} fill="#2A5BB5" {...o} />
            <path d="M30,30 h8 M46,30 h8 M62,30 h8 M78,30 h8" stroke="#8FB8FF" strokeWidth={2.4} />
          </g>
        ),
      };
    case "knit":
      return {
        line: 36,
        front: (
          <g>
            {dome("#8E5BFF", 36)}
            {[30, 42, 54, 66, 78, 90].map((x) => (
              <path key={x} d={`M${x},6 V30`} stroke="#6A3CD6" strokeWidth={2.4} />
            ))}
            <rect x={14} y={28} width={92} height={12} rx={6} fill="#6A3CD6" {...o} />
            <circle cx={60} cy={0} r={7} fill="#C9B0FF" {...o} />
          </g>
        ),
      };
    case "rainbow":
      return {
        line: 34,
        front: (
          <g>
            <clipPath id="rbclip">
              <path d="M18,34 C18,8 40,0 60,0 C80,0 102,8 102,34 Z" />
            </clipPath>
            <g clipPath="url(#rbclip)">
              <rect x={10} y={-4} width={30} height={40} fill="#3C78D8" />
              <rect x={40} y={-4} width={20} height={40} fill="#FF5C5C" />
              <rect x={60} y={-4} width={20} height={40} fill="#FFD84D" />
              <rect x={80} y={-4} width={30} height={40} fill="#3FD08A" />
            </g>
            <path d="M18,34 C18,8 40,0 60,0 C80,0 102,8 102,34 Z" fill="none" {...o} />
          </g>
        ),
      };
    case "cap":
    case "trucker": {
      const top = hat === "cap" ? "#E2223B" : "#FFFFFF";
      const brim = hat === "cap" ? "#B5172C" : "#2E9E5B";
      return {
        line: 34,
        front: (
          <g>
            {hat === "trucker" && <path d="M18,34 C18,8 40,0 60,0 C80,0 102,8 102,34 Z" fill="#2E9E5B" {...o} />}
            <path d={hat === "trucker" ? "M30,32 C30,10 44,4 60,4 C76,4 90,10 90,32 Z" : "M18,34 C18,8 40,0 60,0 C80,0 102,8 102,34 Z"} fill={top} {...o} />
            <path d="M60,30 L118,32 Q118,42 102,42 L60,40 Z" fill={brim} {...o} />
            <circle cx={60} cy={2} r={3} fill={brim} {...thin} />
          </g>
        ),
      };
    }
    case "propeller":
      return {
        line: 34,
        front: (
          <g>
            <clipPath id="ppclip">
              <path d="M18,34 C18,8 40,4 60,4 C80,4 102,8 102,34 Z" />
            </clipPath>
            <g clipPath="url(#ppclip)">
              <path d="M0,40 L60,0 L40,40 Z" fill="#3C78D8" />
              <path d="M40,40 L60,0 L80,40 Z" fill="#FFD84D" />
              <path d="M80,40 L60,0 L120,40 Z" fill="#E2223B" />
              <rect x={10} y={-4} width={30} height={44} fill="#3C78D8" />
              <rect x={80} y={-4} width={30} height={44} fill="#E2223B" />
            </g>
            <path d="M18,34 C18,8 40,4 60,4 C80,4 102,8 102,34 Z" fill="none" {...o} />
            <rect x={12} y={30} width={96} height={8} rx={4} fill="#3FD08A" {...o} />
            <path d="M60,4 V-6" {...o} />
            <path d="M34,-8 Q60,-14 86,-8 Q60,-2 34,-8 Z" fill="#6FA8FF" {...o} />
          </g>
        ),
      };
    case "bucket":
    case "zebra":
    case "floral":
    case "duck":
    case "frog": {
      const fill = { bucket: "#5CC8C8", zebra: "#FFFFFF", floral: "#FFB6D2", duck: "#FFD84D", frog: "#A6E36A" }[hat]!;
      const brim = { bucket: "#3FA6A6", zebra: "#FF5C9F", floral: "#FF8AC2", duck: "#F2B92C", frog: "#7CC744" }[hat]!;
      return {
        line: 34,
        front: (
          <g>
            <path d="M24,34 L30,6 Q60,-2 90,6 L96,34 Z" fill={fill} {...o} />
            {hat === "zebra" && <path d="M34,10 l8,10 l-6,8 M52,4 l4,12 l-4,10 M70,6 l-4,12 l6,8 M86,12 l-6,10" stroke={INK} strokeWidth={3.4} fill="none" />}
            {hat === "floral" && [36, 52, 68, 84, 44, 76].map((x, i) => <path key={i} d={STAR} transform={`translate(${x},${i > 3 ? 26 : 14}) scale(0.35)`} fill="#FF5C8A" />)}
            {hat === "duck" && (
              <g>
                <ellipse cx={60} cy={20} rx={8} ry={4} fill="#FF8A3D" {...thin} />
                <circle cx={50} cy={13} r={2.4} fill={INK} />
                <circle cx={70} cy={13} r={2.4} fill={INK} />
                <path d="M58,4 q2,-8 6,-4" fill="none" {...thin} />
              </g>
            )}
            {hat === "frog" && (
              <g>
                <circle cx={44} cy={6} r={9} fill={fill} {...o} />
                <circle cx={76} cy={6} r={9} fill={fill} {...o} />
                <circle cx={44} cy={6} r={4} fill={INK} />
                <circle cx={76} cy={6} r={4} fill={INK} />
                <path d="M50,22 Q60,30 70,22" fill="none" {...thin} />
              </g>
            )}
            <path d="M6,40 Q60,24 114,40 Q118,46 108,46 Q60,34 12,46 Q2,46 6,40 Z" fill={brim} {...o} />
          </g>
        ),
      };
    }
    case "sunhat":
      return {
        line: 34,
        front: (
          <g>
            <path d="M28,34 C28,10 42,4 60,4 C78,4 92,10 92,34 Z" fill="#F7D774" {...o} />
            <path d="M-2,42 Q60,16 122,42 Q124,52 110,52 Q60,36 10,52 Q-4,52 -2,42 Z" fill="#F7D774" {...o} />
            <path d="M28,30 Q60,24 92,30" stroke="#FF8AC2" strokeWidth={5} fill="none" />
            {flower(84, 27, "#FF8AC2", "f")}
          </g>
        ),
      };
    case "boater":
      return {
        line: 34,
        front: (
          <g>
            <rect x={28} y={10} width={64} height={24} rx={4} fill="#EAC57A" {...o} />
            <rect x={28} y={24} width={64} height={8} fill="#6B3E26" {...thin} />
            <ellipse cx={60} cy={36} rx={52} ry={8} fill="#EAC57A" {...o} />
            <path d="M14,36 Q60,40 106,36" stroke="#C9A256" strokeWidth={2} fill="none" />
          </g>
        ),
      };
    case "fedora":
      return {
        line: 34,
        front: (
          <g>
            <path d="M28,34 L32,8 Q46,0 60,8 Q74,0 88,8 L92,34 Z" fill="#E9DFC9" {...o} />
            <rect x={29} y={24} width={62} height={8} fill="#8A5A2E" {...thin} />
            <path d="M4,40 Q60,24 116,40 Q118,46 108,46 Q60,34 12,46 Q2,46 4,40 Z" fill="#E9DFC9" {...o} />
          </g>
        ),
      };
    case "party":
      return {
        line: 26,
        front: (
          <g>
            <path d="M40,28 L60,-14 L80,28 Z" fill="#4E9BFF" {...o} />
            <path d="M46,16 L74,10 M50,6 L70,2" stroke={WHITE} strokeWidth={3} />
            <circle cx={60} cy={-14} r={4} fill="#FF5C8A" {...thin} />
            <path d="M40,28 Q60,34 80,28" fill="none" {...thin} />
          </g>
        ),
      };
    case "witch":
      return {
        line: 34,
        front: (
          <g>
            <path d="M32,34 L58,-10 Q70,-16 82,-6 Q70,-8 66,0 L88,34 Z" fill="#6A3CD6" {...o} />
            <rect x={34} y={24} width={52} height={8} fill="#FFD84D" {...thin} />
            <rect x={54} y={23} width={10} height={10} fill="none" stroke="#B5172C" strokeWidth={2.4} />
            <path d="M2,40 Q60,26 118,40 Q120,46 110,46 Q60,36 10,46 Q0,46 2,40 Z" fill="#5A2FBF" {...o} />
          </g>
        ),
      };
    case "grad":
      return {
        line: 34,
        front: (
          <g>
            <path d="M30,34 L30,16 Q60,22 90,16 L90,34 Z" fill="#2A2A44" {...o} />
            <path d="M6,12 L60,-2 L114,12 L60,26 Z" fill="#2A2A44" {...o} />
            <path d="M60,12 L96,18 L96,34" fill="none" stroke={YELLOW} strokeWidth={2.4} />
            <rect x={92} y={32} width={8} height={10} rx={2} fill={YELLOW} {...thin} />
          </g>
        ),
      };
    case "crown":
      return {
        line: 20,
        front: (
          <g>
            <path d="M34,26 L30,0 L44,12 L60,-4 L76,12 L90,0 L86,26 Z" fill={YELLOW} {...o} />
            <circle cx={60} cy={16} r={3.4} fill="#E2223B" {...thin} />
            <circle cx={44} cy={19} r={2.4} fill="#4E9BFF" {...thin} />
            <circle cx={76} cy={19} r={2.4} fill="#4E9BFF" {...thin} />
          </g>
        ),
      };
    case "jewels":
      return {
        line: 24,
        front: (
          <g>
            <path d="M26,30 L24,6 L38,14 L48,2 L60,12 L72,2 L82,14 L96,6 L94,30 Z" fill={YELLOW} {...o} />
            <rect x={26} y={20} width={68} height={10} fill="#F2B92C" {...thin} />
            {[34, 46, 60, 74, 86].map((x, i) => (
              <circle key={x} cx={x} cy={25} r={2.6} fill={i % 2 ? "#5FE0B0" : "#FF5C8A"} {...thin} />
            ))}
            <path d="M60,-6 L64,2 L60,8 L56,2 Z" fill="#5FE0B0" {...thin} />
          </g>
        ),
      };
    case "jester":
      return {
        line: 30,
        front: (
          <g>
            <path d="M22,32 C24,14 14,4 0,10 C14,-6 40,2 48,18 Z" fill="#E2223B" {...o} />
            <path d="M98,32 C96,14 106,4 120,10 C106,-6 80,2 72,18 Z" fill="#3FD08A" {...o} />
            <path d="M40,24 C44,6 52,-10 60,-14 C68,-10 76,6 80,24 Z" fill="#FFD84D" {...o} />
            <path d="M18,36 L102,36 L96,24 L24,24 Z" fill="#3C78D8" {...o} />
            {[0, 120, 60].map((x, i) => (
              <circle key={i} cx={x === 0 ? 0 : x === 120 ? 120 : 60} cy={x === 60 ? -14 : 10} r={4.5} fill={YELLOW} {...thin} />
            ))}
          </g>
        ),
      };
    case "pirate":
      return {
        line: 34,
        front: (
          <g>
            <path d="M8,36 Q20,0 60,4 Q100,0 112,36 Q86,26 60,30 Q34,26 8,36 Z" fill="#2A2A44" {...o} />
            <circle cx={60} cy={18} r={4} fill={WHITE} {...thin} />
            <path d="M54,24 L66,28 M66,24 L54,28" stroke={WHITE} strokeWidth={2} />
            <g transform="translate(92,-2)">
              <ellipse cx={0} cy={4} rx={7} ry={10} fill="#E2223B" {...thin} />
              <circle cx={0} cy={-6} r={6} fill="#E2223B" {...thin} />
              <path d="M4,-6 l6,2 l-6,3 z" fill={YELLOW} {...thin} />
              <circle cx={1} cy={-7} r={1.4} fill={INK} />
              <path d="M-4,10 l-2,8 M2,12 l0,8" stroke="#3C78D8" strokeWidth={3} />
            </g>
          </g>
        ),
      };
    case "viking":
      return {
        line: 36,
        front: (
          <g>
            <path d="M24,22 C14,18 8,6 12,-6 C18,6 26,10 34,12 Z" fill="#F2E6C9" {...o} />
            <path d="M96,22 C106,18 112,6 108,-6 C102,6 94,10 86,12 Z" fill="#F2E6C9" {...o} />
            {dome("#B8BED6", 38)}
            <rect x={16} y={30} width={88} height={10} rx={4} fill="#8B8FA8" {...o} />
            <path d="M60,4 V30" stroke="#8B8FA8" strokeWidth={4} />
            {[26, 44, 76, 94].map((x) => (
              <circle key={x} cx={x} cy={35} r={1.6} fill={INK} />
            ))}
          </g>
        ),
      };
    case "firefighter":
      return {
        line: 34,
        front: (
          <g>
            <path d="M22,34 C22,6 40,0 60,0 C80,0 98,6 98,34 Z" fill="#E2223B" {...o} />
            <path d="M60,2 V32" stroke="#B5172C" strokeWidth={4} />
            <path d="M52,12 h16 v14 l-8,4 l-8,-4 Z" fill={YELLOW} {...thin} />
            <path d="M0,38 Q60,22 120,38 Q122,46 110,46 Q60,34 10,46 Q-2,46 0,38 Z" fill="#B5172C" {...o} />
          </g>
        ),
      };
    case "chef":
      return {
        line: 32,
        front: (
          <g>
            <path d="M30,34 L30,12 C20,10 18,-6 32,-6 C34,-16 52,-16 56,-8 C62,-18 80,-14 80,-6 C96,-8 100,10 90,12 L90,34 Z" fill={WHITE} {...o} />
            <path d="M30,24 H90" stroke="#D6D9E8" strokeWidth={2.4} />
          </g>
        ),
      };
    case "sailor":
      return {
        line: 32,
        front: (
          <g>
            <path d="M24,30 Q24,6 60,6 Q96,6 96,30 Z" fill={WHITE} {...o} />
            <rect x={22} y={26} width={76} height={10} rx={3} fill="#1F4FE0" {...o} />
            <path d="M34,18 h52" stroke="#D6D9E8" strokeWidth={2} />
          </g>
        ),
      };
    case "pear":
      return fruitHood(
        "#C8E36A",
        "#A9C84A",
        <g>
          <path d="M60,2 q2,-8 -2,-12" fill="none" stroke="#6B3E26" strokeWidth={3.4} strokeLinecap="round" />
          <path d="M62,-6 q10,-8 16,0 q-8,6 -16,0 Z" fill="#3FD08A" {...thin} />
        </g>,
      );
    case "melon":
      return fruitHood(
        "#B8F0B0",
        "#86D57E",
        <g>
          <path d="M30,14 L50,34 M50,6 L74,30 M70,6 L90,24 M90,14 L74,30 M70,6 L48,30 M50,6 L30,26" stroke="#86D57E" strokeWidth={2} />
          <rect x={56} y={-8} width={8} height={10} rx={2} fill="#3FD08A" {...thin} />
          <rect x={48} y={-10} width={24} height={4} rx={2} fill="#3FD08A" {...thin} />
        </g>,
      );
    case "orange":
      return fruitHood(
        "#FF9D3D",
        "#E07A1C",
        <g>
          <path d="M60,2 q0,-6 2,-8" fill="none" stroke="#6B3E26" strokeWidth={3} />
          <path d="M62,-6 q12,-8 18,2 q-10,6 -18,-2 Z" fill="#3FD08A" {...thin} />
        </g>,
      );
    case "watermelon":
      return fruitHood(
        "#3FB06A",
        "#2A8A4E",
        <g>
          <path d="M28,10 q6,10 2,22 M46,4 q6,12 2,26 M66,4 q-4,12 0,26 M86,10 q-6,10 -2,22" stroke="#1E6E3A" strokeWidth={3} fill="none" />
          <path d="M60,2 q-2,-8 4,-10 q4,4 0,8" fill="none" stroke="#6B3E26" strokeWidth={2.6} />
        </g>,
      );
    case "strawberry":
      return fruitHood(
        "#F0414E",
        "#C82C38",
        <g>
          {[[34, 14], [48, 8], [62, 6], [76, 10], [88, 16], [40, 24], [56, 18], [72, 20], [86, 28]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.4} ry={2.2} fill="#FFE07A" />
          ))}
          <path d="M40,2 L50,-8 L56,0 L62,-10 L68,0 L76,-8 L82,2 Q60,10 40,2 Z" fill="#3FD08A" {...thin} />
        </g>,
      );
    case "egg":
      return {
        line: 22,
        front: (
          <g>
            <path d="M28,20 C20,12 30,2 42,6 C48,-4 70,-4 76,4 C92,0 100,12 92,20 C84,28 36,28 28,20 Z" fill={WHITE} {...o} />
            <circle cx={62} cy={12} r={9} fill="#FFB31A" {...thin} />
            <circle cx={59} cy={9} r={2.6} fill="#FFE07A" />
          </g>
        ),
      };
    case "pancakes":
      return {
        line: 24,
        front: (
          <g>
            {[22, 14, 6].map((y) => (
              <ellipse key={y} cx={60} cy={y} rx={30} ry={7} fill="#E8B26A" {...o} />
            ))}
            <path d="M44,0 q4,8 0,14 M76,0 q-4,10 2,16" stroke="#8A4B1C" strokeWidth={4} fill="none" />
            <rect x={54} y={-6} width={12} height={8} rx={2} fill="#FFE9A8" {...thin} />
            <circle cx={74} cy={-2} r={3} fill="#E2223B" {...thin} />
          </g>
        ),
      };
    case "eggshell":
      return {
        line: 30,
        front: (
          <g>
            <path d="M22,32 C20,8 40,-6 60,-6 C80,-6 100,8 98,32 L90,26 L82,34 L74,26 L66,34 L58,26 L50,34 L42,26 L34,34 L28,26 Z" fill="#FDF6E7" {...o} />
            <path d="M34,10 h4 M50,4 h4 M70,6 h4 M84,12 h4" stroke="#A6E36A" strokeWidth={3} />
            <path d="M40,16 h4 M60,12 h4 M78,18 h4" stroke="#C9B0FF" strokeWidth={3} />
          </g>
        ),
      };
    case "paperboat":
      return {
        line: 26,
        front: (
          <g>
            <path d="M14,26 L106,26 L92,34 L28,34 Z" fill={WHITE} {...o} />
            <path d="M34,26 L60,-4 L86,26 Z" fill="#F4F6FF" {...o} />
            <path d="M60,-4 V26" stroke="#D6D9E8" strokeWidth={2} />
          </g>
        ),
      };
    case "umbrella":
      return {
        line: 30,
        front: (
          <g>
            <path d="M2,22 Q60,-24 118,22 Q104,14 88,22 Q74,12 60,22 Q46,12 32,22 Q16,14 2,22 Z" fill="#4E9BFF" {...o} />
            <path d="M30,20 Q44,-6 60,-8 M90,20 Q76,-6 60,-8" stroke="#2F6FD6" strokeWidth={2.4} fill="none" />
            <path d="M60,-8 V-14" {...o} />
            <rect x={44} y={22} width={32} height={8} rx={3} fill="#E2223B" {...o} />
            <path d="M14,30 q2,4 0,6 M106,30 q2,4 0,6" stroke="#6FA8FF" strokeWidth={2.4} />
          </g>
        ),
      };
    case "fishbowl":
      return {
        line: 22,
        front: (
          <g>
            <path d="M36,24 C24,10 30,-14 60,-14 C90,-14 96,10 84,24 Z" fill="#BEE9FF" fillOpacity={0.85} {...o} />
            <path d="M40,12 Q60,6 80,12 L82,22 L38,22 Z" fill="#6FC8FF" fillOpacity={0.7} />
            <ellipse cx={58} cy={4} rx={8} ry={5} fill="#FF8A3D" {...thin} />
            <path d="M66,4 l7,-5 v10 z" fill="#FF8A3D" {...thin} />
            <path d="M54,2 v5" stroke={WHITE} strokeWidth={2} />
            <circle cx={55} cy={3} r={1} fill={INK} />
            <rect x={38} y={20} width={44} height={6} rx={3} fill="#F2E6C9" {...thin} />
          </g>
        ),
      };
    case "cat":
      return {
        line: 20,
        front: (
          <g>
            <path d="M24,22 C22,6 50,0 74,4 C96,6 102,18 98,24 Z" fill="#FF9D3D" {...o} />
            <path d="M40,6 q8,6 18,0 M70,6 q6,6 12,0" stroke={WHITE} strokeWidth={5} fill="none" />
            <circle cx={30} cy={12} r={10} fill="#FF9D3D" {...o} />
            <path d="M22,6 L22,-4 L30,2 M34,2 L40,-4 L40,6" fill="#FF9D3D" {...thin} />
            <path d="M25,12 q2,2 4,0 M32,12 q2,2 4,0" stroke={INK} strokeWidth={1.6} fill="none" />
            <path d="M98,22 q14,4 8,16" stroke="#FF9D3D" strokeWidth={6} fill="none" strokeLinecap="round" />
          </g>
        ),
      };
    case "chick":
      return {
        line: 22,
        front: (
          <g>
            <path d="M26,24 C30,10 90,10 94,24 Z" fill="#B08A5A" {...o} />
            <path d="M30,20 l6,-6 M44,16 l4,-8 M62,16 l-2,-8 M78,18 l6,-6" stroke="#8A6A3A" strokeWidth={2.4} />
            <circle cx={60} cy={6} r={12} fill={YELLOW} {...o} />
            <circle cx={56} cy={3} r={1.8} fill={INK} />
            <circle cx={66} cy={3} r={1.8} fill={INK} />
            <path d="M58,8 l3,3 l3,-3 Z" fill="#FF8A3D" {...thin} />
          </g>
        ),
      };
    case "bunnyhood":
    case "froghood":
    case "unicorn": {
      const fill = hat === "bunnyhood" ? "#FFFFFF" : hat === "froghood" ? "#A6E36A" : "#FFFFFF";
      return {
        line: 40,
        back: <path d="M8,60 C4,12 34,-2 60,-2 C86,-2 116,12 112,60 C112,88 104,96 98,90 L98,52 C94,30 80,22 60,22 C40,22 26,30 22,52 L22,90 C16,96 8,88 8,60 Z" fill={fill} {...o} />,
        front: (
          <g>
            {hat === "bunnyhood" && (
              <g>
                <path d="M30,14 C20,-22 40,-26 44,8 Z" fill={fill} {...o} />
                <path d="M90,14 C100,-22 80,-26 76,8 Z" fill={fill} {...o} />
                <path d="M34,8 C30,-12 38,-14 40,6 M86,8 C90,-12 82,-14 80,6" stroke="#FFB6D2" strokeWidth={4} fill="none" />
              </g>
            )}
            {hat === "froghood" && (
              <g>
                <circle cx={36} cy={6} r={12} fill={fill} {...o} />
                <circle cx={84} cy={6} r={12} fill={fill} {...o} />
                <circle cx={36} cy={6} r={6} fill={WHITE} {...thin} />
                <circle cx={84} cy={6} r={6} fill={WHITE} {...thin} />
                <circle cx={37} cy={7} r={3} fill={INK} />
                <circle cx={83} cy={7} r={3} fill={INK} />
                <ellipse cx={24} cy={22} rx={4} ry={2.4} fill="#FF8AC2" />
                <ellipse cx={96} cy={22} rx={4} ry={2.4} fill="#FF8AC2" />
              </g>
            )}
            {hat === "unicorn" && (
              <g>
                <path d="M54,6 L60,-22 L66,6 Z" fill={YELLOW} {...o} />
                <path d="M56,-2 l8,-2 M57,-10 l6,-2" stroke="#F2B92C" strokeWidth={2} />
                <path d="M30,10 L26,-6 L40,4 Z M90,10 L94,-6 L80,4 Z" fill={fill} {...o} />
                <path d="M74,2 C96,-4 112,14 108,40 C104,28 96,20 86,18 C100,30 102,48 96,62 C92,44 84,30 72,24 Z" fill="#B78CFF" {...o} />
              </g>
            )}
            <path d="M14,48 C14,12 38,2 60,2 C82,2 106,12 106,48 C96,32 80,24 60,24 C40,24 24,32 14,48 Z" fill={fill} {...o} />
          </g>
        ),
      };
    }
    case "flowers":
      return {
        line: 20,
        front: (
          <g>
            <path d="M24,26 Q60,10 96,26" fill="none" stroke="#3FB06A" strokeWidth={3} />
            {[[28, 24, "#FF8AC2"], [40, 18, "#FFD84D"], [52, 14, "#FF5C5C"], [64, 14, "#B78CFF"], [76, 17, "#FF8AC2"], [88, 23, "#FFD84D"]].map(([x, y, c], i) =>
              flower(x as number, y as number, c as string, `fl${i}`),
            )}
            <path d="M58,6 q4,-6 8,-2 q-4,4 -8,2" fill="#A6E36A" {...thin} />
          </g>
        ),
      };
    case "halo":
      return { line: 15, front: <ellipse cx={60} cy={4} rx={24} ry={6} fill="none" stroke={YELLOW} strokeWidth={5} /> };
    case "horns":
      return {
        line: 15,
        front: (
          <g fill="#E2223B" {...o}>
            <path d="M32,22 C24,14 24,2 30,-4 C32,6 38,12 44,16 Z" />
            <path d="M88,22 C96,14 96,2 90,-4 C88,6 82,12 76,16 Z" />
          </g>
        ),
      };
  }
  void hair;
  return null;
}

// ====================================================================== MASKS
export interface MaskDraw {
  /** Covers the whole head: hair, hat and face characters are hidden. */
  full?: boolean;
  /** Face characters are drawn (tinted) inside this mask. */
  faceColor?: string;
  back?: ReactNode;
  front: ReactNode;
}

export function drawMask(mask: string): MaskDraw | null {
  const eyeMask = (fill: string, trim: string, extra?: ReactNode): MaskDraw => ({
    front: (
      <g>
        {extra}
        <path d="M18,48 Q40,38 60,50 Q80,38 102,48 Q104,66 86,70 Q72,72 64,62 L56,62 Q48,72 34,70 Q16,66 18,48 Z" fill={fill} {...o} />
        <ellipse cx={EYE_L} cy={EYE_Y} rx={9} ry={7} fill="#2A2A44" {...thin} />
        <ellipse cx={EYE_R} cy={EYE_Y} rx={9} ry={7} fill="#2A2A44" {...thin} />
        <path d={`M${EYE_L - 6},${EYE_Y + 10} l4,6 M${EYE_R + 6},${EYE_Y + 10} l-4,6`} stroke={trim} strokeWidth={3} />
      </g>
    ),
    faceColor: WHITE,
  });
  switch (mask) {
    case "masquerade":
      return eyeMask("#FFF6D6", "#E2223B");
    case "feather":
      return eyeMask(
        "#5CC8B0",
        "#2E8C78",
        <g>
          {[-30, -15, 0, 15, 30].map((a) => (
            <ellipse key={a} cx={60} cy={30} rx={5} ry={18} fill={a ? "#7FE0C8" : "#2E8C78"} {...thin} transform={`rotate(${a} 60 50)`} />
          ))}
        </g>,
      );
    case "owl":
      return eyeMask(
        "#A47CF0",
        "#6A3CD6",
        <g>
          <path d="M40,36 L36,24 L48,32 M80,36 L84,24 L72,32" fill="#6A3CD6" {...thin} />
          <path d="M54,62 L60,76 L66,62 Z" fill="#8FB8FF" {...thin} />
        </g>,
      );
    case "carnival":
      return eyeMask(
        "#B4F0A0",
        "#3FB06A",
        <g>
          {[-24, -8, 8, 24].map((a) => (
            <ellipse key={a} cx={60} cy={30} rx={6} ry={16} fill={a % 16 ? "#FFD84D" : "#3FB06A"} {...thin} transform={`rotate(${a} 60 52)`} />
          ))}
        </g>,
      );
    case "lion":
      return {
        faceColor: INK,
        front: (
          <g>
            <path d="M12,44 C8,20 30,10 44,22 L60,14 L76,22 C90,10 112,20 108,44 C116,56 104,70 92,66 L80,58 L40,58 L28,66 C16,70 4,56 12,44 Z" fill="#E2223B" {...o} />
            <path d="M24,40 Q40,30 52,44 M96,40 Q80,30 68,44" stroke={YELLOW} strokeWidth={4} fill="none" />
            <circle cx={60} cy={22} r={7} fill="#E2223B" {...o} />
            <ellipse cx={EYE_L} cy={EYE_Y - 4} rx={10} ry={8} fill={WHITE} {...thin} />
            <ellipse cx={EYE_R} cy={EYE_Y - 4} rx={10} ry={8} fill={WHITE} {...thin} />
            <path d="M30,62 l6,8 l4,-8 M90,62 l-6,8 l-4,-8" fill={WHITE} {...thin} />
          </g>
        ),
      };
    case "pumpkin":
      return {
        full: true,
        faceColor: "#FFD84D",
        front: (
          <g>
            <path d="M58,14 q-2,-12 6,-14" fill="none" stroke="#3FB06A" strokeWidth={5} strokeLinecap="round" />
            <ellipse cx={40} cy={54} rx={26} ry={36} fill="#FF8A1C" {...o} />
            <ellipse cx={80} cy={54} rx={26} ry={36} fill="#FF8A1C" {...o} />
            <ellipse cx={60} cy={54} rx={22} ry={38} fill="#FF9D3D" {...o} />
            <path d="M34,48 l9,-9 l9,9 Z M68,48 l9,-9 l9,9 Z" fill="#7A2A00" />
            <path d="M36,68 Q60,86 84,68 L76,72 L70,66 L64,74 L56,66 L50,74 L44,66 Z" fill="#7A2A00" />
          </g>
        ),
      };
    case "flower":
      return {
        faceColor: INK,
        back: (
          <g>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return <ellipse key={i} cx={60 + Math.cos(a) * 46} cy={54 + Math.sin(a) * 44} rx={14} ry={10} fill="#FF7A7A" {...o} transform={`rotate(${(a * 180) / Math.PI} ${60 + Math.cos(a) * 46} ${54 + Math.sin(a) * 44})`} />;
            })}
          </g>
        ),
        front: <ellipse cx={60} cy={54} rx={40} ry={37} fill="none" stroke={YELLOW} strokeWidth={6} />,
      };
    case "octopus":
      return {
        full: false,
        faceColor: INK,
        back: (
          <g>
            <path d="M10,60 C2,8 38,-8 60,-6 C82,-8 118,8 110,60 C120,72 112,88 104,82 C108,96 96,104 90,94 L30,94 C24,104 12,96 16,82 C8,88 0,72 10,60 Z" fill="#FF8A3D" {...o} />
            <circle cx={40} cy={10} r={6} fill={WHITE} {...thin} />
            <circle cx={80} cy={10} r={6} fill={WHITE} {...thin} />
            <circle cx={41} cy={11} r={3} fill={INK} />
            <circle cx={79} cy={11} r={3} fill={INK} />
          </g>
        ),
        front: (
          <g>
            <path d="M14,70 C2,84 10,100 22,96 M106,70 C118,84 110,100 98,96" fill="none" stroke="#FF8A3D" strokeWidth={9} strokeLinecap="round" />
            <path d="M14,70 C2,84 10,100 22,96 M106,70 C118,84 110,100 98,96" fill="none" stroke={INK} strokeWidth={2} />
          </g>
        ),
      };
    case "astronaut":
      return {
        full: false,
        faceColor: INK,
        back: <circle cx={60} cy={52} r={50} fill="#F4F6FF" {...o} />,
        front: (
          <g>
            <circle cx={60} cy={52} r={50} fill="#BEE9FF" fillOpacity={0.25} {...o} />
            <path d="M30,22 Q44,10 60,10" stroke={WHITE} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />
            <rect x={22} y={96} width={76} height={10} rx={5} fill="#D6D9E8" {...o} />
          </g>
        ),
      };
    case "snorkel":
      return {
        faceColor: INK,
        front: (
          <g>
            <path d="M14,52 L106,52" stroke={INK} strokeWidth={5} />
            <rect x={26} y={44} width={68} height={26} rx={12} fill="#6FC8FF" fillOpacity={0.55} {...o} />
            <path d="M34,50 l8,-2" stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
            <path d="M100,30 L100,74 Q100,84 88,84 L72,84" fill="none" stroke="#FFD84D" strokeWidth={7} strokeLinecap="round" />
            <path d="M100,30 L100,74 Q100,84 88,84 L72,84" fill="none" stroke={INK} strokeWidth={1.6} />
            <rect x={94} y={22} width={12} height={8} rx={2} fill="#E2223B" {...thin} />
          </g>
        ),
      };
    case "snowglobe":
      return {
        full: false,
        faceColor: INK,
        front: (
          <g>
            <circle cx={60} cy={50} r={50} fill="#DFF2FF" fillOpacity={0.35} {...o} />
            {[[24, 30], [40, 14], [84, 20], [96, 44], [30, 70], [92, 70], [60, 8]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r={2} fill={WHITE} />
            ))}
            <path d="M84,90 l6,-14 l6,14 Z" fill="#3FB06A" {...thin} />
            <path d="M14,92 Q60,104 106,92 L100,106 L20,106 Z" fill="#8A4B1C" {...o} />
          </g>
        ),
      };
    case "knight":
      return {
        full: true,
        faceColor: "#10101E",
        front: (
          <g>
            <path d="M16,60 C14,14 38,4 60,4 C82,4 106,14 104,60 L100,90 L20,90 Z" fill="#C3C8DC" {...o} />
            <path d="M60,4 V90" stroke="#9AA0B8" strokeWidth={3} />
            <rect x={26} y={50} width={68} height={14} rx={4} fill="#2A2A44" {...o} />
            {[34, 44, 76, 86].map((x) => (
              <path key={x} d={`M${x},72 v10`} stroke="#2A2A44" strokeWidth={3} />
            ))}
            <path d="M60,4 C66,-8 80,-10 86,-2" fill="none" stroke="#E2223B" strokeWidth={6} strokeLinecap="round" />
          </g>
        ),
      };
    case "robot":
      return {
        full: true,
        faceColor: "#7DF9FF",
        front: (
          <g>
            <path d="M60,14 V2" {...o} />
            <circle cx={60} cy={0} r={5} fill="#FF5C5C" {...o} />
            <rect x={14} y={14} width={92} height={78} rx={16} fill="#9AA6C8" {...o} />
            <rect x={24} y={34} width={72} height={48} rx={10} fill="#1B2140" {...o} />
            <rect x={8} y={44} width={8} height={22} rx={3} fill="#7C88AA" {...o} />
            <rect x={104} y={44} width={8} height={22} rx={3} fill="#7C88AA" {...o} />
            {[26, 40, 80, 94].map((x) => (
              <circle key={x} cx={x} cy={22} r={2} fill="#5B6688" />
            ))}
          </g>
        ),
      };
    case "tree":
      return {
        faceColor: INK,
        back: (
          <g>
            <path d="M60,-14 L116,96 L4,96 Z" fill="#3FB06A" {...o} />
            <path d="M20,66 Q60,80 100,66 M30,38 Q60,52 90,38" stroke={YELLOW} strokeWidth={2.4} fill="none" />
            {[[22, 64, "#E2223B"], [98, 66, "#4E9BFF"], [36, 36, "#FF8AC2"], [86, 40, YELLOW]].map(([x, y, c], i) => (
              <circle key={i} cx={x as number} cy={y as number} r={4} fill={c as string} {...thin} />
            ))}
            {star(60, -14, 1)}
          </g>
        ),
        front: <ellipse cx={60} cy={56} rx={34} ry={30} fill="none" stroke="#2A8A4E" strokeWidth={4} />,
      };
    case "ninja":
      return {
        faceColor: INK,
        front: (
          <g>
            <path d="M20,64 Q60,58 100,64 L98,84 Q60,96 22,84 Z" fill="#2A2A44" {...o} />
            <path d="M18,40 Q60,30 102,40 L102,48 Q60,40 18,48 Z" fill="#2A2A44" {...o} />
            <path d="M102,42 l12,-6 l-2,10 Z M102,46 l12,6 l-10,4 Z" fill="#2A2A44" {...thin} />
          </g>
        ),
      };
  }
  return null;
}

// ====================================================================== EYEWEAR
export interface EyewearDraw {
  /** Hides the face characters' eyes (opaque lenses). */
  coversEyes?: boolean;
  front: ReactNode;
}

export function drawEyewear(kind: string): EyewearDraw | null {
  const pair = (l: ReactNode, r: ReactNode, bridge = true, arms = true) => (
    <g>
      {arms && <path d={`M19,${EYE_Y - 4} L28,${EYE_Y - 2} M101,${EYE_Y - 4} L92,${EYE_Y - 2}`} stroke={INK} strokeWidth={2.6} />}
      {l}
      {r}
      {bridge && <path d={`M53,${EYE_Y - 1} Q60,${EYE_Y - 6} 67,${EYE_Y - 1}`} fill="none" stroke={INK} strokeWidth={2.6} />}
    </g>
  );
  switch (kind) {
    case "sleep":
      return {
        coversEyes: true,
        front: (
          <g>
            <path d={`M18,${EYE_Y - 4} L102,${EYE_Y - 4}`} stroke="#FFB6D2" strokeWidth={3} />
            <rect x={24} y={EYE_Y - 13} width={72} height={24} rx={12} fill="#FFB6D2" {...o} />
            <path d={`M34,${EYE_Y - 1} q6,5 12,0 M74,${EYE_Y - 1} q6,5 12,0`} stroke={INK} strokeWidth={2.4} fill="none" />
            <path d={`M28,${EYE_Y - 12} l4,-8 l6,6 M92,${EYE_Y - 12} l-4,-8 l-6,6`} fill="#FFB6D2" {...thin} />
            <ellipse cx={60} cy={EYE_Y + 2} rx={6} ry={4} fill="#FF8AC2" {...thin} />
          </g>
        ),
      };
    case "aviator":
      return {
        front: pair(
          <path d={`M28,${EYE_Y - 8} h28 q0,16 -14,16 q-14,0 -14,-16 Z`} fill="#FF9D7A" fillOpacity={0.75} stroke={WHITE} strokeWidth={2.6} />,
          <path d={`M64,${EYE_Y - 8} h28 q0,16 -14,16 q-14,0 -14,-16 Z`} fill="#FF9D7A" fillOpacity={0.75} stroke={WHITE} strokeWidth={2.6} />,
        ),
      };
    case "alien":
      return {
        coversEyes: true,
        front: (
          <g>
            <path d={`M30,${EYE_Y - 8} C24,${EYE_Y - 26} 14,${EYE_Y - 24} 12,${EYE_Y - 14} M90,${EYE_Y - 8} C96,${EYE_Y - 26} 106,${EYE_Y - 24} 108,${EYE_Y - 14}`} stroke="#A6E36A" strokeWidth={3.6} fill="none" strokeLinecap="round" />
            {pair(
              <path d={`M28,${EYE_Y - 8} Q44,${EYE_Y - 10} 54,${EYE_Y - 2} Q50,${EYE_Y + 10} 38,${EYE_Y + 8} Q26,${EYE_Y + 4} 28,${EYE_Y - 8} Z`} fill="#6A3CD6" fillOpacity={0.9} {...thin} />,
              <path d={`M92,${EYE_Y - 8} Q76,${EYE_Y - 10} 66,${EYE_Y - 2} Q70,${EYE_Y + 10} 82,${EYE_Y + 8} Q94,${EYE_Y + 4} 92,${EYE_Y - 8} Z`} fill="#6A3CD6" fillOpacity={0.9} {...thin} />,
            )}
          </g>
        ),
      };
    case "year":
      return {
        front: (
          <g>
            <text x={60} y={EYE_Y - 14} fontSize={17} fontWeight={900} textAnchor="middle" fontFamily="ui-rounded, system-ui, sans-serif" fill="#B78CFF" stroke={INK} strokeWidth={1.6} paintOrder="stroke">
              2026
            </text>
            {pair(<circle cx={EYE_L} cy={EYE_Y} r={11} fill="none" stroke="#8E5BFF" strokeWidth={3.4} />, <circle cx={EYE_R} cy={EYE_Y} r={11} fill="none" stroke="#8E5BFF" strokeWidth={3.4} />)}
            {star(22, EYE_Y - 14, 0.4)}
            {star(98, EYE_Y - 14, 0.4)}
          </g>
        ),
      };
    case "hearts":
      return {
        coversEyes: true,
        front: pair(
          <path d={HEART} transform={`translate(${EYE_L},${EYE_Y + 1}) scale(1.35)`} fill="#8FA8FF" stroke="#D63A8A" strokeWidth={2} />,
          <path d={HEART} transform={`translate(${EYE_R},${EYE_Y + 1}) scale(1.35)`} fill="#8FA8FF" stroke="#D63A8A" strokeWidth={2} />,
        ),
      };
    case "round":
      return {
        coversEyes: true,
        front: pair(
          <circle cx={EYE_L} cy={EYE_Y} r={11} fill="#E8509B" stroke={INK} strokeWidth={2.6} />,
          <circle cx={EYE_R} cy={EYE_Y} r={11} fill="#E8509B" stroke={INK} strokeWidth={2.6} />,
        ),
      };
    case "shutter":
      return {
        coversEyes: true,
        front: (
          <g>
            <path d={`M26,${EYE_Y - 10} Q60,${EYE_Y - 14} 94,${EYE_Y - 10} L92,${EYE_Y + 8} Q76,${EYE_Y + 12} 64,${EYE_Y + 6} L56,${EYE_Y + 6} Q44,${EYE_Y + 12} 28,${EYE_Y + 8} Z`} fill={WHITE} {...o} />
            {[-5, 0, 5].map((d) => (
              <path key={d} d={`M30,${EYE_Y + d} H90`} stroke={INK} strokeWidth={2.4} />
            ))}
          </g>
        ),
      };
    case "shades":
      return {
        coversEyes: true,
        front: (
          <g>
            <path d={`M22,${EYE_Y - 8} L98,${EYE_Y - 8}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
            <path d={`M26,${EYE_Y - 8} h28 v6 q0,10 -14,10 q-14,0 -14,-10 Z`} fill="#1E1E2E" {...thin} />
            <path d={`M66,${EYE_Y - 8} h28 v6 q0,10 -14,10 q-14,0 -14,-10 Z`} fill="#1E1E2E" {...thin} />
            <path d={`M32,${EYE_Y - 4} l7,0 M72,${EYE_Y - 4} l7,0`} stroke={WHITE} strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
          </g>
        ),
      };
    case "cateye":
      return {
        coversEyes: true,
        front: pair(
          <path d={`M24,${EYE_Y - 10} L54,${EYE_Y - 4} Q52,${EYE_Y + 8} 40,${EYE_Y + 6} Q28,${EYE_Y + 4} 24,${EYE_Y - 10} Z`} fill="#A47CF0" {...thin} />,
          <path d={`M96,${EYE_Y - 10} L66,${EYE_Y - 4} Q68,${EYE_Y + 8} 80,${EYE_Y + 6} Q92,${EYE_Y + 4} 96,${EYE_Y - 10} Z`} fill="#A47CF0" {...thin} />,
        ),
      };
    case "bold":
      return {
        coversEyes: true,
        front: pair(
          <path d={`M27,${EYE_Y - 9} Q42,${EYE_Y - 14} 56,${EYE_Y - 8} Q56,${EYE_Y + 10} 41,${EYE_Y + 10} Q26,${EYE_Y + 10} 27,${EYE_Y - 9} Z`} fill="#2A2A6E" stroke={WHITE} strokeWidth={3.4} />,
          <path d={`M93,${EYE_Y - 9} Q78,${EYE_Y - 14} 64,${EYE_Y - 8} Q64,${EYE_Y + 10} 79,${EYE_Y + 10} Q94,${EYE_Y + 10} 93,${EYE_Y - 9} Z`} fill="#2A2A6E" stroke={WHITE} strokeWidth={3.4} />,
        ),
      };
    case "nerd":
      return {
        front: pair(
          <rect x={30} y={EYE_Y - 10} width={26} height={20} rx={6} fill={WHITE} fillOpacity={0.18} stroke={INK} strokeWidth={3.4} />,
          <rect x={64} y={EYE_Y - 10} width={26} height={20} rx={6} fill={WHITE} fillOpacity={0.18} stroke={INK} strokeWidth={3.4} />,
        ),
      };
    case "monocle":
      return {
        front: (
          <g>
            <circle cx={EYE_R} cy={EYE_Y} r={12} fill={WHITE} fillOpacity={0.2} stroke={YELLOW} strokeWidth={3.4} />
            <path d={`M${EYE_R + 10},${EYE_Y + 8} Q96,84 88,100`} fill="none" stroke={YELLOW} strokeWidth={1.8} />
          </g>
        ),
      };
    case "ski":
      return {
        coversEyes: true,
        front: (
          <g>
            <path d={`M16,${EYE_Y} L104,${EYE_Y}`} stroke="#3C78D8" strokeWidth={6} />
            <rect x={24} y={EYE_Y - 12} width={72} height={24} rx={12} fill="#9EE7FF" {...o} />
            <path d={`M28,${EYE_Y - 4} Q60,${EYE_Y - 16} 92,${EYE_Y - 4}`} stroke={WHITE} strokeWidth={3} fill="none" opacity={0.85} />
            <path d={`M56,${EYE_Y + 12} q4,-6 8,0`} fill="#FFD9E8" {...thin} />
          </g>
        ),
      };
    case "star":
      return {
        coversEyes: true,
        front: pair(star(EYE_L, EYE_Y, 1.3, "#FFD84D"), star(EYE_R, EYE_Y, 1.3, "#FFD84D")),
      };
  }
  return null;
}

// ====================================================================== ACCESSORIES
export interface AccessoryDraw {
  back?: ReactNode;
  /** Drawn over the body (belts, collars, bow ties). */
  body?: ReactNode;
  /** Drawn over the face (bandage, mustache, face mask). */
  face?: ReactNode;
  /** Drawn over the head and hat (headbands, ears). */
  head?: ReactNode;
  /** Held in the free (left) hand. */
  hand?: (x: number, y: number) => ReactNode;
}

export function drawAccessory(kind: string): AccessoryDraw | null {
  switch (kind) {
    case "bandage":
      return {
        face: (
          <g transform="translate(86,74) rotate(-30)">
            <rect x={-10} y={-4} width={20} height={8} rx={3} fill="#F2C48A" {...thin} />
            <rect x={-4} y={-10} width={8} height={20} rx={3} fill="#F2C48A" {...thin} />
            <rect x={-3} y={-3} width={6} height={6} fill="#E8A866" />
          </g>
        ),
      };
    case "wings":
      return {
        back: (
          <g fill="#BEE9FF" fillOpacity={0.9} {...o}>
            <path d="M34,92 C10,60 -4,70 4,96 C-6,110 18,120 32,104 Z" />
            <path d="M86,92 C110,60 124,70 116,96 C126,110 102,120 88,104 Z" />
          </g>
        ),
      };
    case "angel":
      return {
        back: (
          <g fill={WHITE} {...o}>
            <path d="M34,94 C14,74 0,82 2,98 C-2,104 6,108 10,106 C4,112 14,118 22,112 C22,118 32,118 34,106 Z" />
            <path d="M86,94 C106,74 120,82 118,98 C122,104 114,108 110,106 C116,112 106,118 98,112 C98,118 88,118 86,106 Z" />
          </g>
        ),
      };
    case "cupid":
      return {
        face: (
          <g>
            <path d="M8,30 L30,44" stroke="#8A5A2E" strokeWidth={3} />
            <path d="M8,30 l-2,-6 l6,2 Z" fill="#C9B0FF" {...thin} />
            {heart(98, 74, 0.8)}
            <path d="M92,70 L116,62" stroke="#8A5A2E" strokeWidth={3} />
            <path d="M116,62 l4,-4 l0,6 Z" fill="#C9B0FF" {...thin} />
          </g>
        ),
      };
    case "lollipop":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x},${y} L${x - 4},${y - 30}`} stroke={WHITE} strokeWidth={4} strokeLinecap="round" />
            <path d={`M${x},${y} L${x - 4},${y - 30}`} stroke={INK} strokeWidth={1.4} />
            {heart(x - 5, y - 36, 1.2, "#FF7CA8")}
          </g>
        ),
      };
    case "earmuffs":
      return {
        head: (
          <g>
            <path d="M18,56 C14,12 106,12 102,56" fill="none" stroke="#B78CFF" strokeWidth={5} />
            <circle cx={18} cy={60} r={11} fill={WHITE} {...o} />
            <circle cx={102} cy={60} r={11} fill={WHITE} {...o} />
          </g>
        ),
        body: (
          <g>
            <rect x={30} y={78} width={60} height={12} rx={6} fill="#8E5BFF" {...o} />
            <path d="M74,86 L80,110 L90,106 L84,86 Z" fill="#6A3CD6" {...o} />
          </g>
        ),
      };
    case "beltbag":
      return {
        body: (
          <g>
            <path d="M28,92 L92,112" stroke="#3FB06A" strokeWidth={5} />
            <rect x={60} y={98} width={24} height={18} rx={4} fill="#3FD08A" {...o} />
            <rect x={68} y={104} width={8} height={5} rx={1} fill={YELLOW} {...thin} />
          </g>
        ),
      };
    case "flamingo":
      return {
        body: (
          <g>
            <ellipse cx={60} cy={112} rx={44} ry={12} fill="#FF8AC2" {...o} />
            <ellipse cx={60} cy={110} rx={30} ry={5} fill="#FFB6D2" />
            <path d="M98,108 C112,96 108,74 96,74 C88,74 86,84 92,88" fill="none" stroke="#FF8AC2" strokeWidth={8} strokeLinecap="round" />
            <path d="M98,108 C112,96 108,74 96,74 C88,74 86,84 92,88" fill="none" stroke={INK} strokeWidth={1.6} />
            <path d="M90,86 l-6,4 l6,2 Z" fill={INK} />
          </g>
        ),
      };
    case "flag":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x},${y + 4} L${x},${y - 46}`} stroke="#C9A256" strokeWidth={3.4} strokeLinecap="round" />
            {["#FF5C5C", "#FF9D3D", "#FFD84D", "#3FD08A", "#4E9BFF", "#8E5BFF"].map((c, i) => (
              <rect key={c} x={x} y={y - 46 + i * 4} width={30} height={4} fill={c} />
            ))}
            <rect x={x} y={y - 46} width={30} height={24} fill="none" {...thin} />
          </g>
        ),
      };
    case "bell":
      return {
        body: (
          <g>
            <path d="M32,84 Q60,92 88,84" stroke="#8FB8FF" strokeWidth={6} fill="none" strokeLinecap="round" />
            <circle cx={60} cy={94} r={6} fill={YELLOW} {...thin} />
            <path d="M56,96 h8" stroke={INK} strokeWidth={1.4} />
            <path d="M48,84 l-8,-6 l2,10 Z M48,84 l8,-6 l-2,10 Z" fill="#8FB8FF" {...thin} />
          </g>
        ),
      };
    case "headband":
      return {
        head: (
          <g>
            <path d="M20,40 C26,14 94,14 100,40" fill="none" stroke="#FF8AC2" strokeWidth={5} />
            <path d="M86,22 l10,-8 l2,10 Z M86,22 l-2,-12 l10,6 Z" fill="#FF5C8A" {...thin} />
            <circle cx={88} cy={20} r={3} fill="#FF5C8A" {...thin} />
          </g>
        ),
      };
    case "balloon":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x},${y} C${x - 10},${y - 20} ${x + 6},${y - 40} ${x - 2},${y - 60}`} fill="none" stroke={INK} strokeWidth={1.4} />
            {heart(x - 2, y - 72, 1.6, "#FF5C8A")}
          </g>
        ),
      };
    case "antlers":
      return {
        head: (
          <g fill="none" stroke="#8A5A2E" strokeWidth={5} strokeLinecap="round">
            <path d="M34,22 L28,0 M30,8 L20,4 M29,4 L34,-6" />
            <path d="M86,22 L92,0 M90,8 L100,4 M91,4 L86,-6" />
          </g>
        ),
        face: <circle cx={60} cy={67} r={4.5} fill="#E2223B" {...thin} />,
      };
    case "bunny":
      return {
        head: (
          <g>
            <path d="M40,22 C30,-18 48,-24 52,16 Z" fill={WHITE} {...o} />
            <path d="M80,22 C90,-18 72,-24 68,16 Z" fill={WHITE} {...o} />
            <path d="M43,12 C40,-8 46,-10 48,10 M77,12 C80,-8 74,-10 72,10" stroke="#FFB6D2" strokeWidth={3.4} fill="none" />
          </g>
        ),
      };
    case "pinkbow":
      return {
        head: (
          <g fill="#FF8AC2" {...o}>
            <path d="M84,20 L68,8 L68,30 Z" />
            <path d="M84,20 L100,8 L100,30 Z" />
            <circle cx={84} cy={20} r={5} fill="#FF5C8A" />
          </g>
        ),
      };
    case "bowtie":
      return {
        body: (
          <g fill="#E2223B" {...o}>
            <path d="M60,88 L46,80 L46,96 Z" />
            <path d="M60,88 L74,80 L74,96 Z" />
            <circle cx={60} cy={88} r={4} />
          </g>
        ),
      };
    case "facemask":
      return {
        face: (
          <g>
            <path d="M24,66 L34,70 M96,66 L86,70" stroke={WHITE} strokeWidth={2} />
            <path d="M34,64 Q60,58 86,64 L84,82 Q60,90 36,82 Z" fill="#8FC4FF" {...o} />
            <path d="M40,70 Q60,66 80,70 M40,76 Q60,72 80,76" stroke="#5E9BE0" strokeWidth={1.8} fill="none" />
          </g>
        ),
      };
    case "mustache":
      return {
        face: <path d="M60,70 C52,62 40,64 34,72 C30,76 26,74 26,70 C26,78 38,82 46,76 C52,72 56,72 60,72 C64,72 68,72 74,76 C82,82 94,78 94,70 C94,74 90,76 86,72 C80,64 68,62 60,70 Z" fill="#6B3E26" {...thin} />,
      };
    case "wand":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x},${y} L${x - 8},${y - 34}`} stroke="#8A5A2E" strokeWidth={3.4} strokeLinecap="round" />
            {star(x - 9, y - 40, 1)}
            <circle cx={x - 20} cy={y - 48} r={1.6} fill={YELLOW} />
            <circle cx={x + 2} cy={y - 50} r={1.2} fill={YELLOW} />
          </g>
        ),
      };
    case "backpack":
      return {
        back: (
          <g>
            <rect x={78} y={80} width={30} height={38} rx={8} fill="#FF8A3D" {...o} />
            <rect x={84} y={96} width={18} height={12} rx={3} fill="#E07A1C" {...thin} />
          </g>
        ),
        body: <path d="M40,84 L44,112 M80,84 L76,112" stroke="#E07A1C" strokeWidth={4} />,
      };
    case "headphones":
      return {
        head: (
          <g>
            <path d="M16,56 C14,8 106,8 104,56" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
            <path d="M16,56 C14,8 106,8 104,56" fill="none" stroke="#5FE0B0" strokeWidth={3} strokeLinecap="round" />
            <rect x={8} y={46} width={16} height={26} rx={7} fill="#5FE0B0" {...o} />
            <rect x={96} y={46} width={16} height={26} rx={7} fill="#5FE0B0" {...o} />
          </g>
        ),
      };
    case "pickaxe":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x + 4},${y + 6} L${x - 10},${y - 34}`} stroke="#8A5A2E" strokeWidth={4} strokeLinecap="round" />
            <path d={`M${x - 28},${y - 30} Q${x - 10},${y - 44} ${x + 8},${y - 34} Q${x - 10},${y - 38} ${x - 28},${y - 30} Z`} fill="#B8BED6" {...thin} />
          </g>
        ),
      };
    case "sword":
      return {
        hand: (x, y) => (
          <g>
            <path d={`M${x - 2},${y - 6} L${x - 8},${y - 48} L${x - 2},${y - 54} L${x + 2},${y - 48} Z`} fill="#E8C089" {...thin} />
            <rect x={x - 12} y={y - 10} width={20} height={5} rx={2} fill="#8A5A2E" {...thin} />
          </g>
        ),
      };
    case "skis":
      return {
        back: (
          <g>
            <rect x={94} y={60} width={7} height={64} rx={3} fill="#4E9BFF" {...thin} transform="rotate(14 98 92)" />
            <rect x={102} y={60} width={7} height={64} rx={3} fill="#8FB8FF" {...thin} transform="rotate(20 106 92)" />
          </g>
        ),
      };
  }
  return null;
}

// ====================================================================== OUTFITS
export interface OutfitDraw {
  top: string;
  sleeve: string;
  legs: string;
  boots: string;
  /** Costume hood around the face: hides hair and draws behind the head. */
  hood?: ReactNode;
  back?: ReactNode;
  /** Drawn on top of the torso, clipped to it. */
  torso?: ReactNode;
  /** Drawn over the torso, not clipped. */
  front?: ReactNode;
}

const torsoStripes = (c: string, ys: number[], h = 5) => ys.map((y) => <rect key={y} x={26} y={y} width={68} height={h} fill={c} />);

export function drawOutfit(kind: string): OutfitDraw {
  const base: OutfitDraw = { top: "#F8F5FF", sleeve: "#F8F5FF", legs: "#3C5A9A", boots: "#2A2A44" };
  const suitHood = (fill: string, extra?: ReactNode) => (
    <g>
      <path d="M6,62 C0,8 34,-6 60,-6 C86,-6 120,8 114,62 C114,90 104,100 96,96 L24,96 C16,100 6,90 6,62 Z" fill={fill} {...o} />
      {extra}
    </g>
  );
  switch (kind) {
    case "hoodie":
      return { top: "#8E5BFF", sleeve: "#8E5BFF", legs: "#2A2A44", boots: "#F8F5FF", front: <g><path d="M38,84 Q60,96 82,84" stroke="#6A3CD6" strokeWidth={4} fill="none" /><path d="M52,90 v12 M68,90 v12" stroke={WHITE} strokeWidth={2} /><rect x={44} y={104} width={32} height={10} rx={4} fill="#7A48E8" {...thin} /></g> };
    case "puffer":
      return { top: "#FF8A3D", sleeve: "#FF8A3D", legs: "#2A2A44", boots: "#6B3E26", torso: <g>{[92, 102, 112].map((y) => <path key={y} d={`M26,${y} H94`} stroke="#D96A20" strokeWidth={2.4} />)}<path d="M60,82 V118" stroke="#D96A20" strokeWidth={3} /></g>, front: <rect x={36} y={78} width={48} height={10} rx={5} fill="#FF9D5C" {...o} /> };
    case "overalls":
      return { ...base, top: "#FFD84D", legs: "#3C78D8", torso: <g><rect x={40} y={94} width={40} height={30} fill="#3C78D8" /><path d="M40,94 L36,82 M80,94 L84,82" stroke="#3C78D8" strokeWidth={5} /><circle cx={44} cy={98} r={2.4} fill={YELLOW} /><circle cx={76} cy={98} r={2.4} fill={YELLOW} /><rect x={52} y={100} width={16} height={8} fill="#2F64C0" /></g> };
    case "tuxedo":
      return { top: "#1E1E2E", sleeve: "#1E1E2E", legs: "#1E1E2E", boots: "#10101E", torso: <g><path d="M48,80 L60,104 L72,80 Z" fill={WHITE} /><circle cx={60} cy={108} r={1.8} fill={WHITE} /><circle cx={60} cy={114} r={1.8} fill={WHITE} /></g>, front: <g fill="#E2223B" {...thin}><path d="M60,86 L52,82 L52,90 Z" /><path d="M60,86 L68,82 L68,90 Z" /></g> };
    case "sailor":
      return { top: WHITE, sleeve: WHITE, legs: "#1F4FE0", boots: "#2A2A44", front: <g><path d="M34,82 L60,98 L86,82 L84,92 L60,106 L36,92 Z" fill="#1F4FE0" {...thin} /><path d="M56,100 l4,10 l4,-10 Z" fill="#E2223B" {...thin} /></g> };
    case "stripes":
      return { top: WHITE, sleeve: WHITE, legs: "#2A2A44", boots: "#10101E", torso: <g>{torsoStripes("#1E1E2E", [88, 98, 108])}</g>, front: <path d="M44,82 L60,92 L76,82 L70,96 L60,90 L50,96 Z" fill="#E2223B" {...thin} /> };
    case "karate":
      return { top: WHITE, sleeve: WHITE, legs: WHITE, boots: "#F6C9A3", torso: <path d="M40,80 L64,104 M80,80 L56,104" stroke="#D6D9E8" strokeWidth={3} />, front: <g><rect x={30} y={104} width={60} height={7} fill={INK} /><path d="M56,110 l-6,12 M64,110 l6,12" stroke={INK} strokeWidth={5} /></g> };
    case "cheer":
      return { top: WHITE, sleeve: WHITE, legs: "#3C78D8", boots: WHITE, torso: <g><path d="M30,96 L60,110 L90,96 L90,104 L60,118 L30,104 Z" fill="#3C78D8" /><text x={60} y={96} fontSize={12} fontWeight={900} textAnchor="middle" fill="#3C78D8">GO!</text></g>, front: <g><circle cx={14} cy={116} r={10} fill={WHITE} {...thin} /><circle cx={106} cy={116} r={10} fill={WHITE} {...thin} /></g> };
    case "jersey":
      return { top: "#E2223B", sleeve: "#E2223B", legs: WHITE, boots: "#10101E", torso: <g><path d="M48,80 L60,90 L72,80" stroke={WHITE} strokeWidth={3} fill="none" /><text x={60} y={110} fontSize={18} fontWeight={900} textAnchor="middle" fill={WHITE} stroke={INK} strokeWidth={1} paintOrder="stroke">10</text></g> };
    case "jersey2":
      return { top: "#8FD0FF", sleeve: "#8FD0FF", legs: "#1E1E2E", boots: "#10101E", torso: <g>{[34, 50, 66, 82].map((x) => <rect key={x} x={x} y={80} width={6} height={40} fill={WHITE} />)}<path d="M48,80 L60,90 L72,80" stroke="#1E1E2E" strokeWidth={3} fill="none" /></g> };
    case "sweater":
      return { top: "#3FB06A", sleeve: "#3FB06A", legs: "#2A2A44", boots: "#8A5A2E", torso: <g><rect x={26} y={92} width={68} height={12} fill={WHITE} />{[34, 46, 58, 70, 82].map((x) => <path key={x} d={`M${x},102 l4,-8 l4,8 Z`} fill="#3FB06A" />)}<path d="M26,88 H94 M26,108 H94" stroke="#E2223B" strokeWidth={2} /></g> };
    case "tang":
      return { top: "#E2223B", sleeve: "#E2223B", legs: "#1E1E2E", boots: "#10101E", torso: <g>{[90, 98, 106].map((y) => <path key={y} d={`M54,${y} h12`} stroke={YELLOW} strokeWidth={2.4} />)}<path d="M60,82 V118" stroke={YELLOW} strokeWidth={2} />{[[38, 96], [82, 106], [40, 112]].map(([x, y]) => flower(x, y, "#FFB31A", `t${x}`))}</g> };
    case "santa":
      return { top: "#E2223B", sleeve: "#E2223B", legs: "#E2223B", boots: "#10101E", torso: <g><rect x={56} y={80} width={8} height={40} fill={WHITE} /></g>, front: <g><rect x={30} y={104} width={60} height={8} fill={INK} /><rect x={54} y={102} width={12} height={12} rx={2} fill="none" stroke={YELLOW} strokeWidth={2.4} /></g> };
    case "chefcoat":
      return { top: WHITE, sleeve: WHITE, legs: "#2A2A44", boots: "#10101E", torso: <g>{[[48, 92], [72, 92], [48, 104], [72, 104]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={2} fill="#8B8FA8" />)}<path d="M60,82 V118" stroke="#D6D9E8" strokeWidth={2} /></g>, front: <path d="M40,80 Q60,88 80,80" stroke="#E2223B" strokeWidth={5} fill="none" /> };
    case "labcoat":
      return { top: WHITE, sleeve: WHITE, legs: "#3C5A9A", boots: "#2A2A44", torso: <g><path d="M48,80 L56,100 L60,118 M72,80 L64,100 L60,118" stroke="#D6D9E8" strokeWidth={3} fill="none" /><rect x={70} y={96} width={12} height={10} fill="none" stroke="#D6D9E8" strokeWidth={2} /><path d="M74,94 v6" stroke="#4E9BFF" strokeWidth={2} /></g>, back: <path d="M30,100 L26,132 L94,132 L90,100 Z" fill={WHITE} {...o} /> };
    case "astro":
      return { top: "#F4F6FF", sleeve: "#F4F6FF", legs: "#F4F6FF", boots: "#8B8FA8", torso: <g><rect x={44} y={92} width={32} height={18} rx={4} fill="#D6D9E8" /><circle cx={52} cy={101} r={3} fill="#E2223B" /><circle cx={62} cy={101} r={3} fill="#3FD08A" /><rect x={68} y={98} width={5} height={6} fill="#4E9BFF" /></g>, back: <rect x={26} y={80} width={68} height={40} rx={10} fill="#D6D9E8" {...o} /> };
    case "hazmat":
      return { top: "#FFD84D", sleeve: "#FFD84D", legs: "#FFD84D", boots: "#2A2A44", hood: suitHood("#FFD84D"), torso: <path d="M60,82 V118" stroke="#E0B820" strokeWidth={3} />, front: <rect x={30} y={112} width={60} height={6} fill="#2A2A44" /> };
    case "wizard":
      return { top: "#4B2E9A", sleeve: "#4B2E9A", legs: "#4B2E9A", boots: "#2A2A44", torso: <g>{star(42, 96, 0.5)}{star(76, 104, 0.6)}{star(54, 112, 0.4)}<path d="M64,90 a5,5 0 1,0 6,6 a4,4 0 1,1 -6,-6" fill={YELLOW} /></g>, back: <path d="M28,98 L22,136 L98,136 L92,98 Z" fill="#4B2E9A" {...o} /> };
    case "vampire":
      return { top: "#1E1E2E", sleeve: "#1E1E2E", legs: "#1E1E2E", boots: "#10101E", back: <path d="M26,82 C10,100 6,124 4,138 L116,138 C114,124 110,100 94,82 Z" fill="#8E1F2E" {...o} />, front: <g><path d="M26,82 L14,66 L36,78 M94,82 L106,66 L84,78" fill="#5A1020" {...o} /><path d="M50,80 L60,96 L70,80" fill={WHITE} {...thin} /></g> };
    case "skeleton":
      return { top: "#1E1E2E", sleeve: "#1E1E2E", legs: "#1E1E2E", boots: "#10101E", torso: <g><path d="M60,84 V114" stroke={WHITE} strokeWidth={4} />{[92, 100, 108].map((y) => <path key={y} d={`M42,${y} Q60,${y - 4} 78,${y}`} stroke={WHITE} strokeWidth={3.4} fill="none" />)}</g> };
    case "mummy":
      return { top: "#F2E6C9", sleeve: "#F2E6C9", legs: "#F2E6C9", boots: "#D9CBA8", torso: <g>{[86, 96, 106, 114].map((y, i) => <path key={y} d={`M26,${y + (i % 2 ? 4 : 0)} L94,${y + (i % 2 ? 0 : 4)}`} stroke="#C9B88E" strokeWidth={2.6} />)}</g> };
    case "ghost":
      return { top: WHITE, sleeve: WHITE, legs: WHITE, boots: WHITE, hood: suitHood(WHITE), back: <path d="M14,70 L10,136 L26,128 L42,138 L60,128 L78,138 L94,128 L110,136 L106,70 Z" fill={WHITE} {...o} /> };
    case "dino":
      return {
        top: "#3FB06A",
        sleeve: "#3FB06A",
        legs: "#3FB06A",
        boots: "#2E8C50",
        hood: suitHood("#3FB06A", <g>{[[30, 0], [46, -8], [62, -10], [78, -8], [94, 0]].map(([x, y]) => <path key={x} d={`M${x - 6},${y + 6} L${x},${y - 6} L${x + 6},${y + 6} Z`} fill="#FFD84D" {...thin} />)}</g>),
        back: <path d="M86,110 C106,112 118,96 116,82 C112,96 100,104 88,100 Z" fill="#3FB06A" {...o} />,
        torso: <ellipse cx={60} cy={104} rx={18} ry={14} fill="#FFE59A" />,
      };
    case "yeti":
      return { top: "#DDE8FF", sleeve: "#DDE8FF", legs: "#DDE8FF", boots: "#B9C9F0", hood: suitHood("#DDE8FF", <path d="M8,40 l-6,-4 l8,-2 M112,40 l6,-4 l-8,-2 M30,4 l-2,-8 l6,4 M90,4 l2,-8 l-6,4" stroke="#B9C9F0" strokeWidth={3} />), torso: <path d="M44,100 l4,6 l4,-6 l4,6 l4,-6 l4,6 l4,-6 l4,6" stroke="#B9C9F0" strokeWidth={2.4} fill="none" /> };
    case "dalmatian":
      return { top: WHITE, sleeve: WHITE, legs: WHITE, boots: "#1E1E2E", hood: suitHood(WHITE, <g><path d="M10,30 C-6,40 2,70 14,70 Z M110,30 C126,40 118,70 106,70 Z" fill="#1E1E2E" {...thin} /><circle cx={36} cy={8} r={5} fill={INK} /><circle cx={86} cy={12} r={4} fill={INK} /></g>), torso: <g>{[[40, 92, 4], [74, 98, 5], [52, 110, 3], [84, 112, 3]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill={INK} />)}</g> };
    case "bee":
      return { top: YELLOW, sleeve: "#1E1E2E", legs: "#1E1E2E", boots: "#1E1E2E", torso: <g>{torsoStripes("#1E1E2E", [92, 106], 7)}</g>, back: <g fill="#DFF2FF" fillOpacity={0.9} {...o}><ellipse cx={22} cy={86} rx={14} ry={9} transform="rotate(-30 22 86)" /><ellipse cx={98} cy={86} rx={14} ry={9} transform="rotate(30 98 86)" /></g>, front: <g stroke={INK} strokeWidth={2.4}><path d="M44,22 L36,4" /><path d="M76,22 L84,4" /><circle cx={36} cy={4} r={3.4} fill={INK} /><circle cx={84} cy={4} r={3.4} fill={INK} /></g> };
    case "banana":
      return { top: "#FFE15A", sleeve: "#FFE15A", legs: "#FFE15A", boots: "#8A5A2E", hood: suitHood("#FFE15A", <g><path d="M56,-6 L60,-18 L70,-14 L66,-4 Z" fill="#8A5A2E" {...thin} /><path d="M100,30 Q110,60 104,92" stroke="#E8C23A" strokeWidth={3} fill="none" /></g>) };
    case "broccoli":
      return {
        top: "#7CC744",
        sleeve: "#7CC744",
        legs: "#A6E36A",
        boots: "#5E9E2E",
        hood: (
          <g>
            {[[14, 40], [26, 14], [46, 0], [70, -2], [92, 10], [106, 36], [110, 62], [10, 64]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={18} fill={i % 2 ? "#3FB06A" : "#2E9E5B"} {...o} />
            ))}
          </g>
        ),
      };
    case "popcorn":
      return {
        top: WHITE,
        sleeve: WHITE,
        legs: "#2A2A44",
        boots: "#10101E",
        back: (
          <g>
            {[[20, 70], [36, 62], [56, 60], [76, 62], [96, 68], [28, 80], [92, 80]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={11} fill="#FFF3C4" {...o} />
            ))}
          </g>
        ),
        torso: <g>{[30, 46, 62, 78].map((x) => <rect key={x} x={x} y={80} width={8} height={40} fill="#E2223B" />)}</g>,
      };
    case "hotdog":
      return {
        top: "#E8A15A",
        sleeve: "#E8A15A",
        legs: "#E8A15A",
        boots: "#B8742E",
        hood: suitHood("#E8A15A", <path d="M18,20 Q30,4 44,18 Q56,4 70,18 Q82,4 100,20" stroke="#FFD84D" strokeWidth={4} fill="none" />),
        back: <rect x={10} y={40} width={100} height={92} rx={36} fill="#D9783A" {...o} />,
        torso: <path d="M30,92 Q44,84 52,96 Q60,108 72,96 Q82,86 92,96" stroke="#FFD84D" strokeWidth={4} fill="none" />,
      };
    case "pencil":
      return {
        top: "#FFD84D",
        sleeve: "#FFD84D",
        legs: "#E2223B",
        boots: "#8B8FA8",
        hood: (
          <g>
            <path d="M8,60 L8,24 L60,-22 L112,24 L112,60 Z" fill="#F2C48A" {...o} />
            <path d="M44,-8 L60,-22 L76,-8 Z" fill={INK} />
          </g>
        ),
        torso: <g>{[44, 76].map((x) => <path key={x} d={`M${x},80 V120`} stroke="#E0B820" strokeWidth={3} />)}</g>,
      };
    case "gingerbread":
      return { top: "#C47A3E", sleeve: "#C47A3E", legs: "#C47A3E", boots: "#A55E28", hood: suitHood("#C47A3E", <path d="M14,30 q6,-4 12,0 q6,4 12,0 M82,30 q6,-4 12,0 q6,4 12,0" stroke={WHITE} strokeWidth={3} fill="none" />), torso: <g><circle cx={60} cy={94} r={3.4} fill="#B78CFF" {...thin} /><circle cx={60} cy={106} r={3.4} fill="#B78CFF" {...thin} /><path d="M26,116 q6,-4 12,0 q6,4 12,0 q6,-4 12,0 q6,4 12,0 q6,-4 12,0" stroke={WHITE} strokeWidth={2.4} fill="none" /></g> };
    case "angelsuit":
      return { top: WHITE, sleeve: "#FFE3CF", legs: WHITE, boots: "#FFE3CF", back: <g fill={WHITE} {...o}><path d="M32,92 C14,74 2,84 6,98 C2,108 18,112 30,104 Z" /><path d="M88,92 C106,74 118,84 114,98 C118,108 102,112 90,104 Z" /></g>, front: <g>{heart(60, 106, 0.6)}<ellipse cx={60} cy={-2} rx={22} ry={5} fill="none" stroke={YELLOW} strokeWidth={4} /></g> };
    case "surfer":
      return { top: "#1E6E8A", sleeve: "#1E6E8A", legs: "#1E3A5A", boots: "#F6C9A3", back: <g><path d="M96,20 C118,40 118,110 104,134 C92,110 88,50 96,20 Z" fill={WHITE} {...o} /><path d="M100,26 C110,60 108,110 104,128" stroke="#4E9BFF" strokeWidth={4} fill="none" /></g>, torso: <path d="M30,100 Q60,92 90,100" stroke="#5FE0B0" strokeWidth={4} fill="none" /> };
  }
  return base;
}

/** Hair colours for shading helpers. */
export const hairShades = (hex: string) => ({ base: hex, dark: shade(hex, 0.75), light: shade(hex, 1.25) });
