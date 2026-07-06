import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const secret = process.env.ANON_TOKEN_SECRET || "dev-secret-change-me";

export type MemberToken = {
  anonToken: string;
  memberId: string;
  circleId: string;
};

export function newAnonToken(): string {
  return randomUUID();
}

export function signMemberToken(payload: MemberToken): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyMemberToken(token: string | null | undefined): MemberToken | null {
  if (!token?.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MemberToken;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function sign(body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
