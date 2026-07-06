import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, closeDecode } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = verifyMemberToken(bearerToken(request));
    if (!token) return Response.json({ error: "Join a circle first." }, { status: 401 });
    const { id } = await params;
    return Response.json(await closeDecode(token, id));
  } catch (error) {
    return apiError(error);
  }
}
