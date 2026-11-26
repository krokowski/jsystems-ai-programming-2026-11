import "server-only";

import type { AppUIMessage, CaseForm, DateRuleResult, DecisionRecord, ImageFindings, ScreeningResult } from "@/lib/schemas";

import { getConfig } from "../config";

export interface StoredImage {
  jpeg: Buffer;
  width: number;
  height: number;
  originalMime: "image/jpeg" | "image/png" | "image/webp";
  originalBytes: number;
}

export type CaseStatus = "created" | "analyzed" | "decided";

export interface Case {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: CaseStatus;
  form: CaseForm;
  image: StoredImage;
  thumbnailDataUrl: string;
  dateRule: DateRuleResult;
  screening: ScreeningResult | null;
  findings: ImageFindings | null;
  decision: DecisionRecord | null;
  decisionHistory: DecisionRecord[];
  messages: AppUIMessage[];
  chatBusy: boolean;
  chatBusySince: string | null;
}

export interface CaseRepository {
  /** Sets createdAt and expiresAt from the clock and TTL. */
  create(c: Omit<Case, "createdAt" | "expiresAt">): Case;
  /** Null when unknown or expired (expired entries are deleted). */
  get(id: string): Case | null;
  /** Replaces the stored value; refreshes nothing else. Null when unknown or expired. */
  update(id: string, patch: (c: Case) => Case): Case | null;
  delete(id: string): void;
  size(): number;
}

export interface RepositoryOptions {
  ttlMinutes: number;
  maxCases: number;
  now: () => Date;
}

const MAX_CASES = 500;

export class InMemoryCaseRepository implements CaseRepository {
  private readonly cases = new Map<string, Case>();
  private readonly ttlMs: number;
  private readonly maxCases: number;
  private readonly now: () => Date;

  constructor(opts: RepositoryOptions) {
    this.ttlMs = opts.ttlMinutes * 60_000;
    this.maxCases = opts.maxCases;
    this.now = opts.now;
  }

  create(c: Omit<Case, "createdAt" | "expiresAt">): Case {
    this.sweep();
    if (!this.cases.has(c.id)) {
      while (this.cases.size >= this.maxCases) {
        const oldest = this.cases.keys().next();
        if (oldest.done) break;
        this.cases.delete(oldest.value);
      }
    }
    const nowDate = this.now();
    const stored: Case = {
      ...c,
      createdAt: nowDate.toISOString(),
      expiresAt: new Date(nowDate.getTime() + this.ttlMs).toISOString(),
    };
    this.cases.set(stored.id, stored);
    return stored;
  }

  get(id: string): Case | null {
    this.sweep();
    return this.cases.get(id) ?? null;
  }

  update(id: string, patch: (c: Case) => Case): Case | null {
    this.sweep();
    const current = this.cases.get(id);
    if (current === undefined) return null;
    const next = patch(current);
    this.cases.set(id, next);
    return next;
  }

  delete(id: string): void {
    this.cases.delete(id);
  }

  size(): number {
    return this.cases.size;
  }

  private sweep(): void {
    const nowMs = this.now().getTime();
    for (const [id, c] of this.cases) {
      if (nowMs >= Date.parse(c.expiresAt)) {
        this.cases.delete(id);
      }
    }
  }
}

declare global {
  var __hsdcCaseRepository: CaseRepository | undefined;
}

export function getCaseRepository(): CaseRepository {
  const existing = globalThis.__hsdcCaseRepository;
  if (existing !== undefined) return existing;
  const repo = new InMemoryCaseRepository({
    ttlMinutes: getConfig().caseTtlMinutes,
    maxCases: MAX_CASES,
    now: () => new Date(),
  });
  globalThis.__hsdcCaseRepository = repo;
  return repo;
}

export function resetCaseRepositoryForTests(): void {
  globalThis.__hsdcCaseRepository = undefined;
}
