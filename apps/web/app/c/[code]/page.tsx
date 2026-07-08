import { getCircleHome } from "@/lib/db";
import type { Metadata } from "next";
import CircleClient from "./CircleClient";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  try {
    const home = await getCircleHome(code, null);
    const title = `${home.circle.vibeEmoji} ${home.circle.name}`;
    const description = "🔥 We're playing Mogji — one of us sets an emoji riddle about their real life, the rest decode it. Think you can read us?";
    return {
      title: `${title} on Mogji`,
      description,
      openGraph: {
        title,
        description,
        url: `/c/${code}`,
        siteName: "Mogji Circles",
        images: [{ url: `/api/v1/circles/${code}/invite.png`, width: 1200, height: 630 }]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/v1/circles/${code}/invite.png`]
      }
    };
  } catch {
    return { title: "Mogji Circle" };
  }
}

export default async function CirclePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CircleClient code={code} />;
}
