"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { GhostVoicePlayer } from "./Voice";

export interface RevealTarget {
  type: "message" | "drop";
  id: string;
  fromName: string;
  mine: boolean;
}

interface Opened {
  kind?: string | null;
  url: string | null;
  mode: string;
  viewUntil: string | null;
  body: string | null;
  sticker: string | null;
}

/**
 * Comic-book reveal for ghost signals and signal drops. The server records the
 * open and only returns a URL that expires with the viewing window.
 */
export function Reveal({
  target,
  onClose,
  onExpired,
  reduced,
}: {
  target: RevealTarget;
  onClose: () => void;
  onExpired: (id: string) => void;
  reduced: boolean;
}) {
  const [state, setState] = useState<"loading" | "burst" | "show" | "gone" | "error">("loading");
  const [data, setData] = useState<Opened | null>(null);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const closed = useRef(false);
  // Parent callbacks change every render; keep the latest in refs so the
  // open request runs exactly once per signal.
  const onExpiredRef = useRef(onExpired);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onExpiredRef.current = onExpired;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: target.type, id: target.id }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(
            json.error === "EXPIRED"
              ? "THIS SIGNAL HAS ALREADY FADED"
              : json.error === "GHOST_SENDER"
                ? "GHOSTS ONLY APPEAR TO THE RECEIVER"
                : "COULDN'T OPEN THIS SIGNAL",
          );
          setState("error");
          if (json.error === "EXPIRED") onExpiredRef.current(target.id);
          return;
        }
        setData(json as Opened);
        setState(reduced ? "show" : "burst");
        if (!reduced) setTimeout(() => !cancelled && setState("show"), 650);
      } catch {
        if (!cancelled) {
          setError("SIGNAL LOST — CHECK YOUR CONNECTION");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target.type, target.id, reduced]);

  // Ghost countdown: when it hits zero the content is removed for good.
  useEffect(() => {
    if (state !== "show" || !data?.viewUntil || data.mode !== "ghost") return;
    const end = Date.parse(data.viewUntil);
    const tick = () => {
      const ms = end - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0) {
        setState("gone");
        setData((d) => (d ? { ...d, url: null } : d));
        onExpiredRef.current(target.id);
        setTimeout(() => {
          if (!closed.current) onCloseRef.current();
        }, 1200);
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [state, data?.viewUntil, data?.mode, target.id]);

  const close = () => {
    closed.current = true;
    onClose();
  };

  return (
    <div className={`reveal reveal-${state}`} role="dialog" aria-modal="true" aria-label="Signal">
      <div className="reveal-burst" aria-hidden />
      <div className="reveal-panel">
        <div className="reveal-head">
          <span className="lcd">{target.type === "drop" ? "SIGNAL DROP" : data?.kind === "voice" ? "GHOST VOICE" : "GHOST SIGNAL"} · FROM {target.mine ? "YOU" : target.fromName}</span>
          {left !== null && state === "show" && <span className="reveal-count">{left}</span>}
        </div>

        {state === "loading" && <p className="reveal-msg lcd-blink">DECRYPTING…</p>}
        {state === "burst" && <p className="reveal-shout">SIGNAL!</p>}
        {state === "error" && <p className="reveal-msg">{error}</p>}
        {state === "gone" && (
          <p className="reveal-msg">
            <Icon name="ghost" size={40} />
            <br />
            POOF. IT&apos;S GONE.
          </p>
        )}

        {state === "show" && data && (
          <div className="reveal-content">
            {data.url && data.kind === "voice" && (
              <GhostVoicePlayer
                url={data.url}
                onDone={() => {
                  setState("gone");
                  setData((d) => (d ? { ...d, url: null } : d));
                  onExpiredRef.current(target.id);
                  setTimeout(() => {
                    if (!closed.current) onCloseRef.current();
                  }, 1200);
                }}
              />
            )}
            {data.url && data.kind !== "voice" && (
              <img
                src={data.url}
                alt="Signal media"
                className="reveal-img"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            )}
            {data.sticker && <Icon name={data.sticker} size={96} />}
            {data.body && <p className="reveal-text">{data.body}</p>}
            {!data.url && !data.sticker && !data.body && <p className="reveal-msg">(NOTHING LEFT TO SHOW)</p>}
          </div>
        )}

        <div className="reveal-foot">
          {data?.mode === "ghost" && state === "show" && <span className="fine">Screenshots can&apos;t be blocked — share with care.</span>}
          <button type="button" className="btn btn-coral" onClick={close}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
