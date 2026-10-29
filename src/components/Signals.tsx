"use client";

import { formatLastSeen, formatLeft, msLeft } from "@/lib/expiry";
import { BADGES, POKES } from "@/lib/pixels";
import type { Badge, Poke, PokeKind, Profile, SignalDrop } from "@/lib/types";
import { Icon } from "./Icon";

export function Signals({
  top,
  tune,
  me,
  partner,
  pokes,
  drops,
  badges,
  cooling,
  onPoke,
  onStartDrop,
  onStartMove,
  onOpenDrop,
  onDeleteDrop,
}: {
  top?: React.ReactNode;
  tune?: React.ReactNode;
  me: Profile;
  partner: Profile;
  pokes: Poke[];
  drops: SignalDrop[];
  badges: Badge[];
  cooling: boolean;
  onPoke: (k: PokeKind) => void;
  onStartDrop: () => void;
  onStartMove: () => void;
  onOpenDrop: (d: SignalDrop) => void;
  onDeleteDrop: (d: SignalDrop) => void;
}) {
  const recent = [...pokes].reverse().slice(0, 15);
  const nameOf = (id: string) => (id === me.id ? "YOU" : partner.display_name);
  const shared = badges.filter((b) => b.user_id === me.id);

  return (
    <section className="panel-scroll signals" aria-label="Signals">
      {top}
      {tune && <div className="tune-row">{tune}</div>}
      <h2 className="panel-title">POKE {partner.display_name}</h2>
      <div className="poke-pad">
        {POKES.map((p) => (
          <button
            key={p.kind}
            type="button"
            className="poke-btn"
            onClick={() => onPoke(p.kind as PokeKind)}
            disabled={cooling}
            aria-label={`Send ${p.label}`}
          >
            <Icon name={p.kind} size={30} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="row-between gap">
        <button type="button" className="btn btn-coral grow" onClick={onStartDrop}>
          ▼ DROP A SIGNAL
        </button>
        <button type="button" className="btn btn-green grow" onClick={onStartMove}>
          ⇄ MOVE ME
        </button>
      </div>

      <h2 className="panel-title">ACTIVE DROPS</h2>
      {drops.length === 0 && <p className="empty small">NO DROPS ON THE MAP. LEAVE ONE ON A ROOFTOP!</p>}
      <ul className="drop-list">
        {[...drops].reverse().map((d) => {
          const mine = d.sender_id === me.id;
          const left = msLeft(d);
          return (
            <li key={d.id} className={`drop-row ${mine ? "mine" : "theirs"}`}>
              <Icon name={d.sticker ?? (d.mode === "ghost" ? "ghost" : "star")} size={24} />
              <div className="grow">
                <strong>{mine ? "YOUR DROP" : `FROM ${partner.display_name}`}</strong>
                <span>
                  {d.mode === "ghost" ? "GHOST" : "24H"}
                  {d.opened_at ? " · OPENED" : mine ? " · WAITING" : " · NEW!"}
                  {left !== null && ` · ${formatLeft(left)} LEFT`}
                </span>
              </div>
              <button type="button" className="btn btn-mini" onClick={() => onOpenDrop(d)}>
                {mine ? "VIEW" : "OPEN"}
              </button>
              {mine && (
                <button type="button" className="btn btn-mini btn-ghost" onClick={() => onDeleteDrop(d)} aria-label="Remove drop">
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="panel-title">SIGNAL LOG</h2>
      {recent.length === 0 && <p className="empty small">QUIET NIGHT. SEND THE FIRST POKE.</p>}
      <ul className="log">
        {recent.map((p) => (
          <li key={p.id}>
            <Icon name={p.kind} size={16} />
            <span>
              {nameOf(p.sender_id)} SENT {POKES.find((x) => x.kind === p.kind)?.label ?? p.kind.toUpperCase()}
            </span>
            <span className="muted">{formatLastSeen(p.created_at)}</span>
          </li>
        ))}
      </ul>

      <h2 className="panel-title">BADGES {shared.length}/{Object.keys(BADGES).length}</h2>
      <div className="badge-strip">
        {Object.entries(BADGES).map(([key, b]) => {
          const got = shared.some((x) => x.badge_key === key);
          return (
            <div key={key} className={`badge ${got ? "got" : "locked"}`} title={b.hint}>
              <Icon name={b.icon} size={22} />
              <span>{got ? b.title : "???"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
