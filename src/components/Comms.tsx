"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatLastSeen, formatLeft, msLeft } from "@/lib/expiry";
import { friendlyError, isSeenBy } from "@/lib/messages";
import { STICKERS } from "@/lib/pixels";
import type { Message, Profile, Reaction, SignalMode } from "@/lib/types";
import type { PartnerPresence, Room } from "@/lib/useRoom";
import { Icon } from "./Icon";

const REACTIONS = ["💜", "😂", "😮", "🥺", "🔥", "👍"];
const QUICK_EMOJI = ["💜", "🕸️", "⚡", "🌙", "✨", "😘", "🥹", "😂", "🫶", "🦇", "🌃", "☕"];

interface Props {
  room: Room;
  me: Profile;
  partner: Profile;
  presence: PartnerPresence;
  active: boolean;
  onOpenGhost: (m: Message) => void;
  onToast: (text: string, tone?: "warn" | "info") => void;
  onSent: () => void;
}

export function Comms({ room, me, partner, presence, active, onOpenGhost, onToast, onSent }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SignalMode>("normal");
  const [ghostSeconds, setGhostSeconds] = useState(10);
  const [text, setText] = useState("");
  const [drawer, setDrawer] = useState<"none" | "emoji" | "sticker">("none");
  const [picker, setPicker] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const { messages, reactions, partnerLastReadAt, actions } = room;

  // Keep scrolled to the bottom unless the user scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, active, presence.typing]);

  // Read receipts while the chat is on screen.
  useEffect(() => {
    if (!active) return;
    const mark = () => {
      if (document.visibilityState === "visible" && room.unread > 0) void actions.markRead();
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [active, room.unread, actions]);

  const lastSeenMine = [...messages].reverse().find((m) => m.sender_id === me.id && !m._status && isSeenBy(m, partnerLastReadAt));

  const send = async () => {
    const body = text.trim();
    if (!body || mode === "ghost") return;
    setText("");
    actions.setTyping(false);
    try {
      await actions.sendText(body, mode);
      onSent();
    } catch (e) {
      onToast(friendlyError(e), "warn");
    }
  };

  const sendSticker = async (key: string) => {
    setDrawer("none");
    try {
      await actions.sendSticker(key, mode);
      onSent();
    } catch (e) {
      onToast(friendlyError(e), "warn");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await actions.sendMedia(file, mode, ghostSeconds);
      onSent();
    } catch (e) {
      onToast(e instanceof Error && /^[A-Z0-9 ().,'—-]+$/.test(e.message) ? e.message : friendlyError(e), "warn");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cycleMode = () => setMode((m) => (m === "normal" ? "day" : m === "day" ? "ghost" : "normal"));

  return (
    <section className="comms" aria-label="Messages">
      <div className="comms-lcd lcd">
        <span>COMMS ▸ {partner.display_name}</span>
        <span className="lcd-status">
          {presence.typing ? "TYPING…" : presence.online ? "ONLINE" : `LAST SEEN ${formatLastSeen(partner.last_seen_at)}`}
        </span>
      </div>

      <div
        className="msg-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {!room.loaded && <p className="empty lcd-blink">LOADING SIGNALS…</p>}
        {room.loaded && messages.length === 0 && (
          <div className="empty">
            <Icon name="sparkle" size={40} />
            <p>NO SIGNALS YET. SAY HI!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          return (
            <div key={m.client_id + m.sender_id}>
              {newDay && <div className="day-sep">{dayLabel(m.created_at)}</div>}
              <MessageItem
                m={m}
                mine={m.sender_id === me.id}
                reactions={reactions.filter((r) => r.message_id === m.id)}
                myId={me.id}
                seen={lastSeenMine?.id === m.id}
                mediaUrl={room.mediaUrls[m.id]}
                pickerOpen={picker === m.id}
                onTogglePicker={() => setPicker((p) => (p === m.id ? null : m.id))}
                onReact={async (emoji) => {
                  setPicker(null);
                  try {
                    await actions.react(m.id, emoji);
                  } catch (e) {
                    onToast(friendlyError(e), "warn");
                  }
                }}
                onUnsend={async () => {
                  setPicker(null);
                  try {
                    await actions.unsend(m.id);
                  } catch (e) {
                    onToast(friendlyError(e), "warn");
                  }
                }}
                onRetry={async () => {
                  try {
                    await actions.retry(m.client_id);
                  } catch (e) {
                    onToast(friendlyError(e), "warn");
                  }
                }}
                onDiscard={() => actions.discardFailed(m.client_id)}
                onNeedMedia={() => actions.requestMedia(m.id)}
                onOpenGhost={() => onOpenGhost(m)}
                onZoom={setLightbox}
              />
            </div>
          );
        })}
        {presence.typing && (
          <div className="msg them typing-row" aria-live="polite">
            <div className="bubble">
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
      </div>

      {drawer !== "none" && (
        <div className="drawer" role="dialog" aria-label={drawer === "emoji" ? "Emoji" : "Stickers"}>
          {drawer === "emoji" &&
            QUICK_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                className="drawer-item emoji"
                onClick={() => {
                  setText((t) => (t + e).slice(0, 1000));
                }}
              >
                {e}
              </button>
            ))}
          {drawer === "sticker" &&
            STICKERS.map((s) => (
              <button key={s} type="button" className="drawer-item" onClick={() => sendSticker(s)} aria-label={`Send ${s} sticker`}>
                <Icon name={s} size={36} />
              </button>
            ))}
        </div>
      )}

      <div className="composer">
        <div className="composer-modes">
          <button type="button" className={`mode-chip mode-${mode}`} onClick={cycleMode} aria-label="Change signal mode">
            {mode === "normal" ? "● KEEP" : mode === "day" ? "◐ 24H" : "👻 GHOST"}
          </button>
          {mode === "ghost" && (
            <select
              className="mode-chip"
              value={ghostSeconds}
              onChange={(e) => setGhostSeconds(Number(e.target.value))}
              aria-label="Ghost viewing time"
            >
              {[5, 10, 20, 30].map((s) => (
                <option key={s} value={s}>
                  {s}s VIEW
                </option>
              ))}
            </select>
          )}
          <span className="mode-help">
            {mode === "normal"
              ? "STAYS IN THE CHAT"
              : mode === "day"
                ? "GONE 24H AFTER SENDING"
                : "PHOTO/GIF · VANISHES AFTER ONE LOOK"}
          </span>
        </div>
        <div className="composer-row">
          <button type="button" className="btn btn-sq" onClick={() => setDrawer((d) => (d === "emoji" ? "none" : "emoji"))} aria-label="Emoji">
            ☺
          </button>
          <button
            type="button"
            className="btn btn-sq"
            onClick={() => setDrawer((d) => (d === "sticker" ? "none" : "sticker"))}
            aria-label="Stickers"
            disabled={mode === "ghost"}
          >
            ★
          </button>
          <button type="button" className="btn btn-sq btn-orange" onClick={() => fileRef.current?.click()} aria-label="Send a photo or GIF">
            ⬚
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <textarea
            className="composer-input"
            rows={1}
            value={text}
            maxLength={1000}
            disabled={mode === "ghost"}
            placeholder={mode === "ghost" ? "PICK A PHOTO ▸" : "SAY HI…"}
            onChange={(e) => {
              setText(e.target.value);
              actions.setTyping(e.target.value.length > 0);
            }}
            onBlur={() => actions.setTyping(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            aria-label="Message"
          />
          <button type="button" className="btn btn-coral send-btn" onClick={send} disabled={!text.trim() || mode === "ghost"}>
            SEND
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" role="dialog" aria-label="Photo" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" onContextMenu={(e) => e.preventDefault()} draggable={false} />
          <span className="lightbox-hint">TAP TO CLOSE</span>
        </div>
      )}
    </section>
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

const MessageItem = memo(function MessageItem(props: {
  m: Message;
  mine: boolean;
  reactions: Reaction[];
  myId: string;
  seen: boolean;
  mediaUrl?: { url: string; exp: number };
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onReact: (emoji: string | null) => void;
  onUnsend: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  onNeedMedia: () => void;
  onOpenGhost: () => void;
  onZoom: (url: string) => void;
}) {
  const { m, mine } = props;
  const myReaction = props.reactions.find((r) => r.user_id === props.myId)?.emoji ?? null;
  const left = msLeft(m);
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`msg ${mine ? "me" : "them"} kind-${m.kind} mode-${m.mode} ${m._status ? `st-${m._status}` : ""}`}>
      <div className="bubble" onDoubleClick={() => !m._status && props.onReact(myReaction ? null : "💜")}>
        {m.kind === "text" && <p className="msg-text">{m.body}</p>}
        {m.kind === "sticker" && m.sticker && (
          <span className="msg-sticker">
            <Icon name={m.sticker} size={64} title={`${m.sticker} sticker`} />
          </span>
        )}
        {(m.kind === "image" || m.kind === "gif") && m.mode === "ghost" && (
          <GhostCard m={m} mine={mine} onOpen={props.onOpenGhost} />
        )}
        {(m.kind === "image" || m.kind === "gif") && m.mode !== "ghost" && (
          <MediaThumb m={m} url={m._localPreview ?? props.mediaUrl?.url} exp={props.mediaUrl?.exp} onNeed={props.onNeedMedia} onZoom={props.onZoom} />
        )}
      </div>

      <div className="msg-meta">
        <span>{time}</span>
        {m.mode === "day" && left !== null && <span className="tag tag-day">◐ {formatLeft(left)}</span>}
        {m._status === "sending" && <span className="tag">SENDING…</span>}
        {m._status === "failed" && (
          <>
            <span className="tag tag-warn">FAILED</span>
            <button type="button" className="link-btn" onClick={props.onRetry}>
              RETRY
            </button>
            <button type="button" className="link-btn" onClick={props.onDiscard}>
              DISCARD
            </button>
          </>
        )}
        {props.seen && <span className="tag tag-seen">SEEN</span>}
        {!m._status && (
          <button type="button" className="link-btn react-btn" onClick={props.onTogglePicker} aria-label="React">
            {props.reactions.length ? props.reactions.map((r) => r.emoji).join("") : "+"}
          </button>
        )}
      </div>

      {props.pickerOpen && (
        <div className="react-picker" role="menu">
          {REACTIONS.map((e) => (
            <button key={e} type="button" className={e === myReaction ? "on" : ""} onClick={() => props.onReact(e === myReaction ? null : e)}>
              {e}
            </button>
          ))}
          {mine && (
            <button type="button" className="unsend" onClick={props.onUnsend}>
              UNSEND
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function GhostCard({ m, mine, onOpen }: { m: Message; mine: boolean; onOpen: () => void }) {
  if (mine) {
    return (
      <div className="ghost-card">
        <Icon name="ghost" size={28} />
        <div>
          <strong>GHOST {m.kind === "gif" ? "GIF" : "PHOTO"} SENT</strong>
          <span>{m.opened_at ? "OPENED · FADING" : m._status ? "UPLOADING…" : `UNOPENED · ${m.ghost_seconds}s VIEW`}</span>
        </div>
      </div>
    );
  }
  return (
    <button type="button" className="ghost-card ghost-open" onClick={onOpen} disabled={!!m.opened_at}>
      <Icon name="ghost" size={28} />
      <div>
        <strong>{m.opened_at ? "VIEWING…" : "TAP TO REVEAL"}</strong>
        <span>VANISHES {m.ghost_seconds}s AFTER OPENING</span>
      </div>
    </button>
  );
}

function MediaThumb({
  m,
  url,
  exp,
  onNeed,
  onZoom,
}: {
  m: Message;
  url?: string;
  exp?: number;
  onNeed: () => void;
  onZoom: (url: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const needRef = useRef(onNeed);
  useEffect(() => {
    needRef.current = onNeed;
  });
  const failed = !!url && failedUrl === url;
  useEffect(() => {
    const expired = exp !== undefined && exp < Date.now();
    if ((url && !expired) || m._status) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          needRef.current();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url, exp, m._status]);

  return (
    <div ref={ref} className="media-thumb">
      {url && !failed ? (
        <img
          src={url}
          alt={m.kind === "gif" ? "GIF" : "Photo"}
          loading="lazy"
          onClick={() => onZoom(url)}
          onError={() => {
            setFailedUrl(url);
            onNeed();
          }}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      ) : (
        <span className="media-loading">{m._status === "sending" ? "UPLOADING…" : "LOADING…"}</span>
      )}
    </div>
  );
}
