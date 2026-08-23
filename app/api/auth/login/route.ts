import { NextResponse } from "next/server";
import {
  createSession,
  findUserByEmail,
  parseRequestBody,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;

    try {
      body = await parseRequestBody(req);
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "ORGANISER" | "CUSTOMER",
    });
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
