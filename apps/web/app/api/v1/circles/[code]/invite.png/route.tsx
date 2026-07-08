import { getInviteInfo } from "@/lib/db";
import { color, font } from "@mogji/tokens";
import { ImageResponse } from "@vercel/og";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const info = await getInviteInfo(code);
    const memberLabel = `${info.memberCount} ${info.memberCount === 1 ? "person" : "people"} decoding`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${color.butterFrom}, ${color.butterTo})`,
            color: color.ink,
            fontFamily: font.body,
            gap: 28
          }}
        >
          <div style={{ display: "flex", fontSize: 160 }}>{info.vibeEmoji}</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>{info.name}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: color.amberInk }}>Who reads the group best?</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "18px 34px",
              background: color.paperRaised,
              border: `4px solid ${color.candyBorder}`,
              fontSize: 30,
              fontWeight: 800
            }}
          >
            {memberLabel}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: color.inkMuted }}>playmogji.com/c/{info.code}</div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite unavailable.";
    return new Response(message, { status: 400 });
  }
}
