import { NextRequest, NextResponse } from 'next/server';

const getBackendBaseUrl = (request: NextRequest): string => {
  const backendUrl = process.env.API_BACKEND_URL?.trim();

  if (!backendUrl) {
    throw new Error('API_BACKEND_URL is not configured');
  }

  const backend = new URL(backendUrl.replace(/\/$/, ''));
  const publicHost = request.headers.get('host') || request.nextUrl.host;

  if (backend.host === publicHost) {
    throw new Error('API backend URL cannot point to the public site host');
  }

  return backend.toString().replace(/\/$/, '');
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