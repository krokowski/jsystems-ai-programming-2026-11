---
applyTo: '**/*.ts,**/*.tsx'
description: 'Instructions and style guidelines for TypeScript React projects'
---
Never use `any`. Do not use type assertions (`as T`, `<T>x`); `as const` is allowed.

Annotate exported function parameters and return types; local variables may rely on inference.
Narrow unknown data with schema parsing (e.g. zod) or type guards so it is safe at execution time.
If the application's nested `AGENTS.md` defines stricter TypeScript rules, follow it.

