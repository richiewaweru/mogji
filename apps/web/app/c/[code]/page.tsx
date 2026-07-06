import { getCircleHome } from "@/lib/db";
import type { Metadata } from "next";
import CircleClient from "./CircleClient";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  try {
    const home = await getCircleHome(code, null);
    return {
      title: `${home.circle.vibeEmoji} ${home.circle.name} on Mogji`,
      description: "Join the circle and decode the group chat.",
      openGraph: {
        title: `${home.circle.vibeEmoji} ${home.circle.name}`,
        description: "Who reads the group best?",
        url: `/c/${code}`,
        siteName: "Mogji Circles"
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
