import { shareCardPayload } from "@/lib/db";
import { color } from "@mogji/tokens";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await shareCardPayload(id);
    const crown = payload.reveal?.readers.find((reader) => reader.crown);
    const truth = payload.reveal?.truthChain.join(" ") ?? "";
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1350" fill="${color.paper}"/>
  <rect width="1080" height="150" fill="${color.mogjiYellow}"/>
  <text x="54" y="95" font-size="42" font-weight="800" fill="${color.ink}">${escapeXml(payload.circle?.vibeEmoji ?? "")} ${escapeXml(payload.circle?.name ?? "Mogji")}</text>
  <text x="900" y="95" font-size="42" font-weight="800" fill="${color.ink}">Mogji</text>
  <text x="540" y="310" text-anchor="middle" font-size="76" font-weight="900" fill="${color.ink}">${escapeXml(payload.decode.puzzle.title)}</text>
  <text x="540" y="520" text-anchor="middle" font-size="112" fill="${color.ink}">${escapeXml(truth)}</text>
  <text x="540" y="710" text-anchor="middle" font-size="40" fill="${color.ink}">"${escapeXml(payload.decode.puzzle.authorCut)}"</text>
  <rect x="260" y="810" width="560" height="92" rx="46" fill="${color.paperRaised}" stroke="${color.candyBorder}" stroke-width="4"/>
  <text x="540" y="870" text-anchor="middle" font-size="36" font-weight="800" fill="${color.ink}">👑 ${escapeXml(crown?.displayName ?? "Someone")} read it best</text>
  <text x="540" y="1150" text-anchor="middle" font-size="30" fill="${color.inkMuted}">What would your circle have guessed?</text>
  <text x="540" y="1200" text-anchor="middle" font-size="30" fill="${color.inkMuted}">playmogji.com/c/${escapeXml(payload.circle?.code ?? "")}?from=sharecard</text>
</svg>`;
    return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Card unavailable.";
    return new Response(message, { status: 400 });
  }
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
