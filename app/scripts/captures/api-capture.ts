// T45: capture the app's own API responses from the real running app.
// Run (in app/), against a server started on port 3010:
//   pnpm exec tsx scripts/captures/api-capture.ts <phase>
// phases: auto | always | invalid
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3010";
const OUT = join(process.cwd(), "tests/fixtures/captures");
const IMG = join(process.cwd(), "../assets/example-images");
const FILES = join(process.cwd(), "tests/fixtures/files");

type Json = unknown;
interface Result {
  status: number;
  json: Json;
  text: string;
}

function warsawDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(d);
}
function monthsAgo(n: number): string {
  const [y, m, d] = warsawDate(0).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - n, d));
  return dt.toISOString().slice(0, 10);
}

function mimeOf(file: string): string {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".txt")) return "text/plain";
  return "image/jpeg";
}

function save(name: string, data: Record<string, unknown>): void {
  mkdirSync(OUT, { recursive: true });
  const text = JSON.stringify(data, null, 2);
  if (/sk-or/i.test(text) || /authorization/i.test(text)) throw new Error(`secret-like content in ${name}`);
  writeFileSync(join(OUT, name), text + "\n");
  console.log("saved", name);
}

function respHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (k !== "set-cookie" && k !== "date") out[k] = v;
  });
  return out;
}

async function record(opts: {
  file: string;
  method: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody: Json;
  res: Response;
  notes: string;
  sse?: boolean;
  text?: string;
}): Promise<Result> {
  const text = opts.text ?? (await opts.res.text());
  let json: Json = null;
  const response: Record<string, unknown> = { status: opts.res.status, headers: respHeaders(opts.res) };
  if (opts.sse) {
    response.rawText = text;
  } else {
    try {
      json = JSON.parse(text);
      response.body = json;
    } catch {
      response.rawText = text;
    }
  }
  save(opts.file, {
    capturedAt: new Date().toISOString(),
    target: `${opts.method} ${BASE}${opts.path}`,
    request: { headers: opts.requestHeaders, body: opts.requestBody },
    response,
    notes: opts.notes,
  });
  console.log(opts.file, opts.res.status);
  return { status: opts.res.status, json, text };
}

interface CaseOpts {
  caseType?: string;
  category?: string;
  productName?: string;
  purchaseDate?: string;
  reason?: string;
  photo: string;
  photoBytes?: Uint8Array<ArrayBuffer>;
  photoDir?: string;
}

function buildForm(o: CaseOpts): { form: FormData; desc: Record<string, unknown> } {
  const form = new FormData();
  const desc: Record<string, unknown> = {};
  for (const k of ["caseType", "category", "productName", "purchaseDate", "reason"] as const) {
    const v = o[k];
    if (v !== undefined) {
      form.set(k, v);
      desc[k] = v;
    }
  }
  const bytes: Uint8Array<ArrayBuffer> = o.photoBytes ?? new Uint8Array(readFileSync(join(o.photoDir ?? IMG, o.photo)));
  form.set("photo", new Blob([bytes], { type: mimeOf(o.photo) }), o.photo);
  desc.photo = { fileName: o.photo, size: bytes.byteLength, contentType: mimeOf(o.photo) };
  return { form, desc };
}

async function create(o: CaseOpts, file: string | null, notes: string): Promise<Result> {
  const { form, desc } = buildForm(o);
  const res = await fetch(`${BASE}/api/cases`, { method: "POST", body: form });
  const reqHeaders = { "content-type": "multipart/form-data; boundary=<generated>" };
  if (file === null) {
    const text = await res.text();
    let json: Json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { status: res.status, json, text };
  }
  return record({
    file,
    method: "POST",
    path: "/api/cases",
    requestHeaders: reqHeaders,
    requestBody: { multipartFields: desc },
    res,
    notes,
  });
}

function idOf(r: Result): string {
  const j = r.json;
  if (j && typeof j === "object" && "caseId" in j && typeof j.caseId === "string") return j.caseId;
  throw new Error(`no caseId (status ${r.status}): ${r.text.slice(0, 200)}`);
}

