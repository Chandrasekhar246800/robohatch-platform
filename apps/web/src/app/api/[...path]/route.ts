import { NextRequest, NextResponse } from 'next/server';

const getBackendBaseUrl = (request: NextRequest): string => {
  const publicHost = request.headers.get('host') || request.nextUrl.host;

  const candidates = [
    process.env.API_BACKEND_URL?.trim(),
    'http://127.0.0.1:5000',
    process.env.NEXT_PUBLIC_API_URL?.trim(),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const backend = new URL(candidate.replace(/\/$/, ''));

      if (backend.host === publicHost) {
        continue;
      }

      return backend.toString().replace(/\/$/, '');
    } catch {
      continue;
    }
  }

  throw new Error('No backend API URL configured. Set API_BACKEND_URL to your Railway service URL.');
};

const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxyRequest(request: NextRequest, params: { path?: string[] }) {
  try {
    const backendBaseUrl = getBackendBaseUrl(request);
    const path = Array.isArray(params.path) ? params.path.join('/') : '';
    const targetUrl = new URL(`/api/${path}`, backendBaseUrl);
    targetUrl.search = request.nextUrl.search;

    const headers = new Headers();

    for (const [key, value] of request.headers.entries()) {
      if (!hopByHopHeaders.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    const publicOrigin = request.nextUrl.origin;
    headers.set('origin', request.headers.get('origin') || publicOrigin);
    headers.set('referer', request.headers.get('referer') || `${publicOrigin}${request.nextUrl.pathname}${request.nextUrl.search}`);
    headers.set('x-forwarded-host', request.headers.get('host') || request.nextUrl.host);
    headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      headers.set('x-forwarded-for', forwardedFor);
    }

    let body: ArrayBuffer | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.delete('content-length');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('set-cookie');

    const response = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });

    const setCookies = (backendResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      response.headers.append('set-cookie', cookie);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'API proxy failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> | { path?: string[] } }) {
  const params = await Promise.resolve(context.params);
  return proxyRequest(request, params);
}