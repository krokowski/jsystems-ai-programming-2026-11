import { createCase } from "@/server/cases/create";
import { errorResponse } from "@/server/errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const result = await createCase(request);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
