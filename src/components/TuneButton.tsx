"use client";

export type TuneStatus = "idle" | "waiting" | "playing";

/** "Play our tune" button. Shows a pixel equaliser while it's playing on the other phone. */
export function TuneButton({
  status,
  onPress,
  partnerName,
  wide,
}: {
  status: TuneStatus;
  onPress: () => void;
  partnerName: string;
  wide?: boolean;
}) {
  const label =
    status === "playing" ? `PLAYING FOR ${partnerName}` : status === "waiting" ? "CONNECTING…" : wide ? `♪ PLAY OUR TUNE FOR ${partnerName}` : "♪ TUNE";
  return (
    <button
      type="button"
      className={`btn btn-orange tune-btn status-${status} ${wide ? "wide" : ""}`}
      onClick={onPress}
      disabled={status !== "idle"}
      aria-live="polite"
      aria-label={status === "idle" ? `Play our tune on ${partnerName}'s phone` : label}
    >
      {status !== "idle" && <Equaliser />}
      <span className="tune-label">{status === "idle" || wide ? label : status === "waiting" ? "…" : "♪"}</span>
    </button>
  );
}

export function Equaliser() {
  return (
    <span className="eq" aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
