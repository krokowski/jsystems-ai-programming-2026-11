import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/cases/route";
import { VALID_FIELDS, buildCreateRequest, examplePhoto, setupTestEnv } from "../integration/helpers";

// TAC-06: POST /api/cases answers in < 1 s on the course VM with AI not involved.
// Runs in the `perf` Vitest project, which starts only after the unit and ui projects
// have finished (sequence.groupOrder), so parallel test files do not distort the timing.
beforeEach(() => {
  setupTestEnv();
});

describe("POST /api/cases timing (TAC-06)", () => {
  it("creates laptop-1.png (1.2 MB, 3024x3135) in under 1000 ms", async () => {
    // Warm-up: a running server has sharp, file-type and the route already loaded.
    const warmUp = await POST(buildCreateRequest(VALID_FIELDS, examplePhoto("phone-2.jpeg", "image/jpeg")));
    expect(warmUp.status).toBe(201);
    const request = buildCreateRequest(VALID_FIELDS, examplePhoto("laptop-1.png", "image/png"));
    const start = performance.now();
    const res = await POST(request);
    const elapsed = performance.now() - start;
    console.log(`laptop-1.png create: ${elapsed.toFixed(0)} ms`);
    expect(res.status).toBe(201);
    expect(elapsed).toBeLessThan(1000);
  });
});
