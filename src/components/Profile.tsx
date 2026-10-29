"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push-client";
import { synth } from "@/lib/sound";
import { MIN_PASSWORD } from "@/lib/username";
import { BADGES } from "@/lib/pixels";
import type { Badge, Profile as ProfileT, Settings, Theme } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function ProfilePanel({
  me,
  settings,
  badges,
  soundUnlocked,
  onEnableSound,
  onSave,
  onRename,
  onChangePassword,
  supabase,
}: {
  supabase: SupabaseClient;
  me: ProfileT;
  settings: Settings;
  badges: Badge[];
  soundUnlocked: boolean;
  onEnableSound: () => void;
  onSave: (patch: Partial<Omit<Settings, "user_id">>) => void;
  onRename: (name: string) => Promise<void>;
  onChangePassword: (pw: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(me.display_name);
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const mine = badges.filter((b) => b.user_id === me.id);
  const [push, setPush] = useState<PushState | "busy">("busy");
  const [pushMsg, setPushMsg] = useState("");
  useEffect(() => {
    let alive = true;
    void pushState().then((st) => alive && setPush(st));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="panel-scroll profile" aria-label="Profile and settings">
      <div className="profile-card">
        <Avatar avatarKey={me.avatar_key} size={96} label={me.display_name} />
        <div>
          <p className="lcd big">{me.display_name}</p>
          <p className="muted">AVATAR {me.avatar_key.toUpperCase()} · {mine.length} BADGES</p>
        </div>
      </div>

      <form
        className="row-between gap"
        onSubmit={async (e) => {
          e.preventDefault();
          await onRename(name);
        }}
      >
        <input
          className="field grow"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          aria-label="Display name"
        />
        <button type="submit" className="btn btn-green" disabled={!name.trim() || name === me.display_name}>
          RENAME
        </button>
      </form>

      <h2 className="panel-title">SIGNAL SOUND</h2>
      {!soundUnlocked && (
        <button type="button" className="btn btn-orange wide" onClick={onEnableSound}>
          ♪ ENABLE SIGNAL SOUND
        </button>
      )}
      <label className="toggle-row">
        <span>SOUND ALERTS</span>
        <input type="checkbox" checked={settings.sound_on} onChange={(e) => onSave({ sound_on: e.target.checked })} />
      </label>
      <label className="toggle-row">
        <span>VOLUME</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            synth.setVolume(v);
            onSave({ volume: v });
          }}
        />
      </label>
      <div className="sound-tests">
        {(["message", "poke", "drop", "ghost"] as const).map((s) => (
          <button key={s} type="button" className="btn btn-mini" onClick={() => synth.play(s, true)} disabled={!soundUnlocked}>
            ▶ {s.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="fine">Sounds play while the app is open; turn on notifications below for when it&apos;s closed.</p>

      <h2 className="panel-title">NOTIFICATIONS</h2>
      {push === "needs-install" && (
        <p className="fine">
          On iPhone, notifications only work from the home-screen app: tap Share → <strong>Add to Home Screen</strong>, open WEB//SIGNAL from
          there, then come back here.
        </p>
      )}
      {push === "unsupported" && <p className="fine">This browser can&apos;t receive notifications.</p>}
      {push === "blocked" && <p className="fine">Notifications are blocked. Allow them for this site in your phone&apos;s settings, then try again.</p>}
      {(push === "off" || push === "on" || push === "busy") && (
        <button
          type="button"
          className={`btn ${push === "on" ? "btn-ghost" : "btn-green"} wide`}
          disabled={push === "busy"}
          onClick={async () => {
            setPush("busy");
            setPushMsg("");
            try {
              const next = push === "on" ? await disablePush(supabase) : await enablePush(supabase);
              setPush(next);
              if (next === "on") setPushMsg("YOU'LL GET POKES, SIGNALS AND TUNES EVEN WHEN THE APP IS CLOSED");
            } catch (e) {
              setPush(await pushState());
              setPushMsg(e instanceof Error ? e.message : "COULDN'T TURN ON NOTIFICATIONS");
            }
          }}
        >
          {push === "on" ? "🔕 TURN OFF NOTIFICATIONS" : push === "busy" ? "…" : "🔔 TURN ON NOTIFICATIONS"}
        </button>
      )}
      {pushMsg && <p className="fine">{pushMsg}</p>}
      <p className="fine">Notifications never show message contents on your lock screen.</p>

      <h2 className="panel-title">DISPLAY</h2>
      <div className="seg wide" role="radiogroup" aria-label="Theme">
        {(["auto", "night", "day"] as Theme[]).map((t) => (
          <button key={t} type="button" className={settings.theme === t ? "on" : ""} onClick={() => onSave({ theme: t })} aria-pressed={settings.theme === t}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <label className="toggle-row">
        <span>CALM MODE (FEWER EFFECTS)</span>
        <input type="checkbox" checked={settings.reduced_fx} onChange={(e) => onSave({ reduced_fx: e.target.checked })} />
      </label>

      <h2 className="panel-title">BADGES</h2>
      <div className="badge-grid">
        {Object.entries(BADGES).map(([key, b]) => {
          const got = mine.find((x) => x.badge_key === key);
          return (
            <div key={key} className={`badge ${got ? "got" : "locked"}`}>
              <Icon name={b.icon} size={28} />
              <strong>{got ? b.title : "LOCKED"}</strong>
              <span>{b.hint}</span>
            </div>
          );
        })}
      </div>

      <h2 className="panel-title">ACCOUNT</h2>
      <form
        className="row-between gap"
        onSubmit={async (e) => {
          e.preventDefault();
          setPwMsg((await onChangePassword(pw)) ?? "PASSWORD UPDATED");
          setPw("");
        }}
      >
        <input
          className="field grow"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={`NEW PASSWORD (${MIN_PASSWORD}+)`}
          aria-label="New password"
        />
        <button type="submit" className="btn btn-green" disabled={pw.length < MIN_PASSWORD}>
          SAVE
        </button>
      </form>
      {pwMsg && <p className="fine">{pwMsg}</p>}

      <div className="privacy">
        <Icon name="ghost" size={22} />
        <p>
          Ghost and 24-hour signals are deleted by the server and can&apos;t be opened again once they expire. They can&apos;t
          stop screenshots, screen recordings, or copies saved before they disappear. Messages are private to you two but are
          not end-to-end encrypted.
        </p>
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="btn btn-ghost wide">
          ⏻ SIGN OUT
        </button>
      </form>
    </section>
  );
}
