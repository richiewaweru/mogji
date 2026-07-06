import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, composeDraft, logEvent } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    if (!token) return Response.json({ error: "Join a circle first." }, { status: 401 });
    const body = (await request.json()) as { p1?: string; p2?: string; p3?: string; seconds?: number };
    const decode = await composeDraft(token.circleId, token.memberId, {
      p1: body.p1 || "",
      p2: body.p2 || "",
      p3: body.p3 || ""
    });
    await logEvent(token, { name: "composer_completed", payload: { seconds: body.seconds ?? null, decodeId: decode.id } });
    return Response.json({ decode });
  } catch (error) {
    return apiError(error);
  }
}
