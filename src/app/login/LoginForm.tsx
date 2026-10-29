"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOGO } from "@/lib/pixels";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { PixelArt } from "@/components/PixelArt";
import { normaliseUsername, USERNAME_PATTERN, usernameToEmail } from "@/lib/username";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");

  return (
    <main className="login">
      <div className="crt" aria-hidden />
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setDetail("");
          if (!USERNAME_PATTERN.test(normaliseUsername(username))) {
            setError("WRONG USERNAME OR PASSWORD");
            setBusy(false);
            return;
          }
          let err: { message: string; status?: number } | null = null;
          try {
            ({ error: err } = await getBrowserSupabase().auth.signInWithPassword({ email: usernameToEmail(username), password }));
          } catch (e) {
            err = { message: e instanceof Error ? e.message : String(e) };
          }
          if (err) {
            const wrong = err.status === 400 || /invalid|credentials/i.test(err.message);
            setError(wrong ? "WRONG USERNAME OR PASSWORD" : "COULDN'T CONNECT — TRY AGAIN");
            if (!wrong) setDetail(err.message);
            setBusy(false);
            return;
          }
          router.replace("/");
          router.refresh();
        }}
      >
        <PixelArt sprite={LOGO} size={84} />
        <h1 className="login-title">WEB//SIGNAL</h1>
        <p className="lcd small">PRIVATE FREQUENCY · TWO HEROES ONLY</p>
        <label className="field-label">
          USERNAME
          <input
            className="field"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field-label">
          PASSWORD
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {detail && <p className="fine login-detail">{detail}</p>}
        <button className="btn btn-coral wide" type="submit" disabled={busy}>
          {busy ? "CONNECTING…" : "JACK IN ▸"}
        </button>
      </form>
    </main>
  );
}
