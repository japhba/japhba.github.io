// Server-side mirror of Artificial Analysis model data.
//
// The official AA API (/api/v2/data/llms/models, needs x-api-key) does NOT expose
// total parameter counts / model size, which is the whole point of this chart.
// That data only lives in the embedded payload of the public /models page, so we
// scrape + parse it here (server-side) and cache the trimmed result on Netlify's
// edge for ~12h, so the heavy parse runs ~twice a day rather than per visitor.

const SRC = "https://artificialanalysis.ai/models";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);

function trim(m) {
  const cr = m.model_creators || {};
  let act = m.inference_parameters_active_billions;
  if (act == null) act = m.activeParams;
  return {
    slug: m.slug,
    name: m.short_name || m.name,
    creator: (cr && cr.name) || null,
    params: num(m.parameters),
    active: num(act),
    ii: num(m.intelligence_index),
    ii_est: !!m.intelligence_index_is_estimated,
    open: !!m.is_open_weights,
    openness: m.open_source_categorization || null,
    reasoning: !!m.reasoning_model,
    release: m.release_date || null,
    gpqa: num(m.gpqa),
    aime25: num(m.aime25),
    hle: num(m.hle),
    mmlu_pro: num(m.mmlu_pro),
    coding: num(m.coding_index),
    license: m.license_name || null,
    url: m.model_url || null,
  };
}

// Concatenate the Next.js flight payload chunks the page ships inline.
function extractFlight(html) {
  const re = /self\.__next_f\.push\(\[\d+,\s*("(?:[^"\\]|\\.)*")\]\)/g;
  let out = "";
  let mm;
  while ((mm = re.exec(html)) !== null) {
    try {
      out += JSON.parse(mm[1]);
    } catch {
      /* skip malformed chunk */
    }
  }
  return out;
}

// Walk the flight string and pull every balanced {...} that looks like a model
// record (has slug + intelligence_index + parameters + is_open_weights as fields).
function parseModels(flight) {
  const stack = [];
  let inStr = false,
    esc = false;
  const out = {};
  for (let i = 0; i < flight.length; i++) {
    const ch = flight[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push(i);
    else if (ch === "}") {
      const s = stack.pop();
      if (s == null) continue;
      const len = i - s;
      if (len < 3000 || len > 300000) continue;
      const seg = flight.slice(s, i + 1);
      if (
        seg.indexOf('"slug":"') === -1 ||
        seg.indexOf('"intelligence_index":') === -1 ||
        seg.indexOf('"parameters":') === -1 ||
        seg.indexOf('"is_open_weights":') === -1
      )
        continue;
      let d;
      try {
        d = JSON.parse(seg);
      } catch {
        continue;
      }
      if (
        d &&
        typeof d === "object" &&
        d.slug &&
        d.intelligence_index != null &&
        d.parameters != null &&
        "is_open_weights" in d
      ) {
        const prev = out[d.slug];
        if (!prev || Object.keys(d).length > prev.__n) {
          d.__n = Object.keys(d).length;
          out[d.slug] = d;
        }
      }
    }
  }
  return Object.values(out).map(trim);
}

export default async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  try {
    const res = await fetch(SRC, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!res.ok) throw new Error("upstream " + res.status);
    const html = await res.text();
    const flight = extractFlight(html);
    const models = parseModels(flight).filter(
      (m) => m.params != null && m.ii != null
    );
    if (models.length < 50) throw new Error("parsed too few models: " + models.length);

    const body = JSON.stringify({
      updated: new Date().toISOString(),
      count: models.length,
      source: SRC,
      models,
    });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Browser cache 1h; Netlify edge serves cached for 12h and refreshes in
        // the background for a day after that, so the scrape runs ~twice/day.
        "Cache-Control": "public, max-age=3600",
        "Netlify-CDN-Cache-Control":
          "public, durable, s-maxage=43200, stale-while-revalidate=86400",
        ...CORS,
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e && e.message ? e.message : e) }),
      { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }
};
