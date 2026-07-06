import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, getCircleHome } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const token = verifyMemberToken(bearerToken(request));
    return Response.json(await getCircleHome(code, token));
  } catch (error) {
    return apiError(error);
  }
}
