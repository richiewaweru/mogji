import { publicPuzzle } from "@mogji/core";
import { dailyWarmup } from "@/lib/seed";

export async function GET() {
  return Response.json({ puzzle: publicPuzzle(dailyWarmup) });
}
