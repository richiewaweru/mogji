import { bearerToken, verifyMemberToken } from "@/lib/auth";
import { apiError, joinCircle } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const body = (await request.json()) as { display_name?: string; displayName?: string; via_sharecard?: boolean; viaShareCard?: boolean };
    const existing = verifyMemberToken(bearerToken(request));
    const result = await joinCircle(code, body.display_name || body.displayName || "Someone", existing, Boolean(body.via_sharecard || body.viaShareCard));
    return Response.json({ member_token: result.memberToken, circle: result.circle, member: result.member });
  } catch (error) {
    return apiError(error);
  }
}
