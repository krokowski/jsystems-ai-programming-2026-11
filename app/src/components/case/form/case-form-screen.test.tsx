import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DRAFT, type CaseFormScreenProps } from "@/components/case/flow/types";
import { pl } from "@/lib/i18n-pl";
import { CaseFormScreen } from "./case-form-screen";

const JPEG_BYTES = readFileSync(resolve(process.cwd(), "../assets/example-images/phone-2.jpeg"));

function jpegAs(name: string, type: string): File {
  return new File([new Uint8Array(JPEG_BYTES)], name, { type });
}

function setup(overrides: Partial<CaseFormScreenProps> = {}) {
  const onSubmit = vi.fn();
  const props: CaseFormScreenProps = {
    initialDraft: EMPTY_DRAFT,
    initialPhoto: null,
    serverErrors: {},
    formError: null,
    submitting: false,
    today: "2026-11-26",
    onSubmit,
    ...overrides,
  };
  const user = userEvent.setup({ applyAccept: false });
  const utils = render(<CaseFormScreen {...props} />);
  return { user, onSubmit, props, ...utils };
}

const f = pl.form;
let urlCounter = 0;

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => `blob:test/${urlCounter++}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
});

async function pickDate(user: ReturnType<typeof userEvent.setup>, iso: string): Promise<void> {
  await user.click(screen.getByRole("button", { name: /Data zakupu/ }));
  const day = document.querySelector<HTMLElement>(`[data-iso="${iso}"]`);
  if (!day) throw new Error(`no day ${iso}`);
  await user.click(day);
}

async function fillValid(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("radio", { name: /Zwrot/ }));
  await user.click(screen.getByRole("combobox", { name: f.categoryLabel }));
  await user.click(await screen.findByRole("option", { name: "Laptop" }));
  await user.type(screen.getByLabelText(f.productNameLabel), "  ThinkPad X1  ");
  await pickDate(user, "2026-11-20");
  await user.upload(screen.getByLabelText(f.photoLabel), jpegAs("photo.jpg", "image/jpeg"));
  await screen.findByText("photo.jpg");
}

describe("CaseFormScreen", () => {
  it("renders fields in AC-01 order with no radio preselected", () => {
    setup();
    const order = [
      f.caseTypeLegend,
      f.categoryLabel,
      f.productNameLabel,
      f.purchaseDateLabel,
      f.reasonLabel,
      f.photoLabel,
    ];
    const html = document.body.textContent ?? "";
    const positions = order.map((t) => html.indexOf(t));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(positions.every((p) => p >= 0)).toBe(true);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    radios.forEach((r) => expect(r).not.toBeChecked());
    expect(screen.getByRole("radiogroup", { name: f.caseTypeLegend })).toBeInTheDocument();
    expect(screen.getByText(f.caseTypeDescriptions.return)).toBeInTheDocument();
  });

  it("lists 9 categories in order", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("combobox", { name: f.categoryLabel }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(Object.values(f.categoryLabels));
  });

  it("toggles the reason suffix and helper texts with the case type", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /Zwrot/ }));
    expect(screen.getByLabelText(/^Powód/)).toBeInTheDocument();
    expect(screen.getByText(/\(opcjonalne\)/)).toBeInTheDocument();
    expect(screen.getByText(f.reasonHelper.return)).toBeInTheDocument();
    expect(screen.getByText(f.photoHelper.return)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Reklamacja/ }));
    expect(screen.getByText(/\(wymagane\)/)).toBeInTheDocument();
    expect(screen.getByText(f.reasonHelper.complaint)).toBeInTheDocument();
    expect(screen.getByText(f.photoHelper.complaint)).toBeInTheDocument();
  });

  it("requires a 10-char reason for complaints only", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("radio", { name: /Reklamacja/ }));
    await user.type(screen.getByLabelText(/^Powód/), "123456789");
    expect(screen.getByText("9 / 2000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: f.submit }));
    expect(await screen.findByText(f.errors.reasonTooShort)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not flag an empty reason for returns", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: /Zwrot/ }));
    await user.click(screen.getByRole("button", { name: f.submit }));
    await screen.findByText(f.errors.categoryRequired);
    expect(screen.queryByText(f.errors.reasonTooShort)).not.toBeInTheDocument();
  });

  it("disables future days, allows today and shows the chosen date", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Data zakupu/ }));
    expect(document.querySelector('[data-iso="2026-11-27"]')).toBeDisabled();
    expect(document.querySelector('[data-iso="2026-11-26"]')).toBeEnabled();
    await user.click(screen.getByRole("button", { name: f.previousMonth }));
    const day = document.querySelector<HTMLElement>('[data-iso="2026-10-15"]');
    if (!day) throw new Error("no day");
    await user.click(day);
    expect(screen.getByRole("button", { name: /Data zakupu/ })).toHaveTextContent("15.10.2026");
    await waitFor(() => expect(document.querySelector('[data-iso="2026-10-15"]')).toBeNull());
  });

  it("rejects an 11 MB file", async () => {
    const { user } = setup();
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(f.photoLabel), big);
    expect(await screen.findByText(f.errors.photoTooLarge)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: f.photoRemove })).not.toBeInTheDocument();
  });

  it("rejects text content and a fake .png by magic bytes", async () => {
    const { user } = setup();
    const input = screen.getByLabelText(f.photoLabel);
    await user.upload(input, new File(["hello world not image"], "note.txt", { type: "text/plain" }));
    expect(await screen.findByText(f.errors.photoFormat)).toBeInTheDocument();
    await user.upload(input, new File(["hello world not image"], "fake.png", { type: "image/png" }));
    expect(await screen.findByText(f.errors.photoFormat)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: f.photoRemove })).not.toBeInTheDocument();
  });

  it("accepts JPEG bytes regardless of name/type, replaces and removes", async () => {
    const { user } = setup();
    const input = screen.getByLabelText(f.photoLabel);
    await user.upload(input, jpegAs("photo.txt", "text/plain"));
    expect(await screen.findByText("photo.txt")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "photo.txt" })).toBeInTheDocument();
    await user.upload(input, jpegAs("second.jpg", "image/jpeg"));
    expect(await screen.findByText("second.jpg")).toBeInTheDocument();
    expect(screen.queryByText("photo.txt")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: f.photoRemove }));
    expect(screen.queryByText("second.jpg")).not.toBeInTheDocument();
  });

  it("shows errors for every required field on empty submit and focuses the first radio", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: f.submit }));
    for (const msg of [
      f.errors.caseTypeRequired,
      f.errors.categoryRequired,
      f.errors.productNameLength,
      f.errors.purchaseDateRequired,
      f.errors.photoRequired,
    ]) {
      expect(await screen.findByText(msg)).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getAllByRole("radio")[0]).toHaveFocus());
    expect(screen.getByLabelText(f.productNameLabel)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values once with trimmed data and the photo, even on double click", async () => {
    const { user, onSubmit } = setup();
    await fillValid(user);
    const submit = screen.getByRole("button", { name: f.submit });
    await user.dblClick(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [values, photo, draft] = onSubmit.mock.calls[0] ?? [];
    expect(values).toEqual({
      caseType: "return",
      category: "laptop",
      productName: "ThinkPad X1",
      purchaseDate: "2026-11-20",
      reason: "",
    });
    expect(photo.file.name).toBe("photo.jpg");
    expect(draft.purchaseDate).toBe("2026-11-20");
  });

  it("shows server errors under the photo and keeps values", async () => {
    setup({
      initialDraft: { ...EMPTY_DRAFT, caseType: "return", productName: "Moto" },
      serverErrors: { photo: f.errors.photoTooLarge },
    });
    const err = await screen.findByText(f.errors.photoTooLarge);
    expect(err).toBeInTheDocument();
    expect(screen.getByLabelText(f.productNameLabel)).toHaveValue("Moto");
    const group = screen.getByLabelText(f.photoLabel);
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(within(document.body).getByRole("radio", { name: /Zwrot/ })).toBeChecked();
  });

  it("disables submit while submitting and shows the form error", () => {
    setup({ submitting: true, formError: "Coś poszło nie tak" });
    expect(screen.getByRole("button", { name: f.submit })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Coś poszło nie tak");
  });
});
