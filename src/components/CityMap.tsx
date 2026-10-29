"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildingAt, CITY_H, CITY_W, clampView, fitView, generateCity, zoomAt, type Building, type View } from "@/lib/city";
import { formatLastSeen } from "@/lib/expiry";
import { moodInfo } from "@/lib/spark";
import type { Profile, SignalDrop } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CitySvg } from "./CitySvg";
import { Icon } from "./Icon";
import type { Landmark, QuestKey, QuestStatus } from "@/lib/landmarks";
import { HINT_STYLE, type HuntGuess } from "./quests/HotCold";

export type MapMode = "browse" | "drop" | "move" | "hide" | "seek";

export interface Bubble {
  key: number;
  userId: string;
  text: string;
}

export interface Flight {
  key: number;
  fromId: string;
  icon: string;
}

interface Props {
  me: Profile;
  partner: Profile;
  /** City Quests landmarks (games and daily activities). */
  landmarks?: { lm: Landmark; status: QuestStatus }[];
  onOpenLandmark?: (key: QuestKey) => void;
  /** Hot & Cold: guesses so far, the revealed spot, and (for the hider) their own spot. */
  hunt?: { guesses: HuntGuess[]; spot: { x: number; y: number } | null; mine: { x: number; y: number } | null } | null;
  /** Other people you chat with (shown on the map too, a little dimmer). */
  others?: { profile: Profile; online: boolean }[];
  partnerOnline: boolean;
  partnerTyping: boolean;
  partnerView: string | null;
  drops: SignalDrop[];
  mode: MapMode;
  night: boolean;
  celebrate: boolean;
  bubbles: Bubble[];
  flights: Flight[];
  onPick: (x: number, y: number, building: Building | undefined) => void;
  onOpenDrop: (drop: SignalDrop) => void;
  onEasterEgg: (kind: "rooftop" | "tower" | "river" | "towers-all") => void;
}

interface Fx {
  key: number;
  x: number;
  y: number;
  kind: "sparkle" | "pigeon";
}

const city = generateCity();

