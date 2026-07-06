"use client";

import { useState } from "react";

export default function NewCirclePage() {
  const [name, setName] = useState("The Group Chat");
  const [displayName, setDisplayName] = useState("Kevin");
  const [vibeEmoji, setVibeEmoji] = useState("🔥");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createCircle() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/v1/circles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, displayName, vibeEmoji })
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create circle.");
      return;
    }
    localStorage.setItem(`mogji:${data.code}:token`, data.member_token);
    window.location.href = `/c/${data.code}`;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-8">
      <div className="mb-8 text-6xl">{vibeEmoji}</div>
      <h1 className="mb-2 text-4xl font-black leading-tight">Start a circle</h1>
      <p className="mb-8 text-[var(--ink-muted)]">The first decode is already seeded so the loop is playable right away.</p>
      <label className="mb-4 grid gap-2 font-bold">
        Circle name
        <input className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] px-4" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="mb-4 grid gap-2 font-bold">
        Your display name
        <input className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] px-4" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label className="mb-6 grid gap-2 font-bold">
        Vibe emoji
        <input className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--paper-raised)] px-4 text-2xl" value={vibeEmoji} onChange={(event) => setVibeEmoji(event.target.value.slice(0, 4))} />
      </label>
      {error ? <p className="mb-4 rounded-2xl bg-[var(--paper-raised)] p-3 text-[var(--miss)]">{error}</p> : null}
      <button
        onClick={createCircle}
        disabled={busy}
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[var(--butter-from)] to-[var(--butter-to)] px-5 font-extrabold shadow-[0_8px_18px_var(--shadow-button)] disabled:opacity-60"
      >
        <span aria-hidden="true">+</span> {busy ? "Creating..." : "Create circle"}
      </button>
    </main>
  );
}
