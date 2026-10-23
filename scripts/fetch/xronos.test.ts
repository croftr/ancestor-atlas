import { describe, expect, it } from "vitest";
import { missingColumns, nextAllowed } from "./xronos.ts";

describe("XRONOS download guard", () => {
  const at = "2026-10-23T10:00:00.000Z";
  const t = Date.parse(at);
  it("allows a first download", () => expect(nextAllowed(undefined)).toBe(0));
  it("waits a day after a request that worked", () => expect(nextAllowed({ requested: at, ok: true })).toBe(t + 24 * 3_600_000));
  it("waits an hour after one that failed", () => expect(nextAllowed({ requested: at, ok: false })).toBe(t + 3_600_000));
  it("checks the columns the ingest reads", () => {
    const header = "id,labnr,bp,std,cal_bp,cal_std,delta_c13,source_database,lab_name,material,species,feature,feature_type,site,country,lat,lng,site_type,periods,typochronological_units,ecochronological_units,reference";
    expect(missingColumns(header)).toEqual([]);
    expect(missingColumns("﻿" + header.replace("lng", "lon"))).toEqual(["lng"]);
  });
});