async function post(caseId: string, step: "analysis" | "decision", file: string, notes: string): Promise<Result> {
  const path = `/api/cases/${caseId}/${step}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST" });
  return record({
    file,
    method: "POST",
    path: path.replace(caseId, "<caseId>"),
    requestHeaders: {},
    requestBody: null,
    res,
    notes,
  });
}

function chatBody(text: string): Record<string, unknown> {
  return {
    message: { id: `msg-${crypto.randomUUID()}`, role: "user", parts: [{ type: "text", text }] },
    trigger: "submit-message",
  };
}

async function chatStart(caseId: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${BASE}/api/cases/${caseId}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function chat(caseId: string, text: string, file: string, notes: string): Promise<Result> {
  const body = chatBody(text);
  const res = await chatStart(caseId, body);
  return record({
    file,
    method: "POST",
    path: "/api/cases/<caseId>/chat",
    requestHeaders: { "content-type": "application/json" },
    requestBody: body,
    res,
    notes,
    sse: res.headers.get("content-type")?.includes("text/event-stream") === true,
  });
}

async function phaseAuto(): Promise<void> {
  const today = warsawDate(0);
  const ret = (photo: string, date: string, name = "Galaxy S24"): CaseOpts => ({
    caseType: "return",
    category: "smartphone",
    productName: name,
    purchaseDate: date,
    photo,
  });

  // 1 create 201
  const c1 = await create(ret("phone-1.jpg", warsawDate(-3)), "api-create-201.json", "Valid return, Smartfon, purchase today-3 (Europe/Warsaw).");
  const id1 = idOf(c1);

  // 2 create 422
  await create(
    { category: "smartphone", productName: "a", purchaseDate: warsawDate(1), photo: "not-an-image.txt", photoDir: FILES },
    "api-create-422.json",
    "Several invalid fields at once: no caseType, productName 'a', purchaseDate tomorrow, photo is a text file.",
  );

  // 3 create 413
  const big = new Uint8Array(12 * 1024 * 1024);
  big.set([0xff, 0xd8, 0xff, 0xe0]);
  await create(
    { ...ret("big.jpg", warsawDate(-3)), photoBytes: big },
    "api-create-413.json",
    "Synthetic 12 MB body with a JPEG header (over the 11 MB request limit, A17).",
  );

  // 6 analysis 404
  await post(crypto.randomUUID(), "analysis", "api-analysis-404.json", "Unknown (random UUID) case id.");

  // 7 decision 409 on fresh case
  const fresh = idOf(await create(ret("phone-2.jpeg", warsawDate(-3)), null, ""));
  await post(fresh, "decision", "api-decision-409.json", "Decision requested on a fresh case before /analysis.");

  // 4 analysis auto
  await post(id1, "analysis", "api-analysis-200-auto.json", "Case 1, ANALYSIS_ESCALATION=auto (default).");
  // 8 decision
  await post(id1, "decision", "api-decision-200.json", "Case 1 after analysis; model decision.");

  // 9 date reject
  const dr = idOf(await create(ret("phone-3.jpeg", warsawDate(-30)), null, ""));
  await post(dr, "analysis", "api-analysis-200-auto-datereject.json", "Return purchased today-30 (date rule R1.1), analysis step.");
  await post(dr, "decision", "api-decision-200-date-reject.json", "Return purchased today-30, forced reject by the date rule.");

  // 10 chat answer
  await chat(id1, "Jaka była data zakupu?", "api-chat-200-answer.json", "Chat on case 1; SSE stored verbatim.");

  // 12 chat 409: A streaming, B immediately
  const bodyA = chatBody("Opisz krótko, co oznacza ta decyzja i jakie są kolejne kroki, w kilku zdaniach.");
  const resA = await chatStart(id1, bodyA);
  const bodyB = chatBody("A jaki jest okres zwrotu?");
  const resB = await chatStart(id1, bodyB);
  await record({
    file: "api-chat-409.json",
    method: "POST",
    path: "/api/cases/<caseId>/chat",
    requestHeaders: { "content-type": "application/json" },
    requestBody: bodyB,
    res: resB,
    notes: `Second chat request (id differs) sent right after the first one's response headers arrived (request A status ${resA.status}) while A was still streaming.`,
  });
  await resA.text();

  // 11 complaint chat -> updateDecision
  for (let attempt = 1; attempt <= 2; attempt++) {
    const cc = await create(
      {
        caseType: "complaint",
        category: "laptop",
        productName: "ThinkPad X1",
        purchaseDate: monthsAgo(14),
        reason: "Zawias pękł podczas zwykłego otwierania laptopa.",
        photo: "laptop-1.png",
      },
      null,
      "",
    );
    const cid = idOf(cc);
    const an = await post(cid, "analysis", `api-analysis-200-complaint-${attempt}.json`, `Complaint case attempt ${attempt}, analysis step.`);
    const de = await post(cid, "decision", `api-decision-200-complaint-${attempt}.json`, `Complaint case attempt ${attempt}, decision step.`);
    console.log("complaint", attempt, an.status, de.status);
    const r = await chat(
      cid,
      "Laptop nigdy nie spadł ani nie był uderzony. Zawias pękł sam przy zwykłym otwieraniu, od początku trochę skrzypiał.",
      `api-chat-200-update-attempt${attempt}.json`,
      `Complaint chat attempt ${attempt}. data-decision chunk present: see rawText.`,
    );
    if (r.text.includes("data-decision")) {
      console.log("updateDecision fired on attempt", attempt);
      break;
    }
    console.log("no data-decision on attempt", attempt);
  }
  void today;
}

async function phaseAlways(): Promise<void> {
  const id = idOf(
    await create(
      { caseType: "return", category: "smartphone", productName: "Galaxy S24", purchaseDate: warsawDate(-3), photo: "phone-2.jpeg" },
      null,
      "",
    ),
  );
  await post(id, "analysis", "api-analysis-200-always.json", "Return, phone-2.jpeg, server started with ANALYSIS_ESCALATION=always (escalated path).");
}

async function phaseInvalid(): Promise<void> {
  const id = idOf(
    await create(
      { caseType: "return", category: "smartphone", productName: "Galaxy S24", purchaseDate: warsawDate(-3), photo: "phone-1.jpg" },
      null,
      "",
    ),
  );
  await post(id, "analysis", "api-analysis-502.json", "Server started with an invalid OpenRouter key; OpenRouter rejects the call.");
  await post(id, "decision", "api-decision-502.json", "Decision after the failed analysis (may not reach the AI).");
}

async function main(): Promise<void> {
  const phase = process.argv[2];
  if (phase === "auto") await phaseAuto();
  else if (phase === "always") await phaseAlways();
  else if (phase === "invalid") await phaseInvalid();
  else throw new Error("phase: auto | always | invalid");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
