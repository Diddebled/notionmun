import { describe, expect, it } from "vitest";
import ConferenceService from "./ConferenceService";
import ExcelJS from "exceljs";

describe("roster imports", () => {
  it("imports quoted CSV countries and names", async () => {
    const file = { name: "Roster.csv", text: async () => 'Country,Delegate,School\nBrazil,"Costa, Ana",School A\nFrance,Jean,School B' };
    const conference = await ConferenceService.parseConference(file);
    const committee = Object.values(conference.committees)[0];
    expect(committee.delegates).toHaveLength(2);
    expect(committee.delegates[0]).toMatchObject({ countryCode: "BRA", delegate: "Costa, Ana" });
  });

  it("imports TSV rows", async () => {
    const conference = await ConferenceService.parseConference({ name: "Roster.tsv", text: async () => 'Country\tDelegate\nJapan\tHana\nGhana\tAma' });
    expect(Object.values(conference.committees)[0].delegates).toHaveLength(2);
  });

  it("retains multi-committee Excel workbooks", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("DISEC").addRows([["Country", "Delegate"], ["Brazil", "Ana"]]);
    workbook.addWorksheet("SOCHUM").addRows([["Country", "Delegate"], ["France", "Jean"]]);
    const bytes = await workbook.xlsx.writeBuffer();
    const conference = await ConferenceService.parseConference({ name: "Conference.xlsx", arrayBuffer: async () => bytes });
    expect(Object.keys(conference.committees)).toEqual(["DISEC", "SOCHUM"]);
  });
});
