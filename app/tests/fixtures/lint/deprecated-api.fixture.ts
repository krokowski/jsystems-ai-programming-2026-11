// Lint fixture: every line below must be reported by the ADR-005 A14 rule.
// This file is excluded from the normal lint run and from the typecheck.
import { generateObject } from "ai";

export const usesDeprecated = generateObject;
export const imagePart = { type: "image", image: "data:image/jpeg;base64,AAAA" };
