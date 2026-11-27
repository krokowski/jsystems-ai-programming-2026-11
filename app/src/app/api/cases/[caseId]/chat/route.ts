import { chatCase } from "@/server/cases/chat";
import { errorResponse, validationFailed } from "@/server/errors";
import { pl } from "@/lib/i18n-pl";

// Next 16: dynamic route params are a Promise. The response is the UI message stream (SSE).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<Response> {
  try {
    const { caseId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw validationFailed({ message: pl.chat.error });
    }
    return await chatCase(caseId, body, { signal: request.signal });
  } catch (err) {
    return errorResponse(err);
  }
}
