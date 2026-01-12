import { proxyRequest } from '../_helpers/proxy';

export const runtime = 'edge';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return proxyRequest(request, `/schedules${url.search}`);
}

export async function POST(request: Request): Promise<Response> {
  return proxyRequest(request, '/schedules');
}
