import { apiError, createCircle } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; vibeEmoji?: string; displayName?: string };
    const result = await createCircle({
      name: body.name || "New Circle",
      vibeEmoji: body.vibeEmoji || "🔥",
      displayName: body.displayName || "Setter"
    });
    return Response.json({ code: result.circle.code, member_token: result.memberToken, circle: result.circle, member: result.member });
  } catch (error) {
    return apiError(error);
  }
}