export function CityMap(props: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ scale: 1, tx: 0, ty: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startY: number; t: number; moved: boolean; pinchDist?: number; midX?: number; midY?: number } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const towersFound = useRef(new Set<string>());
  const fxKey = useRef(0);

  const apply = useCallback((v: View) => {
    const el = viewportRef.current;
    const layer = layerRef.current;
    if (!el || !layer) return;
    const clamped = clampView(v, el.clientWidth, el.clientHeight);
    view.current = clamped;
    layer.style.transform = `translate3d(${clamped.tx}px, ${clamped.ty}px, 0) scale(${clamped.scale})`;
    layer.style.setProperty("--inv", String(1 / clamped.scale));
  }, []);

  const centerOn = useCallback(
    (nx: number, ny: number, scale = Math.max(view.current.scale, 1.2)) => {
      const el = viewportRef.current;
      if (!el) return;
      apply({ scale, tx: el.clientWidth / 2 - nx * CITY_W * scale, ty: el.clientHeight / 2 - ny * CITY_H * scale });
    },
    [apply],
  );

  // Initial view: centred on me. Re-clamp on resize/rotation.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const fit = fitView(el.clientWidth, el.clientHeight);
    apply(fit);
    centerOn(props.me.map_x, props.me.map_y, fit.scale);
    const ro = new ResizeObserver(() => apply(view.current));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toMap = (clientX: number, clientY: number) => {
    const rect = viewportRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (clientX - rect.left - v.tx) / v.scale, y: (clientY - rect.top - v.ty) / v.scale };
  };

  const addFx = (x: number, y: number, kind: Fx["kind"]) => {
    const key = ++fxKey.current;
    setFx((list) => [...list.slice(-6), { key, x, y, kind }]);
    setTimeout(() => setFx((list) => list.filter((f) => f.key !== key)), 1400);
  };

  const handleTap = (clientX: number, clientY: number, target: EventTarget | null) => {
    if (target instanceof Element && target.closest("[data-interactive]")) return;
    const { x, y } = toMap(clientX, clientY);
    const outside = x < 0 || y < 0 || x > CITY_W || y > CITY_H;
    // Hot & Cold taps just off the island still count (snapped to the edge).
    if (outside && props.mode !== "hide" && props.mode !== "seek") return;
    const b = outside ? undefined : buildingAt(city, x, y);
    if (props.mode !== "browse") {
      props.onPick(Math.min(1, Math.max(0, x / CITY_W)), Math.min(1, Math.max(0, y / CITY_H)), b);
      return;
    }
    if (b) {
      if (b.waterTower) {
        addFx(b.x + b.w - 9, b.y + 4, "pigeon");
        towersFound.current.add(b.id);
        const total = city.buildings.filter((bb) => bb.waterTower).length;
        if (towersFound.current.size === 5) props.onEasterEgg("tower");
        if (towersFound.current.size === total) props.onEasterEgg("towers-all");
      } else {
        addFx(b.cx, b.cy, "sparkle");
        props.onEasterEgg("rooftop");
      }
    } else if (y > CITY_H - 40 && x < 200) {
      props.onEasterEgg("river");
    }
  };

  // ---------------------------------------------------------------- gestures
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Let buttons on the map (drops) receive their own click instead of starting a pan.
    if (e.target instanceof Element && e.target.closest("button[data-interactive]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { startX: e.clientX, startY: e.clientY, t: Date.now(), moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        ...(gesture.current ?? { startX: 0, startY: 0, t: 0 }),
        moved: true,
        pinchDist: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const rect = viewportRef.current!.getBoundingClientRect();

    if (pointers.current.size >= 2 && g.pinchDist) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let v = zoomAt(view.current, dist / g.pinchDist, midX - rect.left, midY - rect.top);
      v = { ...v, tx: v.tx + (midX - (g.midX ?? midX)), ty: v.ty + (midY - (g.midY ?? midY)) };
      apply(v);
      g.pinchDist = dist;
      g.midX = midX;
      g.midY = midY;
      return;
    }

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > 6) g.moved = true;
    if (g.moved) apply({ ...view.current, tx: view.current.tx + dx, ty: view.current.ty + dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      if (g && !g.moved && Date.now() - g.t < 500) handleTap(e.clientX, e.clientY, e.target);
      gesture.current = null;
    } else if (pointers.current.size === 1 && g) {
      g.pinchDist = undefined;
    }
  };

  // Wheel / trackpad zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      apply(zoomAt(view.current, factor, e.clientX - rect.left, e.clientY - rect.top));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply]);

  const zoomButton = (factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    apply(zoomAt(view.current, factor, el.clientWidth / 2, el.clientHeight / 2));
  };

  // ---------------------------------------------------------------- overlay data
  const people = useMemo(
    () => [
      { p: props.me, online: true, isMe: true },
      { p: props.partner, online: props.partnerOnline, isMe: false },
      ...(props.others ?? [])
        .filter((o) => o.profile.id !== props.me.id && o.profile.id !== props.partner.id)
        .map((o) => ({ p: o.profile, online: o.online, isMe: false, other: true })),
    ],
    [props.me, props.partner, props.partnerOnline, props.others],
  );

  const posOf = (id: string) => {
    const p = id === props.me.id ? props.me : props.partner;
    return { x: p.map_x * CITY_W, y: p.map_y * CITY_H };
  };

  return (
    <div className={`map-wrap mode-${props.mode}`}>
      <div
        ref={viewportRef}
        className="map-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="City map. Drag to move, pinch or scroll to zoom."
      >
        <div ref={layerRef} className="map-layer" style={{ width: CITY_W, height: CITY_H }}>
          <CitySvg city={city} night={props.night} />

          {/* traffic */}
          <div className="traffic" aria-hidden>
            {city.lanes.map((l) => (
              <span
                key={l.id}
                className="car"
                style={
                  {
                    left: l.x1 - 3,
                    top: l.y1 - 2,
                    background: l.color,
                    "--dx": `${l.x2 - l.x1}px`,
                    "--dy": `${l.y2 - l.y1}px`,
                    animationDuration: `${l.duration}s`,
                    animationDelay: `${l.delay}s`,
                    width: l.x1 === l.x2 ? 6 : 10,
                    height: l.x1 === l.x2 ? 10 : 6,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* tap effects */}
          {fx.map((f) => (
            <span key={f.key} className={`map-fx fx-${f.kind}`} style={{ left: f.x, top: f.y }} aria-hidden>
              <Icon name={f.kind === "pigeon" ? "pigeon" : "sparkle"} size={18} />
            </span>
          ))}

          {/* signal drops */}
          {props.drops.map((d) => {
            const mine = d.sender_id === props.me.id;
            const fresh = !mine && !d.opened_at;
            const owner = mine ? props.me : props.partner;
            return (
              <button
                key={d.id}
                type="button"
                data-interactive
                className={`drop-marker ${mine ? "mine" : "theirs"} ${fresh ? "fresh" : ""} ${d.mode}`}
                style={{ left: d.x * CITY_W, top: d.y * CITY_H }}
                onClick={() => props.onOpenDrop(d)}
                aria-label={
                  mine
                    ? `Your signal drop${d.opened_at ? ", opened" : ""}`
                    : `Signal drop from ${owner.display_name}. Tap to open.`
                }
              >
                <span className="drop-core">
                  <Icon name={d.sticker ?? (d.media_path ? "camera" : d.mode === "ghost" ? "ghost" : "star")} size={16} />
                </span>
                <span className="drop-owner" aria-hidden>
                  <Avatar avatarKey={owner.avatar_key} size={14} />
                </span>
                <span className="drop-tag">
                  {mine ? `YOU · ${d.opened_at ? "OPENED" : "WAITING"}` : `FROM ${owner.display_name}`}
                </span>
              </button>
            );
          })}

          {/* City Quests landmarks */}
          {props.landmarks?.map(({ lm, status }) => (
            <button
              key={lm.key}
              type="button"
              data-interactive
              className={`landmark tone-${status.tone}`}
              style={{ left: lm.x * CITY_W, top: lm.y * CITY_H, "--lm": lm.color } as React.CSSProperties}
              onClick={() => props.onOpenLandmark?.(lm.key)}
              aria-label={`${lm.name}: ${lm.activity}. ${status.text}`}
            >
              {status.tone !== "idle" && <span className="landmark-status">{status.text}</span>}
              <span className="landmark-sign">
                <span className="landmark-emoji">{lm.emoji}</span>
              </span>
              <span className="landmark-legs" aria-hidden />
              <span className="landmark-name">{lm.name}</span>
            </button>
          ))}

          {/* Hot & Cold */}
          {props.hunt?.guesses.map((g, i) => (
            <span
              key={`hunt-${i}`}
              className={`hunt-dot ${i === props.hunt!.guesses.length - 1 ? "latest" : ""}`}
              style={{ left: g.x * CITY_W, top: g.y * CITY_H, "--hint": HINT_STYLE[g.hint].color } as React.CSSProperties}
              aria-label={`Guess ${i + 1}: ${g.hint}`}
            >
              {i === props.hunt!.guesses.length - 1 && <span className="hunt-label">{HINT_STYLE[g.hint].label}</span>}
            </span>
          ))}
          {props.hunt?.spot && (
            <span className="hunt-spot" style={{ left: props.hunt.spot.x * CITY_W, top: props.hunt.spot.y * CITY_H }} aria-label="The secret spot">
              🎯
            </span>
          )}
          {!props.hunt?.spot && props.hunt?.mine && (
            <span className="hunt-spot mine" style={{ left: props.hunt.mine.x * CITY_W, top: props.hunt.mine.y * CITY_H }} aria-label="Where you hid it">
              📡
            </span>
          )}

          {/* poke flights */}
          {props.flights.map((f) => {
            const from = posOf(f.fromId);
            const to = posOf(f.fromId === props.me.id ? props.partner.id : props.me.id);
            return <FlyingIcon key={f.key} from={from} to={to} icon={f.icon} />;
          })}

          {/* avatars */}
          {people.map((entry) => {
            const { p, isMe } = entry;
            const other = "other" in entry && entry.other;
            const online = entry.online;
            const bubble = other ? undefined : [...props.bubbles].reverse().find((b) => b.userId === p.id);
            const partnerTyping = !other && props.partnerTyping;
            return (
              <div
                key={p.id}
                className={`avatar-pin ${online ? "online" : "offline"} ${isMe ? "me" : other ? "other" : "them"} ${props.celebrate && !other ? "celebrate" : ""}`}
                style={{ left: p.map_x * CITY_W, top: p.map_y * CITY_H }}
              >
                <div className="pin-scale">
                  {bubble && (
                    <div key={bubble.key} className="speech" role="status">
                      {bubble.text}
                    </div>
                  )}
                  {!isMe && partnerTyping && !bubble && <div className="speech typing">…</div>}
                  {!bubble && !(!isMe && partnerTyping) && moodInfo(p.mood) && (
                    <div className="mood-bubble" title={moodInfo(p.mood)!.label}>
                      {moodInfo(p.mood)!.emoji}
                    </div>
                  )}
                  <div className="pin-art">
                    <Avatar avatarKey={p.avatar_key} size={44} label={p.display_name} />
                  </div>
                  <div className="pin-name">
                    <span className={`dot ${online ? "on" : "off"}`} />
                    {p.display_name}
                    {isMe && <span className="you"> (YOU)</span>}
                  </div>
                  {!isMe && !online && <div className="pin-sub">LAST SEEN {formatLastSeen(p.last_seen_at)}</div>}
                  {!isMe && !other && online && props.partnerView && props.partnerView !== "map" && (
                    <div className="pin-sub">IN {props.partnerView.toUpperCase()}</div>
                  )}
                </div>
                <span className="pin-shadow" />
              </div>
            );
          })}
        </div>
      </div>

      {props.mode !== "browse" && (
        <div className="map-hint" role="status">
          {props.mode === "drop"
            ? "TAP A ROOFTOP TO DROP A SIGNAL"
            : props.mode === "hide"
              ? "📡 TAP ANYWHERE TO HIDE YOUR SECRET SPOT"
              : props.mode === "seek"
                ? `📡 TAP TO SENSE IT · ${props.hunt ? Math.max(0, 10 - props.hunt.guesses.length) : 10} TRIES LEFT`
                : "TAP WHERE YOU WANT TO STAND"}
        </div>
      )}

      <div className="map-controls">
        <button type="button" className="btn btn-sq" onClick={() => zoomButton(1.3)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="btn btn-sq" onClick={() => zoomButton(1 / 1.3)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="btn btn-sq" onClick={() => centerOn(props.me.map_x, props.me.map_y)} aria-label="Centre on me">
          ◎
        </button>
        <button type="button" className="btn btn-sq" onClick={() => centerOn(props.partner.map_x, props.partner.map_y)} aria-label="Find my person">
          ♥
        </button>
      </div>

      <Radar me={props.me} partner={props.partner} partnerOnline={props.partnerOnline} drops={props.drops} />
    </div>
  );
}

function FlyingIcon({ from, to, icon }: { from: { x: number; y: number }; to: { x: number; y: number }; icon: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const frames: Keyframe[] = [];
    const lift = Math.min(160, Math.hypot(to.x - from.x, to.y - from.y) * 0.35 + 40);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y - 40 + (to.y - from.y) * t - Math.sin(Math.PI * t) * lift;
      frames.push({ transform: `translate(${x}px, ${y}px) scale(calc(var(--inv, 1) * ${1 + Math.sin(Math.PI * t) * 0.6}))`, opacity: t > 0.92 ? 0 : 1 });
    }
    const anim = el.animate(frames, { duration: 1100, easing: "linear", fill: "forwards" });
    return () => anim.cancel();
  }, [from.x, from.y, to.x, to.y]);
  return (
    <span ref={ref} className="flight" aria-hidden>
      <Icon name={icon} size={22} />
    </span>
  );
}

function Radar({ me, partner, partnerOnline, drops }: { me: Profile; partner: Profile; partnerOnline: boolean; drops: SignalDrop[] }) {
  return (
    <div className="radar" aria-hidden>
      <span className="radar-sweep" />
      <span className="radar-dot me" style={{ left: `${me.map_x * 100}%`, top: `${me.map_y * 100}%` }} />
      <span
        className={`radar-dot them ${partnerOnline ? "" : "dim"}`}
        style={{ left: `${partner.map_x * 100}%`, top: `${partner.map_y * 100}%` }}
      />
      {drops.map((d) => (
        <span key={d.id} className="radar-dot drop" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }} />
      ))}
    </div>
  );
}
