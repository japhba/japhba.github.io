// Server-side mirror of Artificial Analysis model data.
//
// The official AA API (/api/v2/data/llms/models, needs x-api-key) does NOT expose
// total parameter counts / model size, which is the whole point of the size chart.
// That data only lives in the embedded payload of the public /models page, so we
// scrape + parse it here (server-side) and cache the trimmed result on Netlify's
// edge for ~12h, so the heavy parse runs ~twice a day rather than per visitor.
//
// We also join in per-model output speed (median tokens/s). Speed lives in separate
// per-endpoint records keyed by a model UUID + prompt_length_type, so we collect
// those and attach a representative value (medium-length prompt) to each model.

const SRC = "https://artificialanalysis.ai/models";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);

// Representative output speed: prefer medium-length text, then fall back.
const PLT_PREF = ["medium", "medium_coding", "long", "100k"];
function pickSpeed(speedMap, id) {
  const r = speedMap[id];
  if (!r) return null;
  for (const k of PLT_PREF) if (r[k]) return r[k];
  return Object.values(r)[0] || null;
}

// Positive-or-null: AA uses 0 for "unset/unknown" pricing, which would break log axes.
const posnum = (x) => {
  const n = num(x);
  return n != null && n > 0 ? n : null;
};

function trim(m, speedMap) {
  const cr = m.model_creators || {};
  let act = m.inference_parameters_active_billions;
  if (act == null) act = m.activeParams;
  const sp = pickSpeed(speedMap, m.id);
  // Price: AA's headline blended figure is 3:1 input:output, in USD per 1M tokens.
  const pin = num(m.price_1m_input_tokens);
  const pout = num(m.price_1m_output_tokens);
  let price = pin != null && pout != null ? (3 * pin + pout) / 4 : null;
  if (price != null && price <= 0) price = null;
  // Cost: actual USD to run the full Artificial Analysis Intelligence Index eval —
  // distinct from per-token price (verbose reasoning models cost more at equal price).
  const iic = m.intelligence_index_cost;
  const cost = iic && typeof iic === "object" ? posnum(iic.total_cost) : null;
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
    speed: sp ? Math.round(sp.spd * 10) / 10 : null,
    ttft: sp && sp.ttft != null ? Math.round(sp.ttft * 100) / 100 : null,
    price: price != null ? Math.round(price * 1e4) / 1e4 : null,
    price_in: posnum(pin),
    price_out: posnum(pout),
    cost: cost != null ? Math.round(cost * 100) / 100 : null,
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

// Walk the flight string and pull (a) model records (slug + intelligence_index +
// parameters + is_open_weights) and (b) per-endpoint speed records (median_output_speed
// + model_id + prompt_length_type), then join speed onto each model by UUID.
function parseModels(flight) {
  const stack = [];
  let inStr = false,
    esc = false;
  const out = {};
  const speedMap = {};
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
      if (len > 300000) continue;
      const seg = flight.slice(s, i + 1);

      // (b) speed endpoint record (small)
      if (
        seg.indexOf('"median_output_speed":') !== -1 &&
        seg.indexOf('"model_id":"') !== -1 &&
        seg.indexOf('"prompt_length_type":') !== -1
      ) {
        let d;
        try {
          d = JSON.parse(seg);
        } catch {
          continue;
        }
        if (d && typeof d.median_output_speed === "number" && d.model_id) {
          const bucket = (speedMap[d.model_id] = speedMap[d.model_id] || {});
          bucket[d.prompt_length_type] = {
            spd: d.median_output_speed,
            ttft: num(d.median_time_to_first_answer_token),
          };
        }
        continue;
      }

      // (a) model record (large)
      if (len < 3000) continue;
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
  return Object.values(out).map((m) => trim(m, speedMap));
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
    // Keep anything plottable on either chart: needs intelligence, plus a size or a
    // speed. (The size chart filters params client-side; the speed chart filters speed.)
    const models = parseModels(flight).filter(
      (m) =>
        m.ii != null &&
        (m.params != null || m.speed != null || m.price != null || m.cost != null)
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
