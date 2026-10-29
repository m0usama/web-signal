"use client";

import type { Contact } from "@/lib/types";
import { Avatar } from "./Avatar";

/** Who you're talking to. Tap someone to open your chat with them. */
export function ContactBar({
  contacts,
  activeRoomId,
  onPick,
}: {
  contacts: Contact[];
  activeRoomId: string;
  onPick: (roomId: string) => void;
}) {
  return (
    <nav className="contact-bar" aria-label="Chats">
      {contacts.map((c) => {
        const on = c.roomId === activeRoomId;
        return (
          <button
            key={c.roomId}
            type="button"
            className={`contact-chip ${on ? "on" : ""}`}
            aria-current={on ? "true" : undefined}
            aria-label={`Chat with ${c.partner.display_name}${c.unread > 0 && !on ? `, ${c.unread} unread` : ""}`}
            onClick={() => !on && onPick(c.roomId)}
          >
            <Avatar avatarKey={c.partner.avatar_key} size={26} />
            <span className="contact-name">{c.partner.display_name}</span>
            {!on && c.unread > 0 && <span className="nav-badge contact-badge">{c.unread > 9 ? "9+" : c.unread}</span>}
          </button>
        );
      })}
    </nav>
  );
}
