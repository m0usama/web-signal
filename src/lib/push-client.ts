"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PushState = "unsupported" | "needs-install" | "blocked" | "off" | "on";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Must be called from a tap (browsers require it for the permission prompt). */
export async function enablePush(supabase: SupabaseClient): Promise<PushState> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("NOTIFICATIONS AREN'T SET UP ON THE SERVER YET");
  const state = await pushState();
  if (state === "needs-install" || state === "unsupported") return state;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_ua: navigator.userAgent.slice(0, 300),
  });
  if (error) throw error;
  return "on";
}

export async function disablePush(supabase: SupabaseClient): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}
