import { proxyRequest } from '../../_helpers/proxy';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return proxyRequest(request, `/jobs/${params.id}`);
}
