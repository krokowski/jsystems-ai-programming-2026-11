import { afterEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";

import { ConfigError, getConfig, parseConfig, resetConfigForTests } from "./config";

const SECRET = "sk-or-secret-123";

const requiredEnv: Record<string, string> = {
  OPENROUTER_API_KEY: SECRET,
  LLM_MODEL: "x/llm-model",
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetConfigForTests();
});

describe("parseConfig: required variables", () => {
  it("throws ConfigError naming OPENROUTER_API_KEY when it is missing", () => {
    expect(() => parseConfig({ LLM_MODEL: "x/llm-model" })).toThrow(ConfigError);
    expect(() => parseConfig({ LLM_MODEL: "x/llm-model" })).toThrow(/OPENROUTER_API_KEY/);
  });

  it("treats an empty OPENROUTER_API_KEY as missing", () => {
    expect(() => parseConfig({ OPENROUTER_API_KEY: "", LLM_MODEL: "x/llm-model" })).toThrow(
      /OPENROUTER_API_KEY/,
    );
  });

  it("names LLM_MODEL but never the secret value when only LLM_MODEL is missing", () => {
    let caught: unknown;
    try {
      parseConfig({ OPENROUTER_API_KEY: SECRET });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    if (!(caught instanceof ConfigError)) throw new Error("unreachable");
    expect(caught.message).toContain("LLM_MODEL");
    expect(caught.message).not.toContain(SECRET);
  });
});

describe("parseConfig: defaults", () => {
  it("applies documented defaults when optional variables are unset", () => {
    const config = parseConfig(requiredEnv);

    expect(config.openRouterApiKey).toBe(SECRET);
    expect(config.llmModel).toBe("x/llm-model");
    expect(config.visionModel).toBe("x/llm-model");
    expect(config.decisionsModel).toBe("openai/gpt-6-luna-decisions");
    expect(config.screeningConfidenceThreshold).toBe(0.8);
    expect(config.analysisEscalation).toBe("auto");
    expect(config.caseTtlMinutes).toBe(120);
  });

  it("resolves the default policy directory to an absolute path ending in docs/policies", () => {
    const config = parseConfig(requiredEnv);

    expect(config.policyDir).toBe(resolve(process.cwd(), "../docs/policies"));
    expect(config.policyDir.startsWith("/")).toBe(true);
    expect(config.policyDir.endsWith("docs/policies")).toBe(true);
  });

  it("treats empty optional variables as unset", () => {
    const config = parseConfig({
      ...requiredEnv,
      VISION_MODEL: "",
      CASE_TTL_MINUTES: "",
      ANALYSIS_ESCALATION: "",
    });

    expect(config.visionModel).toBe("x/llm-model");
    expect(config.caseTtlMinutes).toBe(120);
    expect(config.analysisEscalation).toBe("auto");
  });
});

describe("parseConfig: overrides", () => {
  it("uses VISION_MODEL when set", () => {
    const config = parseConfig({ ...requiredEnv, VISION_MODEL: "x/y" });

    expect(config.visionModel).toBe("x/y");
    expect(config.llmModel).toBe("x/llm-model");
  });

  it("accepts explicit valid values for the remaining variables", () => {
    const config = parseConfig({
      ...requiredEnv,
      DECISIONS_MODEL: "x/decisions",
      SCREENING_CONFIDENCE_THRESHOLD: "0.5",
      ANALYSIS_ESCALATION: "always",
      POLICY_DIR: "/srv/policies",
      CASE_TTL_MINUTES: "45",
    });

    expect(config.decisionsModel).toBe("x/decisions");
    expect(config.screeningConfidenceThreshold).toBe(0.5);
    expect(config.analysisEscalation).toBe("always");
    expect(config.policyDir).toBe("/srv/policies");
    expect(config.caseTtlMinutes).toBe(45);
  });
});

describe("parseConfig: invalid values", () => {
  it.each(["1.5", "abc"])(
    "rejects SCREENING_CONFIDENCE_THRESHOLD=%s naming the variable",
    (value) => {
      expect(() => parseConfig({ ...requiredEnv, SCREENING_CONFIDENCE_THRESHOLD: value })).toThrow(
        /SCREENING_CONFIDENCE_THRESHOLD/,
      );
    },
  );

  it("rejects ANALYSIS_ESCALATION values outside auto|always", () => {
    expect(() => parseConfig({ ...requiredEnv, ANALYSIS_ESCALATION: "sometimes" })).toThrow(
      /ANALYSIS_ESCALATION/,
    );
  });

  it("rejects CASE_TTL_MINUTES=0", () => {
    expect(() => parseConfig({ ...requiredEnv, CASE_TTL_MINUTES: "0" })).toThrow(
      /CASE_TTL_MINUTES/,
    );
  });

  it("never echoes invalid values in the error message", () => {
    let caught: unknown;
    try {
      parseConfig({ ...requiredEnv, CASE_TTL_MINUTES: "0", OPENROUTER_API_KEY: SECRET });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    if (!(caught instanceof ConfigError)) throw new Error("unreachable");
    expect(caught.message).not.toContain(SECRET);
  });
});

describe("getConfig", () => {
  it("parses process.env and caches the result", () => {
    vi.stubEnv("OPENROUTER_API_KEY", SECRET);
    vi.stubEnv("LLM_MODEL", "x/llm-model");

    const first = getConfig();
    const second = getConfig();

    expect(first.llmModel).toBe("x/llm-model");
    expect(second).toBe(first);
  });

  it("returns a fresh object after resetConfigForTests", () => {
    vi.stubEnv("OPENROUTER_API_KEY", SECRET);
    vi.stubEnv("LLM_MODEL", "x/llm-model");

    const first = getConfig();
    resetConfigForTests();
    const second = getConfig();

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
