"use client";

import { Icon } from "./Icon";

export interface Toast {
  id: number;
  text: string;
  icon?: string;
  tone?: "info" | "love" | "warn" | "badge";
  action?: { label: string; run: () => void };
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone ?? "info"}`} role="status">
          {t.icon && <Icon name={t.icon} size={20} />}
          <span className="toast-text">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="btn btn-mini"
              onClick={() => {
                t.action!.run();
                onDismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="toast-x" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
