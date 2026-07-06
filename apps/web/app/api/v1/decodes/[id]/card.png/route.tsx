import { shareCardPayload } from "@/lib/db";
import { color, font } from "@mogji/tokens";
import { ImageResponse } from "@vercel/og";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await shareCardPayload(id);
    const crown = payload.reveal?.readers.find((reader) => reader.crown);
    const truth = payload.reveal?.truthChain.join(" ") ?? "";
    const circleLabel = `${payload.circle?.vibeEmoji ?? ""} ${payload.circle?.name ?? "Mogji"}`;
    const crownLabel = `👑 ${crown?.displayName ?? "Someone"} read it best`;
    const footer = `What would your circle have guessed? playmogji.com/c/${payload.circle?.code}?from=sharecard`;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: color.paper,
            color: color.ink,
            fontFamily: font.body
          }}
        >
          <div
            style={{
              height: 150,
              padding: "34px 54px",
              background: color.mogjiYellow,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 42,
              fontWeight: 800
            }}
          >
            <div style={{ display: "flex" }}>{circleLabel}</div>
            <div style={{ display: "flex" }}>Mogji</div>
          </div>
          <div
            style={{
              padding: 70,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 46
            }}
          >
            <div style={{ display: "flex", fontSize: 76, fontWeight: 900, textAlign: "center", lineHeight: 1.05 }}>{payload.decode.puzzle.title}</div>
            <div style={{ display: "flex", fontSize: 112 }}>{truth}</div>
            <div style={{ display: "flex", fontSize: 40, lineHeight: 1.25, textAlign: "center" }}>"{payload.decode.puzzle.authorCut}"</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "22px 34px",
                background: color.paperRaised,
                border: `4px solid ${color.candyBorder}`,
                fontSize: 36,
                fontWeight: 800
              }}
            >
              {crownLabel}
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: color.inkMuted }}>
              {footer}
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1350 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Card unavailable.";
    return new Response(message, { status: 400 });
  }
}
