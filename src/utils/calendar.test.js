import { expect, it } from "vitest";
import { scheduleToCalendar } from "./calendar";

it("exports portable calendar times, escapes text, and skips undated items", () => {
  const result = scheduleToCalendar([{ id: "a", title: "Debate, A; B", body: "Line 1\nLine 2", start: "2026-11-11T09:00:00+07:00", end: "2026-11-11T10:00:00+07:00" }, { id: "b", title: "No date" }], new Date("2026-11-10T00:00:00Z"));
  expect(result).toContain("DTSTART:20261111T020000Z\r\nDTEND:20261111T030000Z"); expect(result).toContain("SUMMARY:Debate\\, A\\; B"); expect(result).toContain("DESCRIPTION:Line 1\\nLine 2"); expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(1);
});
it("folds UTF-8 descriptions without breaking characters", () => {
  const title = "คณะกรรมการ".repeat(30); const calendar = scheduleToCalendar([{ id: "thai", title, start: "2026-11-11T00:00:00Z" }]);
  expect(calendar.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true); expect(calendar.replace(/\r\n /g, "")).toContain(`SUMMARY:${title}`);
});
