import { CATALOG_NOTE, SERIES_CATALOG, type SeriesCatalogEntry } from "../series-catalog.js";

export interface SeriesCatalog {
  series: SeriesCatalogEntry[];
  note: string; // explains get_series accepts any other IADB code too
}

// Pure, no network: hand back the curated catalog plus the note telling the
// caller that get_series works with any IADB code, not only these.
export function listSeries(): SeriesCatalog {
  return { series: SERIES_CATALOG, note: CATALOG_NOTE };
}
