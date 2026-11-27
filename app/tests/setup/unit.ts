import { vi } from "vitest";

// `server-only` throws when imported outside a React Server environment.
// Node-side tests run server modules directly, so the guard is neutralised here.
vi.mock("server-only", () => ({}));
