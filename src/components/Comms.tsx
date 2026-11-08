"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatLastSeen, formatLeft, msLeft } from "@/lib/expiry";
import { friendlyError, isSeenBy } from "@/lib/messages";
import { STICKERS } from "@/lib/pixels";
import type { Message, MessagePin, Profile, Reaction, SignalMode } from "@/lib/types";
import type { PartnerPresence, Room } from "@/lib/useRoom";
import { Icon } from "./Icon";
import { TalkButton, VoiceNote } from "./Voice";
import { SpideyCam } from "./SpideyCam";

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
  walkieOn: boolean;
  partnerOnWalkie: boolean;
  onOpenWalkie: () => void;
}

export function Comms({ room, me, partner, presence, active, onOpenGhost, onToast, onSent, walkieOn, partnerOnWalkie, onOpenWalkie }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SignalMode>("normal");
  const [ghostSeconds, setGhostSeconds] = useState(10);
  const [text, setText] = useState("");
  const [drawer, setDrawer] = useState<"none" | "emoji" | "sticker">("none");
  const [picker, setPicker] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cam, setCam] = useState(false);
  const stick = useRef(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menuFor, setMenuFor] = useState<Message | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, reactions, pins, partnerLastReadAt, actions } = room;
  const byId = new Map(messages.map((m) => [m.id, m]));
  const pinned = new Set(pins.filter((p) => !p._leaving).map((p) => p.message_id));

  const startReply = (m: Message) => {
    setReplyTo(m);
    setMenuFor(null);
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) {
      onToast("THAT MESSAGE IS TOO OLD TO SHOW", "info");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("msg-flash");
    void el.offsetWidth;
    el.classList.add("msg-flash");
  };

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
    const reply = replyTo?.id ?? null;
    setReplyTo(null);
    actions.setTyping(false);
    try {
      await actions.sendText(body, mode, reply);
      onSent();
    } catch (e) {
      onToast(friendlyError(e), "warn");
    }
  };

  const sendSticker = async (key: string) => {
    setDrawer("none");
    const reply = replyTo?.id ?? null;
    setReplyTo(null);
    try {
      await actions.sendSticker(key, mode, reply);
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
        <button type="button" className={`walkie-btn ${walkieOn ? "on" : ""} ${partnerOnWalkie && !walkieOn ? "ringing" : ""}`} onClick={onOpenWalkie} aria-label="Open walkie-talkie">
          📻
        </button>
      </div>
      {partnerOnWalkie && !walkieOn && (
        <button type="button" className="walkie-invite" onClick={onOpenWalkie}>
          📻 {partner.display_name} IS ON THE WALKIE — TAP TO JOIN
        </button>
      )}

      <PinBar pins={pins} byId={byId} meId={me.id} partnerName={partner.display_name} onJump={jumpTo} onUnpin={async (id) => {
        try {
          await actions.unpin(id);
        } catch (e) {
          onToast(friendlyError(e), "warn");
        }
      }} />

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
                replied={m.reply_to ? (byId.get(m.reply_to) ?? null) : undefined}
                repliedName={m.reply_to ? (byId.get(m.reply_to)?.sender_id === me.id ? "YOU" : partner.display_name) : ""}
                pinned={pinned.has(m.id)}
                onReply={() => startReply(m)}
                onMenu={() => setMenuFor(m)}
                onJump={jumpTo}
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
        {replyTo && (
          <div className="reply-bar" role="status">
            <span className="reply-bar-line" aria-hidden />
            <div className="reply-bar-text">
              <strong>REPLYING TO {replyTo.sender_id === me.id ? "YOURSELF" : partner.display_name}</strong>
              <span>{snippet(replyTo)}</span>
            </div>
            <button type="button" className="link-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              ✕
            </button>
          </div>
        )}
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
          <button type="button" className="btn btn-sq btn-coral cam-open" onClick={() => setCam(true)} aria-label="Open Spidey-Cam">
            📸
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
            ref={inputRef}
            className="composer-input"
            rows={1}
            value={text}
            maxLength={1000}
            disabled={mode === "ghost"}
            placeholder={mode === "ghost" ? "PHOTO OR HOLD TO TALK ▸" : "SAY HI…"}
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
          {text.trim() && mode !== "ghost" ? (
            <button type="button" className="btn btn-coral send-btn" onClick={send}>
              SEND
            </button>
          ) : (
            <TalkButton
              onRecorded={async (rec) => {
                try {
                  await actions.sendVoice(rec, mode);
                  onSent();
                } catch (e) {
                  onToast(e instanceof Error && /^[A-Z0-9 ().,'—-]+$/.test(e.message) ? e.message : friendlyError(e), "warn");
                }
              }}
              onProblem={(msg) => onToast(msg, "warn")}
            />
          )}
        </div>
      </div>

      {cam && (
        <SpideyCam
          partnerName={partner.display_name}
          onClose={() => setCam(false)}
          onSend={async (file, sendMode) => {
            try {
              await actions.sendMedia(file, sendMode, 10);
              onSent();
              onToast(sendMode === "ghost" ? "SNAP SENT 👻" : "SNAP SENT", "info");
            } catch (e) {
              onToast(friendlyError(e), "warn");
              throw e;
            }
          }}
        />
      )}

      {menuFor && (
        <MessageMenu
          m={menuFor}
          mine={menuFor.sender_id === me.id}
          pinned={pinned.has(menuFor.id)}
          myReaction={reactions.find((x) => x.message_id === menuFor.id && x.user_id === me.id)?.emoji ?? null}
          onClose={() => setMenuFor(null)}
          onReact={async (emoji) => {
            const id = menuFor.id;
            setMenuFor(null);
            try {
              await actions.react(id, emoji);
            } catch (e) {
              onToast(friendlyError(e), "warn");
            }
          }}
          onReply={() => startReply(menuFor)}
          onCopy={async () => {
            const body = menuFor.body ?? "";
            setMenuFor(null);
            try {
              await navigator.clipboard.writeText(body);
              onToast("COPIED", "info");
            } catch {
              onToast("COULDN'T COPY ON THIS PHONE", "warn");
            }
          }}
          onPin={async () => {
            const m = menuFor;
            setMenuFor(null);
            try {
              if (pinned.has(m.id)) await actions.unpin(m.id);
              else {
                await actions.pin(m.id);
                onToast(pins.filter((p) => !p._leaving).length >= 3 ? "PINNED · OLDEST PIN REMOVED" : "PINNED FOR YOU BOTH", "info");
              }
            } catch (e) {
              onToast(friendlyError(e), "warn");
            }
          }}
          onDelete={async () => {
            const id = menuFor.id;
            setMenuFor(null);
            if (replyTo?.id === id) setReplyTo(null);
            try {
              await actions.unsend(id);
            } catch (e) {
              onToast(friendlyError(e), "warn");
            }
          }}
        />
      )}

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

/** Short text describing a message, for reply quotes and pins. */
function snippet(m: Message): string {
  if (m.mode === "ghost") return "👻 GHOST " + (m.kind === "voice" ? "VOICE" : "PHOTO");
  if (m.kind === "text") return (m.body ?? "").slice(0, 80);
  if (m.kind === "sticker") return "★ STICKER";
  if (m.kind === "voice") return "🎙 VOICE NOTE";
  if (m.kind === "gif") return "GIF";
  return "📷 PHOTO";
}

function PinBar({
  pins,
  byId,
  meId,
  partnerName,
  onJump,
  onUnpin,
}: {
  pins: MessagePin[];
  byId: Map<string, Message>;
  meId: string;
  partnerName: string;
  onJump: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (pins.length === 0) return null;
  const live = pins.filter((p) => !p._leaving);
  // Collapsed: the newest pin plus anything that is animating away.
  const shown = open ? pins.slice(0, 4) : pins.filter((p, i) => p._leaving || p.message_id === live[0]?.message_id || (live.length === 0 && i === 0));
  return (
    <div className={`pin-bar ${open ? "open" : ""}`} aria-label="Pinned messages">
      {shown.map((p) => {
        const m = byId.get(p.message_id);
        const isTop = p.message_id === live[0]?.message_id;
        return (
          <div key={p.message_id} className={`pin-chip ${p._leaving ? "pin-leaving" : ""}`}>
            <button type="button" className="pin-chip-main" onClick={() => onJump(p.message_id)}>
              <span className="pin-ico" aria-hidden>
                📌
              </span>
              <span className="pin-who">{m ? (m.sender_id === meId ? "YOU" : partnerName) : "PINNED"}</span>
              <span className="pin-text">{m ? snippet(m) : "OLDER MESSAGE"}</span>
            </button>
            {isTop && live.length > 1 && (
              <button type="button" className="pin-more" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Show fewer pins" : "Show all pins"}>
                {open ? "▴" : `+${live.length - 1}`}
              </button>
            )}
            <button type="button" className="pin-x" onClick={() => onUnpin(p.message_id)} aria-label="Unpin">
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MessageMenu({
  m,
  mine,
  pinned,
  myReaction,
  onClose,
  onReact,
  onReply,
  onCopy,
  onPin,
  onDelete,
}: {
  m: Message;
  mine: boolean;
  pinned: boolean;
  myReaction: string | null;
  onClose: () => void;
  onReact: (emoji: string | null) => void;
  onReply: () => void;
  onCopy: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="msg-menu-backdrop" onClick={onClose} role="presentation">
      <div className="msg-menu" role="menu" aria-label="Message options" onClick={(e) => e.stopPropagation()}>
        <p className="msg-menu-quote">{snippet(m)}</p>
        <div className="msg-menu-react">
          {REACTIONS.map((e) => (
            <button key={e} type="button" className={e === myReaction ? "on" : ""} onClick={() => onReact(e === myReaction ? null : e)}>
              {e}
            </button>
          ))}
        </div>
        <button type="button" role="menuitem" className="msg-menu-item" onClick={onReply}>
          <span aria-hidden>↩</span> REPLY
        </button>
        {m.kind === "text" && (
          <button type="button" role="menuitem" className="msg-menu-item" onClick={onCopy}>
            <span aria-hidden>⧉</span> COPY
          </button>
        )}
        {m.mode !== "ghost" && (
          <button type="button" role="menuitem" className="msg-menu-item" onClick={onPin}>
            <span aria-hidden>📌</span> {pinned ? "UNPIN" : "PIN FOR BOTH"}
          </button>
        )}
        {mine && (
          <button type="button" role="menuitem" className="msg-menu-item danger" onClick={onDelete}>
            <span aria-hidden>🗑</span> DELETE FOR BOTH
          </button>
        )}
        <button type="button" className="msg-menu-item cancel" onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

const LONG_PRESS_MS = 420;
const SWIPE_REPLY_PX = 56;

const MessageItem = memo(function MessageItem(props: {
  m: Message;
  mine: boolean;
  /** undefined = not a reply; null = replied-to message no longer loaded. */
  replied?: Message | null;
  repliedName: string;
  pinned: boolean;
  onReply: () => void;
  onMenu: () => void;
  onJump: (id: string) => void;
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
  const rowRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; id: number; dx: number; horiz: boolean | null; timer: ReturnType<typeof setTimeout> | null; long: boolean } | null>(null);
  const live = !m._status && !m._leaving;

  const setShift = (dx: number, animate: boolean) => {
    const row = rowRef.current;
    if (!row) return;
    row.style.transition = animate ? "transform 220ms cubic-bezier(0.3, 1.4, 0.5, 1)" : "none";
    row.style.transform = dx ? `translateX(${dx}px)` : "";
    row.style.setProperty("--swipe", String(Math.min(1, dx / SWIPE_REPLY_PX)));
  };
  const endGesture = () => {
    const g = gesture.current;
    if (!g) return;
    if (g.timer) clearTimeout(g.timer);
    if (g.horiz && g.dx >= SWIPE_REPLY_PX) {
      props.onReply();
      navigator.vibrate?.(10);
    }
    setShift(0, true);
    gesture.current = null;
  };

  return (
    <div
      id={`msg-${m.id}`}
      ref={rowRef}
      className={`msg ${mine ? "me" : "them"} kind-${m.kind} mode-${m.mode} ${m._status ? `st-${m._status}` : ""} ${m._leaving ? "msg-leaving" : ""} ${props.pinned ? "is-pinned" : ""}`}
      onPointerDown={(e) => {
        if (!live || (e.pointerType === "mouse" && e.button !== 0)) return;
        if ((e.target as HTMLElement).closest("button, audio, input, a")) return;
        const g = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, horiz: null as boolean | null, timer: null as ReturnType<typeof setTimeout> | null, long: false };
        g.timer = setTimeout(() => {
          g.long = true;
          gesture.current = null;
          setShift(0, true);
          navigator.vibrate?.(15);
          props.onMenu();
        }, LONG_PRESS_MS);
        gesture.current = g;
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (!g || g.id !== e.pointerId) return;
        const dx = e.clientX - g.x;
        const dy = e.clientY - g.y;
        if (g.horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          g.horiz = Math.abs(dx) > Math.abs(dy) && dx > 0;
          if (g.timer) clearTimeout(g.timer);
          g.timer = null;
          if (!g.horiz) {
            gesture.current = null;
            return;
          }
        }
        if (g.horiz) {
          g.dx = Math.max(0, Math.min(84, dx));
          setShift(g.dx, false);
        }
      }}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onContextMenu={(e) => {
        if (live) {
          e.preventDefault();
          props.onMenu();
        }
      }}
    >
      <span className="swipe-reply" aria-hidden>
        ↩
      </span>
      {props.replied !== undefined && (
        <button type="button" className="reply-quote" onClick={() => m.reply_to && props.onJump(m.reply_to)}>
          <strong>{props.replied ? props.repliedName : "REPLY"}</strong>
          <span>{props.replied ? snippet(props.replied) : "Message no longer here"}</span>
        </button>
      )}
      <div className="bubble" onDoubleClick={() => live && props.onReact(myReaction ? null : "💜")}>
        {m.kind === "text" && <p className="msg-text">{m.body}</p>}
        {m.kind === "sticker" && m.sticker && (
          <span className="msg-sticker">
            <Icon name={m.sticker} size={64} title={`${m.sticker} sticker`} />
          </span>
        )}
        {m.kind === "voice" && m.mode !== "ghost" && (
          <VoiceNote m={m} url={m._localPreview ?? props.mediaUrl?.url} exp={props.mediaUrl?.exp} onNeed={props.onNeedMedia} />
        )}
        {(m.kind === "image" || m.kind === "gif" || m.kind === "voice") && m.mode === "ghost" && (
          <GhostCard m={m} mine={mine} onOpen={props.onOpenGhost} />
        )}
        {(m.kind === "image" || m.kind === "gif") && m.mode !== "ghost" && (
          <MediaThumb m={m} url={m._localPreview ?? props.mediaUrl?.url} exp={props.mediaUrl?.exp} onNeed={props.onNeedMedia} onZoom={props.onZoom} />
        )}
      </div>

      <div className="msg-meta">
        {props.pinned && <span className="tag tag-pin">📌</span>}
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
          <strong>GHOST {m.kind === "gif" ? "GIF" : m.kind === "voice" ? "VOICE" : "PHOTO"} SENT</strong>
          <span>{m.opened_at ? "OPENED · FADING" : m._status ? "UPLOADING…" : `UNOPENED · ${m.ghost_seconds}s VIEW`}</span>
        </div>
      </div>
    );
  }
  return (
    <button type="button" className="ghost-card ghost-open" onClick={onOpen} disabled={!!m.opened_at}>
      <Icon name="ghost" size={28} />
      <div>
        <strong>{m.opened_at ? (m.kind === "voice" ? "PLAYING…" : "VIEWING…") : m.kind === "voice" ? "TAP TO HEAR" : "TAP TO REVEAL"}</strong>
        <span>{m.kind === "voice" ? "GHOST VOICE · PLAYS ONCE" : `VANISHES ${m.ghost_seconds}s AFTER OPENING`}</span>
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
