"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOGO } from "@/lib/pixels";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { PixelArt } from "@/components/PixelArt";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="login">
      <div className="crt" aria-hidden />
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error: err } = await getBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
          if (err) {
            setError(err.message.toLowerCase().includes("invalid") ? "WRONG EMAIL OR PASSWORD" : "COULDN'T CONNECT — TRY AGAIN");
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
          EMAIL
          <input
            className="field"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <button className="btn btn-coral wide" type="submit" disabled={busy}>
          {busy ? "CONNECTING…" : "JACK IN ▸"}
        </button>
      </form>
    </main>
  );
}
