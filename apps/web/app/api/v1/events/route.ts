import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, logEvent } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    const body = (await request.json()) as { name?: string; circleId?: string; payload?: Record<string, unknown> };
    if (!body.name) return Response.json({ error: "name is required." }, { status: 400 });
    return Response.json(await logEvent(token, { name: body.name, circleId: body.circleId, payload: body.payload }));
  } catch (error) {
    return apiError(error);
  }
}
