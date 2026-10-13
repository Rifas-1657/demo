import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "iqrabook_admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;
  const expected = process.env.ADMIN_PASSWORD || "iqrabook2024";

  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ detail: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
