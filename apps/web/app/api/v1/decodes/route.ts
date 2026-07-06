import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, publishDecode } from "@/lib/db";
import type { PuzzleJson } from "@mogji/core";

export async function POST(request: Request) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    if (!token) return Response.json({ error: "Join a circle first." }, { status: 401 });
    const body = (await request.json()) as { decode_id?: string; decodeId?: string; puzzle?: PuzzleJson };
    const decodeId = body.decode_id || body.decodeId;
    if (!decodeId) return Response.json({ error: "decode_id is required." }, { status: 400 });
    return Response.json({ decode: await publishDecode(token, decodeId, body.puzzle) });
  } catch (error) {
    return apiError(error);
  }
}
