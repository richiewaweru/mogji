import { adminReadout, apiError } from "@/lib/db";

export async function GET() {
  try {
    return Response.json({ circles: await adminReadout() });
  } catch (error) {
    return apiError(error);
  }
}
