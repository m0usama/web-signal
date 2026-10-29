"use client";

import dynamic from "next/dynamic";
import type { Bootstrap } from "@/lib/types";

/** The game UI depends on window size, storage and audio, so it renders in the browser only. */
const SignalApp = dynamic(() => import("./SignalApp").then((m) => m.SignalApp), {
  ssr: false,
  loading: () => (
    <div className="boot-screen">
      <p className="lcd lcd-blink">BOOTING…</p>
    </div>
  ),
});

export function ClientApp({ boot }: { boot: Bootstrap }) {
  return <SignalApp boot={boot} />;
}
