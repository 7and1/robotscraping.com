import { proxyRequest } from '../_helpers/proxy';

export const runtime = 'edge';

export async function POST(request: Request): Promise<Response> {
  return proxyRequest(request, '/extract');
}
