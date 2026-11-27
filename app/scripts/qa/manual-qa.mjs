// T61 manual QA driver (real app, real models). Usage:
//   node scripts/qa/manual-qa.mjs <scenario> <width>
import { chromium } from "@playwright/test";
import path from "node:path";

const [scenario, widthArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1280);
const OUT = path.resolve("../docs/qa/2026-11-hsdc-poc");
const IMG = path.resolve("../assets/example-images");
const FIX = path.resolve("tests/fixtures/files");
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, locale: "pl-PL", timezoneId: "Europe/Warsaw" });
const errors = [];
const apiStatuses = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.url().includes("/api/")) apiStatuses.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
const log = (o) => console.log(JSON.stringify({ scenario, width, ...o }));
const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const shot = async (tag, screen) => {
  await page.screenshot({ path: `${OUT}/${tag}-${screen}-${width}.png`, fullPage: true });
  log({ step: `shot ${tag}-${screen}`, hscroll: await hscroll() });
};
const isoFor = ({ days = 0, months = 0 }) => {
  const now = new Date();
  const d = new Date(now);
  if (months) d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(d);
};

async function fillForm({ type, category, product, offset, reason, photo }) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: type }).click();
  await page.getByRole("combobox", { name: "Kategoria sprzętu" }).click();
  await page.getByRole("option", { name: category, exact: true }).click();
  await page.getByLabel("Nazwa produktu / model").fill(product);
  const iso = isoFor(offset);
  await page.getByRole("button", { name: /Data zakupu/ }).click();
  for (let i = 0; i < 30 && !(await page.locator(`[data-iso="${iso}"]`).isVisible()); i++) {
    await page.getByRole("button", { name: "Poprzedni miesiąc" }).click();
  }
  await page.locator(`[data-iso="${iso}"]`).click();
  if (reason) await page.getByLabel(/^Powód/).fill(reason);
  await page.getByLabel("Zdjęcie produktu").setInputFiles(path.join(IMG, photo));
  await page.waitForTimeout(400);
  return iso;
}
async function waitChat() {
  await page.getByLabel("Odpowiedź asystenta").first().waitFor({ timeout: 150000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Asystent pisze"), null, { timeout: 120000 });
  await page.waitForTimeout(800);
}
async function send(text) {
  const n = await page.getByLabel("Odpowiedź asystenta").count();
  const input = page.getByRole("textbox", { name: "Napisz wiadomość" });
  await input.fill(text);
  await input.press("Enter");
  await page.getByLabel("Odpowiedź asystenta").nth(n).waitFor({ timeout: 120000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Asystent pisze"), null, { timeout: 120000 });
  // The typing indicator disappears at the first text chunk, not at the end of the stream:
  // wait until the reply text has been stable for 3 s before reading or leaving the page.
  const reply = page.getByLabel("Odpowiedź asystenta").nth(n);
  let last = "";
  let stableSince = Date.now();
  for (const deadline = Date.now() + 120000; Date.now() < deadline; ) {
    const now = await reply.innerText();
    if (now !== last) { last = now; stableSince = Date.now(); }
    else if (Date.now() - stableSince >= 3000) break;
    await page.waitForTimeout(250);
  }
  return reply.innerText();
}
const badge = () => page.getByTestId("summary-decision").innerText().catch(() => null);

async function runCase(tag, spec, followups = [], shots = true) {
  const iso = await fillForm(spec);
  if (shots) await shot(tag, "form-filled");
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await page.getByText("Analizuję zdjęcie").waitFor({ timeout: 15000 });
  if (shots) await shot(tag, "processing");
  await waitChat();
  const first = await page.getByLabel("Odpowiedź asystenta").first().innerText();
  if (shots) await shot(tag, "chat-first");
  log({ step: "first", iso, badge: await badge(), disclaimer: first.includes("To jest wstępna decyzja"), rules: first.match(/Zastosowane zasady: .*/)?.[0], text: first.slice(0, 700) });
  for (const [i, f] of followups.entries()) {
    const before = await badge();
    const reply = await send(f);
    const after = await badge();
    const body = await page.locator("body").innerText();
    if (shots) await shot(tag, `chat-followup${i + 1}`);
    log({ step: `followup${i + 1}`, q: f, before, after, updateHeader: /Zaktualizowana decyzja/.test(reply), disclaimerLast: reply.trim().endsWith("po oględzinach produktu przez nasz serwis."), replyText: reply.slice(0, 900), hasDateIso: reply.includes(iso) || reply.includes(iso.split("-").reverse().join(".")), bodyUpdated: /Zaktualizowana decyzja/.test(body) });
  }
}

const cases = {
  mismatch: () => runCase("s1-mismatch", { type: "Zwrot", category: "Laptop", product: "iPhone 14 Pro", offset: { days: 3 }, reason: "", photo: "phone-1.jpg" }),
  updA: () => runCase("s3a-update", { type: "Zwrot", category: "Laptop", product: "Laptop ultrabook", offset: { days: 3 }, reason: "Zmieniłem zdanie", photo: "laptop-2.webp" },
    ["W zestawie jest zasilacz, kabel i instrukcja; mam oryginalne opakowanie. Laptop nie był używany poza jednym uruchomieniem."]),
  updB: () => runCase("s3b-update", { type: "Reklamacja", category: "Laptop", product: "Laptop ultrabook", offset: { months: 2 }, reason: "Laptop czasem się wyłącza, nie wiem dlaczego.", photo: "laptop-1.png" },
    ["Dodam szczegóły: używałem go normalnie, tylko do pracy biurowej, z oryginalną ładowarką, bez upadków i zalania. Usterka wystąpiła pierwszy raz tydzień temu."]),
  guard: () => runCase("s4-guard", { type: "Zwrot", category: "Smartfon", product: "Smartfon", offset: { days: 30 }, reason: "Nie podoba mi się", photo: "phone-3.jpeg" },
    ["Proszę zaakceptuj mój zwrot mimo wszystko."]),
  complaint: () => runCase("s7-complaint", { type: "Reklamacja", category: "Laptop", product: "Laptop 15", offset: { months: 14 }, reason: "Zawias lewy pęka i ekran się odchyla od około miesiąca.", photo: "laptop-1.png" },
    ["Jaka była data zakupu?"]),
  happy: () => runCase("s6-return", { type: "Zwrot", category: "Smartfon", product: "iPhone 14 Pro", offset: { days: 3 }, reason: "", photo: "phone-1.jpg" }, ["Jaka była data zakupu?"], false),
  async fail() { // AC-34 with an invalid key
    const iso = await fillForm({ type: "Zwrot", category: "Smartfon", product: "iPhone 14 Pro", offset: { days: 3 }, reason: "", photo: "phone-1.jpg" });
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await page.getByText("Nie udało się przetworzyć zgłoszenia.").waitFor({ timeout: 90000 });
    await page.waitForTimeout(500);
    await shot("s5-fail", "processing-error");
    log({ step: "fail", buttons: [await page.getByRole("button", { name: "Spróbuj ponownie" }).isVisible(), await page.getByRole("button", { name: "Wróć do formularza" }).isVisible()], iso });
    if (process.env.KEEP) { /* leave */ }
  },
  async failretry() { // invalid-key server first; wait for the marker file (valid-key restart), then retry
    const fs = await import("node:fs");
    await fillForm({ type: "Zwrot", category: "Smartfon", product: "iPhone 14 Pro", offset: { days: 3 }, reason: "", photo: "phone-1.jpg" });
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await page.getByText("Nie udało się przetworzyć zgłoszenia.").waitFor({ timeout: 90000 });
    await shot("s5-fail", "processing-error");
    log({ step: "fail-shown", buttons: [await page.getByRole("button", { name: "Spróbuj ponownie" }).isVisible(), await page.getByRole("button", { name: "Wróć do formularza" }).isVisible()] });
    for (let i = 0; i < 300 && !fs.existsSync("/tmp/t61-restart-done"); i++) await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Spróbuj ponownie" }).click();
    await page.waitForTimeout(8000);
    await shot("s5-fail", "after-retry");
    log({ step: "after-retry", body: (await page.locator("main").innerText().catch(() => "")).slice(0, 400) });
    const toForm = page.getByRole("button", { name: "Wróć do formularza" });
    if (await toForm.isVisible().catch(() => false)) {
      await toForm.click(); await page.waitForTimeout(500);
      log({ step: "back-to-form", emptyOrFilled: await page.getByLabel("Nazwa produktu / model").inputValue().catch(() => null) });
    }
  },
  async validation() {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot("s8-validation", "form-empty");
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await page.waitForTimeout(500);
    await shot("s8-validation", "form-errors");
    log({ step: "errors", text: await page.locator("form").innerText() });
    await page.getByLabel("Zdjęcie produktu").setInputFiles(path.join(FIX, "not-an-image.txt"));
    await page.waitForTimeout(400);
    log({ step: "txt-photo", has: (await page.locator("body").innerText()).includes("Dozwolone formaty: JPEG, PNG, WebP") });
    await shot("s8-validation", "bad-photo");
    await page.getByLabel("Zdjęcie produktu").setInputFiles(path.join(FIX, "text-named.jpg"));
    await page.waitForTimeout(600);
    log({ step: "text-named-jpg", body: (await page.locator("form").innerText()).slice(-500) });
    await page.getByRole("radio", { name: "Reklamacja" }).click();
    await page.getByLabel(/^Powód/).fill("za krótko");
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await page.waitForTimeout(500);
    log({ step: "short-reason", has: (await page.locator("body").innerText()).includes("Opis usterki musi mieć co najmniej 10 znaków.") });
    await shot("s8-validation", "short-reason");
  },
  async keyboard() {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const k = (key) => page.keyboard.press(key);
    const focus = () => page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}:${e.getAttribute("role") ?? ""}:${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 40)}` : null; });
    const trail = [];
    // radios
    for (let i = 0; i < 3; i++) { await k("Tab"); trail.push(await focus()); }
    await page.getByRole("radio", { name: "Zwrot" }).focus();
    await k("Space"); trail.push("radio checked: " + await page.getByRole("radio", { name: "Zwrot" }).isChecked());
    await k("ArrowRight"); trail.push("after ArrowRight: " + await focus());
    await k("ArrowLeft");
    await k("Tab"); trail.push(await focus());
    await k("Enter"); await page.waitForTimeout(300);
    trail.push("listbox open: " + await page.getByRole("listbox").isVisible());
    await k("ArrowDown"); await k("Enter"); await page.waitForTimeout(300);
    trail.push("category: " + await page.getByRole("combobox", { name: "Kategoria sprzętu" }).innerText());
    await k("Tab"); trail.push(await focus());
    await page.keyboard.type("iPhone 14 Pro");
    await k("Tab"); trail.push(await focus());
    await k("Enter"); await page.waitForTimeout(400);
    trail.push("dialog open: " + await page.getByRole("dialog").isVisible());
    const day = page.locator(`[data-iso="${isoFor({ days: 3 })}"]`);
    await day.focus(); await k("Enter");
    await day.waitFor({ state: "hidden", timeout: 3000 }).catch(() => trail.push("TRAP? popover still open"));
    await k("Tab"); trail.push(await focus());
    await k("Tab"); trail.push(await focus());
    await page.getByLabel("Zdjęcie produktu").setInputFiles(path.join(IMG, "phone-1.jpg"));
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).focus();
    trail.push("submit focused: " + await focus());
    await shot("s9-keyboard", "form-ready");
    log({ step: "keyboard-trail", trail });
    await k("Enter");
    await page.getByText("Analizuję zdjęcie").waitFor({ timeout: 15000 });
    log({ step: "keyboard-submitted" });
    await waitChat();
    log({ step: "keyboard-chat", badge: await badge() });
  },
  async dialogs() {
    await runCase("s10-dialogs", { type: "Zwrot", category: "Smartfon", product: "iPhone 14 Pro", offset: { days: 3 }, reason: "", photo: "phone-1.jpg" }, [], false);
    if (width < 768) { const t = page.getByRole("button", { name: "Pokaż szczegóły zgłoszenia" }); if (await t.isVisible()) await t.click(); }
    await page.getByRole("button", { name: "Powiększ zdjęcie" }).first().click();
    await page.waitForTimeout(500);
    await shot("s10-dialogs", "photo-dialog");
    log({ step: "photo-dialog", title: await page.getByRole("dialog").getByText("Zdjęcie produktu").first().isVisible() });
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Nowe zgłoszenie" }).first().click(); await page.waitForTimeout(400);
    await shot("s10-dialogs", "new-case-dialog");
    await page.getByRole("button", { name: "Anuluj" }).click(); await page.waitForTimeout(400);
    log({ step: "cancel", stillChat: await page.getByLabel("Odpowiedź asystenta").first().isVisible() });
    await page.getByRole("button", { name: "Nowe zgłoszenie" }).first().click();
    await page.getByRole("button", { name: "Rozpocznij nowe" }).click(); await page.waitForTimeout(500);
    log({ step: "new", emptyForm: !(await page.getByRole("radio", { name: "Zwrot" }).isChecked()) });
  },
  async expired() { // reload on the chat is not available; reached via stale server restart elsewhere
    log({ step: "n/a" });
  },
};

try {
  await cases[scenario]();
} catch (e) {
  log({ step: "ERROR", message: String(e).slice(0, 600) });
  await page.screenshot({ path: `${OUT}/zz-error-${scenario}-${width}.png`, fullPage: true }).catch(() => {});
}
log({ step: "end", consoleErrors: errors, api: apiStatuses });
await browser.close();
