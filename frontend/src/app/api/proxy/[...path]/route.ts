import { NextRequest, NextResponse } from "next/server";

const TARGET_BACKEND = (
  process.env.BACKEND_API_URL ||
  "https://civicpulse-api-i6ne.onrender.com/api/v1"
).replace(/\/+$/, "");

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const subpath = Array.isArray(path) ? path.join("/") : path || "";
  const targetUrl = new URL(`${TARGET_BACKEND}/${subpath}`);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header to avoid SSL/SNI mismatches with Cloudflare/Render
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  let body: BodyInit | null = null;
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    try {
      body = await request.arrayBuffer();
    } catch {
      body = null;
    }
  }

  try {
    const upstreamRes = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    const data = await upstreamRes.arrayBuffer();
    return new NextResponse(data, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    console.error("[Next.js API Proxy Error]", err);
    return NextResponse.json(
      { detail: "Unable to reach CivicPulse backend services. Service may be waking from sleep." },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = handleProxy;
