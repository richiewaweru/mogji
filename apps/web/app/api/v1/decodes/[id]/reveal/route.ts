import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, getReveal } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    if (!token) return Response.json({ error: "Join a circle first." }, { status: 401 });
    const { id } = await params;
    return Response.json(await getReveal(token, id));
  } catch (error) {
    return apiError(error);
  }
}
