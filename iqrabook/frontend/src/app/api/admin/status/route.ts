import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: request.cookies.get("iqrabook_admin")?.value === "1" });
}
