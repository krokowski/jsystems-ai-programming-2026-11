import "server-only";

import { generateText } from "ai";
import { describe, expect, it } from "vitest";

import type { AppConfig } from "@/server/config";

import { createModelRegistry, DATA_COLLECTION_DENY, roleSettings } from "./models";

const config: AppConfig = {
  openRouterApiKey: "test-key",
  llmModel: "vendor/llm-model",
  visionModel: "vendor/vision-model",
  decisionsModel: "vendor/decisions-model",
  screeningConfidenceThreshold: 0.8,
  analysisEscalation: "auto",
  policyDir: "/tmp/policies",
  caseTtlMinutes: 120,
};

interface Recorded {
  url: string;
  init: RequestInit | undefined;
}

function recordingFetch(calls: Recorded[]): typeof fetch {
  const recorder = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    throw new Error("recorded");
  };
  return recorder;
}

function parseBody(call: Recorded | undefined): Record<string, unknown> {
  const raw = call?.init?.body;
  if (typeof raw !== "string") throw new Error("request body is not a string");
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("request body is not an object");
  }
  return Object.fromEntries(Object.entries(parsed));
}

function field(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = obj[key];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${key} is not an object`);
  }
  return Object.fromEntries(Object.entries(value));
}

describe("roleSettings", () => {
  it("denies data collection and requests usage for every role", () => {
    expect(DATA_COLLECTION_DENY).toBe(true);
    for (const role of ["vision", "decision", "chat"] as const) {
      const s = roleSettings(role);
      expect(s.usage).toEqual({ include: true });
      expect(s.provider?.data_collection).toBe("deny");
    }
  });

  it("requires parameters for structured-output roles only", () => {
    expect(roleSettings("vision").provider?.require_parameters).toBe(true);
    expect(roleSettings("decision").provider?.require_parameters).toBe(true);
    expect(roleSettings("chat").provider?.require_parameters).toBeUndefined();
  });

  it("sets reasoning effort per role", () => {
    expect(roleSettings("decision").reasoning).toEqual({ effort: "medium" });
    expect(roleSettings("chat").reasoning).toEqual({ effort: "low" });
    expect(roleSettings("vision").reasoning).toBeUndefined();
  });
});

describe("createModelRegistry", () => {
  it("maps roles to model ids", () => {
    const registry = createModelRegistry({ config });
    expect(registry.modelId("vision")).toBe("vendor/vision-model");
    expect(registry.modelId("decision")).toBe("vendor/llm-model");
    expect(registry.modelId("chat")).toBe("vendor/llm-model");
    expect(registry.modelId("screening")).toBe("vendor/decisions-model");
  });

  it("falls back to the LLM model for vision when VISION_MODEL is unset", () => {
    const registry = createModelRegistry({
      config: { ...config, visionModel: config.llmModel },
    });
    expect(registry.modelId("vision")).toBe("vendor/llm-model");
  });

  it("exposes the injected fetch", () => {
    const calls: Recorded[] = [];
    const f = recordingFetch(calls);
    expect(createModelRegistry({ config, fetch: f }).fetch).toBe(f);
  });

  it("sends the decision request through the injected fetch with role settings", async () => {
    const calls: Recorded[] = [];
    const registry = createModelRegistry({ config, fetch: recordingFetch(calls) });
    await expect(
      generateText({ model: registry.languageModel("decision"), prompt: "x", maxRetries: 0 }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.endsWith("/chat/completions")).toBe(true);
    const body = parseBody(calls[0]);
    expect(body.model).toBe("vendor/llm-model");
    expect(field(body, "provider").data_collection).toBe("deny");
    expect(field(body, "provider").require_parameters).toBe(true);
    expect(field(body, "usage").include).toBe(true);
    expect(field(body, "reasoning").effort).toBe("medium");
  });

  it("sends the chat request with low reasoning effort", async () => {
    const calls: Recorded[] = [];
    const registry = createModelRegistry({ config, fetch: recordingFetch(calls) });
    await expect(
      generateText({ model: registry.languageModel("chat"), prompt: "x", maxRetries: 0 }),
    ).rejects.toThrow();
    const body = parseBody(calls[0]);
    expect(body.model).toBe("vendor/llm-model");
    expect(field(body, "reasoning").effort).toBe("low");
    expect(field(body, "provider").data_collection).toBe("deny");
  });

  it("sends the vision request to the vision model", async () => {
    const calls: Recorded[] = [];
    const registry = createModelRegistry({ config, fetch: recordingFetch(calls) });
    await expect(
      generateText({ model: registry.languageModel("vision"), prompt: "x", maxRetries: 0 }),
    ).rejects.toThrow();
    expect(parseBody(calls[0]).model).toBe("vendor/vision-model");
  });
});
