import { apiError, closeExpiredDecodes } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(await closeExpiredDecodes());
  } catch (error) {
    return apiError(error);
  }
}
