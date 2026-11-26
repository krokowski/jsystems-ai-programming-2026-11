import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE, formatDatePl, todayInAppZone } from "./time";

describe("time", () => {
  it("uses Europe/Warsaw", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Warsaw");
  });

  it("todayInAppZone handles CET", () => {
    expect(todayInAppZone(new Date("2026-11-26T23:30:00Z"))).toBe("2026-11-27");
    expect(todayInAppZone(new Date("2026-11-26T12:00:00Z"))).toBe("2026-11-26");
  });

  it("todayInAppZone handles CEST boundary", () => {
    expect(todayInAppZone(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
    expect(todayInAppZone(new Date("2026-06-30T22:00:00Z"))).toBe("2026-07-01");
  });

  it("formatDatePl formats dd.MM.yyyy", () => {
    expect(formatDatePl("2026-11-03")).toBe("03.11.2026");
  });
});
