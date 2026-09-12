import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

async function proxy(
  request: NextRequest,
  path: string,
  init: RequestInit
) {
  const accessToken =
    request.headers.get("authorization") ||
    (request.cookies.get("accessToken")?.value ?? undefined)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (accessToken) {
    headers["Authorization"] = accessToken
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...((init.headers as Record<string, string>) ?? {}) },
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    return NextResponse.json(
      json ?? { error: `Backend request failed with status ${res.status}` },
      { status: res.status }
    )
  }
  return NextResponse.json(json, { status: res.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxy(request, `/api/designs/session/${id}`, { method: "GET" })
}