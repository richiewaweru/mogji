import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { answerDecode, apiError } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    if (!token) return Response.json({ error: "Join a circle first." }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as { chain?: string[]; prediction?: string | null; prediction_member_id?: string | null };
    const prediction = body.prediction_member_id || body.prediction || null;
    return Response.json(await answerDecode(token, id, body.chain ?? [], prediction));
  } catch (error) {
    return apiError(error);
  }
}
