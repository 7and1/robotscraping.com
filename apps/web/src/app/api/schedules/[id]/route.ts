import { proxyRequest } from '../../_helpers/proxy';

export const runtime = 'edge';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return proxyRequest(request, `/schedules/${params.id}`);
}
