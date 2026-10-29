"use client";

import type { Bootstrap, Message, Poke } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function Secret({ boot, messages, pokes, onClose }: { boot: Bootstrap; messages: Message[]; pokes: Poke[]; onClose: () => void }) {
  const days = Math.max(1, Math.ceil((Date.now() - Date.parse(boot.roomCreatedAt)) / 864e5));
  const hearts = pokes.filter((p) => p.kind === "heart" || p.kind === "fingerheart").length;
  return (
    <div className="secret" role="dialog" aria-modal="true" aria-label="Secret frequency">
      <div className="secret-panel">
        <p className="lcd">▓▒░ SECRET FREQUENCY ░▒▓</p>
        <div className="secret-pair">
          <Avatar avatarKey={boot.me.avatar_key} size={64} />
          <Icon name="heart" size={32} />
          <Avatar avatarKey={boot.partner.avatar_key} size={64} />
        </div>
        <ul className="secret-stats">
          <li>
            <strong>{days}</strong> DAY{days === 1 ? "" : "S"} ON THE SAME SIGNAL
          </li>
          <li>
            <strong>{messages.length}</strong> SIGNALS IN THE LOG
          </li>
          <li>
            <strong>{hearts}</strong> HEARTS THIS WEEK
          </li>
        </ul>
        <p className="secret-note">OUT OF EVERY CITY IN EVERY UNIVERSE, THIS SIGNAL FOUND YOU.</p>
        <button type="button" className="btn btn-coral" onClick={onClose}>
          CLOSE THE FREQUENCY
        </button>
      </div>
    </div>
  );
}
