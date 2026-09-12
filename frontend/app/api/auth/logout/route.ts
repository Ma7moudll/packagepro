import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { success: true, message: "Logged out" },
    {
      headers: {
        "Set-Cookie": "pp_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    }
  )
}