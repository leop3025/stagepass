import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE = "tb_session";

export function getAuthSecret() {
  const s = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me-32chars-min";
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ORGANISER" | "CUSTOMER";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const role = String(payload.role ?? "CUSTOMER");
    if (!['ADMIN', 'ORGANISER', 'CUSTOMER'].includes(role)) return null;

    return {
      id: String(payload.id),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}

export async function requireUser(roles?: SessionUser["role"][]) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const, user: null };
  if (roles && !roles.includes(user.role)) {
    return { error: "Forbidden" as const, status: 403 as const, user: null };
  }
  return { user, error: null, status: 200 as const };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

function parseLooselyTypedValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  return trimmed;
}

export async function parseRequestBody(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const candidate = raw.trim();
    if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
      throw new Error("Request body must be valid JSON.");
    }

    const inner = candidate.slice(1, -1).trim();
    if (!inner) return {};

    const parsed: Record<string, unknown> = {};
    for (const chunk of inner.split(",")) {
      const colonIndex = chunk.indexOf(":");
      if (colonIndex === -1) continue;
      const key = chunk.slice(0, colonIndex).trim().replace(/^['"]|['"]$/g, "");
      const value = parseLooselyTypedValue(chunk.slice(colonIndex + 1));
      parsed[key] = value;
    }

    return parsed;
  }
}
