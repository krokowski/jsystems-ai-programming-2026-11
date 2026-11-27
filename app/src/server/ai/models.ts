import "server-only";

import {
  createOpenRouter,
  type OpenRouterChatSettings,
  type OpenRouterProvider,
} from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import { type AppConfig, getConfig } from "@/server/config";

export type ModelRole = "vision" | "decision" | "chat";

// Flip only if spikes S1/S2 show that "deny" makes a model unroutable.
export const DATA_COLLECTION_DENY = true;

export interface ModelRegistry {
  provider: OpenRouterProvider;
  modelId(role: ModelRole | "screening"): string;
  languageModel(role: ModelRole): LanguageModel;
  fetch: typeof fetch;
}

export function roleSettings(role: ModelRole): OpenRouterChatSettings {
  const structured = role === "vision" || role === "decision";
  const provider: NonNullable<OpenRouterChatSettings["provider"]> = {
    ...(DATA_COLLECTION_DENY ? { data_collection: "deny" as const } : {}),
    ...(structured ? { require_parameters: true } : {}),
  };
  const settings: OpenRouterChatSettings = {
    usage: { include: true },
    ...(Object.keys(provider).length > 0 ? { provider } : {}),
  };
  if (role === "decision") settings.reasoning = { effort: "medium" };
  if (role === "chat") settings.reasoning = { effort: "low" };
  return settings;
}

export function createModelRegistry(opts: {
  config: AppConfig;
  fetch?: typeof fetch;
}): ModelRegistry {
  const { config } = opts;
  const fetchImpl: typeof fetch = opts.fetch ?? ((input, init) => fetch(input, init));
  const provider = createOpenRouter({
    apiKey: config.openRouterApiKey,
    compatibility: "strict",
    fetch: fetchImpl,
    appName: "Hardware Service Decision Copilot",
  });

  function modelId(role: ModelRole | "screening"): string {
    switch (role) {
      case "vision":
        return config.visionModel;
      case "screening":
        return config.decisionsModel;
      case "decision":
      case "chat":
        return config.llmModel;
    }
  }

  return {
    provider,
    modelId,
    languageModel: (role) => provider.chat(modelId(role), roleSettings(role)),
    fetch: fetchImpl,
  };
}

let cached: ModelRegistry | undefined;

export function getModelRegistry(): ModelRegistry {
  if (cached === undefined) {
    cached = createModelRegistry({ config: getConfig() });
  }
  return cached;
}

export function resetModelRegistryForTests(): void {
  cached = undefined;
}
