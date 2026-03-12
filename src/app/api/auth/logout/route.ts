import { NextRequest, NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
