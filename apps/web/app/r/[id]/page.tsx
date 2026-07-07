import { getShareInfo } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const info = await getShareInfo(id);
    const title = `${info.vibeEmoji} ${info.title}`;
    const description = `"${info.authorCut}" — can you read ${info.circleName} better?`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `/r/${id}`,
        siteName: "Mogji Circles",
        images: [{ url: `/api/v1/decodes/${id}/card.png`, width: 1080, height: 1350 }]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/v1/decodes/${id}/card.png`]
      }
    };
  } catch {
    return { title: "Mogji Circles" };
  }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let info: Awaited<ReturnType<typeof getShareInfo>>;
  try {
    info = await getShareInfo(id);
  } catch {
    notFound();
  }
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/v1/decodes/${id}/card.png`}
        alt={`${info.title} — reveal card from ${info.circleName}`}
        className="w-full rounded-[20px] border border-[var(--line)] shadow-[0_8px_24px_var(--shadow-flat)]"
      />
      <Link className="primary-button w-full" href={`/c/${info.code}?from=sharecard`}>
        <span aria-hidden="true">✦</span> Jump into {info.circleName}
      </Link>
      <p className="text-sm text-[var(--ink-muted)]">One friend sets an emoji decode about their real life. The circle guesses. The reveal shows who reads them best.</p>
    </main>
  );
}
