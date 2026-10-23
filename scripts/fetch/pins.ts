// The upstream releases the raw data is pinned to, in one place for the fetch scripts, the ingests and
// `npm run data:update -- --check` (which compares them with the latest upstream). No side effects on import.
// Moving to a new release: change the constants here, fetch, rebuild (docs/data-updates.md).

/** Cliopatria on Zenodo: record of v0.2.1, doi:10.5281/zenodo.23128623. Keep in sync with data/curated/sources.yaml. */
export const CLIOPATRIA_RECORD = "23128623";

/** Allen Ancient DNA Resource on Harvard Dataverse (doi:10.7910/DVN/FFIDCW): the 1240K annotation table. */
export const AADR_DATASET = "doi:10.7910/DVN/FFIDCW";
export const AADR_RELEASE = "v66.p1";
export const AADR_FILE_ID = 13994515;
export const AADR_MD5 = "a2db1ac16f0f3558ed66fb251e1d5c7d";
export const AADR_FILE = `data/raw/aadr/${AADR_RELEASE}_1240K.aadr.PUB.anno`;
