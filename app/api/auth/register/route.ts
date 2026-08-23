import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, parseRequestBody } from "@/lib/auth";

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

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const requestedRole = String(body.role ?? "CUSTOMER").toUpperCase();
    const role = ["CUSTOMER", "ORGANISER"].includes(requestedRole)
      ? (requestedRole as "CUSTOMER" | "ORGANISER")
      : "CUSTOMER";

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Name, email, and a password with at least 6 characters are required.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with that email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not create account.",
      },
      { status: 500 }
    );
  }
}