import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// AI SDK APIs deprecated in v7 (ADR-005 A14). The check runs in `pnpm lint`.
const deprecatedAiSdkSyntax = [
  {
    selector: "Identifier[name='toUIMessageStreamResponse']",
    message: "Deprecated in AI SDK v7: use createUIMessageStream + createUIMessageStreamResponse.",
  },
  {
    selector: "Identifier[name='generateObject']",
    message: "Deprecated in AI SDK v7: use generateText with Output.object.",
  },
  {
    selector: "Identifier[name='streamObject']",
    message: "Deprecated in AI SDK v7: use streamText with Output.object.",
  },
  {
    selector: "Property[key.name='type'][value.value='image']",
    message: "Deprecated in AI SDK v7: send images as `file` parts with a mediaType.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": ["error", ...deprecatedAiSdkSyntax],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "ai", importNames: ["generateObject", "streamObject"], message: "Deprecated in AI SDK v7 (ADR-005 A14)." },
          ],
        },
      ],
    },
  },
  {
    // Generated vendor components (shadcn / AI Elements) are accepted as generated.
    files: ["src/components/ui/**", "src/components/ai-elements/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    // Lint fixture that must fail the A14 rule; checked by tests/lint/deprecated-api.test.ts.
    "tests/fixtures/lint/**",
  ]),
]);

export default eslintConfig;
