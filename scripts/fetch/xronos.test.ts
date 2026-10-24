import { describe, expect, it } from "vitest";
import { missingColumns } from "./xronos.ts";

describe("XRONOS download", () => {
  it("checks the columns the ingest reads", () => {
    const header = "id,labnr,bp,std,cal_bp,cal_std,delta_c13,source_database,lab_name,material,species,feature,feature_type,site,country,lat,lng,site_type,periods,typochronological_units,ecochronological_units,reference";
    expect(missingColumns(header)).toEqual([]);
    expect(missingColumns("﻿" + header.replace("lng", "lon"))).toEqual(["lng"]);
  });
});
