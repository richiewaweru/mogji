import { apiError, createCircle } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; vibeEmoji?: string; displayName?: string; seed_decode?: boolean; seedDecode?: boolean };
    const result = await createCircle({
      name: body.name || "New Circle",
      vibeEmoji: body.vibeEmoji || "🔥",
      displayName: body.displayName || "Setter",
      seedDecode: !(body.seed_decode === false || body.seedDecode === false)
    });
    return Response.json({ code: result.circle.code, member_token: result.memberToken, circle: result.circle, member: result.member });
  } catch (error) {
    return apiError(error);
  }
}
