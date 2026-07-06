import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <div className="mb-8 text-6xl">🫶</div>
      <h1 className="mb-3 text-4xl font-black leading-tight">Mogji Circles</h1>
      <p className="mb-8 text-lg text-[var(--ink-muted)]">
        One friend sets a decode. Everyone reads it. The reveal names who read them best.
      </p>
      <Link
        href="/new"
        className="flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[var(--butter-from)] to-[var(--butter-to)] px-5 text-center font-extrabold text-[var(--ink)] shadow-[0_8px_18px_var(--shadow-button)]"
      >
        Start a circle
      </Link>
    </main>
  );
}
