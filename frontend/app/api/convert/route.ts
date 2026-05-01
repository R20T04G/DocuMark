import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBackendUrl() {
  return (process.env.BACKEND_URL ?? 'http://localhost:5152').replace(/\/$/, '');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const upstream = await fetch(`${getBackendUrl()}/api/convert`, {
      method: 'POST',
      body: formData,
    });

    const contentType = upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8';
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach the backend.';
    return NextResponse.json({ message }, { status: 502 });
  }
}