"use client";

import { useEffect, useState } from "react";
import { LOGO } from "@/lib/pixels";
import type { Connection } from "@/lib/useRoom";
import type { Profile } from "@/lib/types";
import { PixelArt } from "./PixelArt";

export function Header({
  me,
  partner,
  partnerOnline,
  connection,
  unread,
  soundOn,
  onLogoTap,
  onEnableSound,
}: {
  me: Profile;
  partner: Profile;
  partnerOnline: boolean;
  connection: Connection;
  unread: number;
  soundOn: boolean;
  onLogoTap: () => void;
  onEnableSound: () => void;
}) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, []);

  const status =
    connection === "live" ? "LINK OK" : connection === "connecting" ? "LINKING…" : connection === "offline" ? "NO SIGNAL" : "RELINKING…";

  return (
    <header className="tracker-header">
      <button type="button" className="logo-btn" onClick={onLogoTap} aria-label="WEB//SIGNAL">
        <PixelArt sprite={LOGO} size={34} />
      </button>
      <div className="lcd header-lcd">
        <div className="lcd-row">
          <span className="lcd-title">WEB//SIGNAL</span>
          <span className={`lcd-status conn-${connection}`}>{status}</span>
        </div>
        <div className="lcd-row small">
          <span>
            <span className="dot on" /> {me.display_name}
          </span>
          <span>
            <span className={`dot ${partnerOnline ? "on" : "off"}`} /> {partner.display_name}
          </span>
          <span className="lcd-clock">{clock}</span>
        </div>
      </div>
      <div className="header-side">
        {unread > 0 && (
          <span className="unread-chip" aria-label={`${unread} unread`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {!soundOn && (
          <button type="button" className="btn btn-mini btn-orange" onClick={onEnableSound}>
            ♪ ON
          </button>
        )}
      </div>
    </header>
  );
}
