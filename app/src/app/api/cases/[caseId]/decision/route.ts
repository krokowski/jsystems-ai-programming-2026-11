import { decideCase } from "@/server/cases/decide";
import { errorResponse } from "@/server/errors";

// Next 16: dynamic route params are a Promise. The request body is ignored.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<Response> {
  try {
    const { caseId } = await params;
    return Response.json(await decideCase(caseId));
  } catch (err) {
    return errorResponse(err);
  }
}
