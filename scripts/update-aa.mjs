// Refresh the committed Artificial Analysis snapshots used by the /misc AA charts.
//
// The interactive charts (layouts/aa{cube,speed,graph}/single.html) try a live
// fetch first, but that pointed at a Netlify Function site that no longer exists,
// so in practice they always fall back to the static snapshots in data/. This
// script regenerates those snapshots by scraping the same embedded payload the
// old Netlify Function did, so a daily GitHub Action keeps them current (new
// models like GLM 5.2 show up within a day instead of never).
//
// Parse logic is kept in sync with netlify/functions/aa-models.mjs by hand — if
// you change field extraction in one, mirror it in the other.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SRC = "https://artificialanalysis.ai/models";
const LEADERBOARD = "https://artificialanalysis.ai/leaderboards/models";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);
const posnum = (x) => {
  const n = num(x);
  return n != null && n > 0 ? n : null;
};

const PLT_PREF = ["medium", "long", "hundredK", "mediumParallel"];
// Returns { medianOutputSpeed, medianTimeToFirstAnswerToken }. Until mid-Nov
// 2026 this lived in performanceByPromptType; it is now m.headline (headline
// models) or top-level outputSpeed/timeToFirstAnswerToken (leaderboard rows).
function pickSpeed(m) {
  const r = m.performanceByPromptType;
  if (r) {
    for (const k of PLT_PREF) if (r[k]) return r[k];
    return Object.values(r)[0] || null;
  }
  const h = m.headline && typeof m.headline === "object" ? m.headline : m;
  if (num(h.outputSpeed) == null) return null;
  return {
    medianOutputSpeed: h.outputSpeed,
    medianTimeToFirstAnswerToken: num(h.timeToFirstAnswerToken),
  };
}

// The /leaderboards/models page embeds a lighter record per model (no slug,
// params, licence, cost total or most benchmarks). Map it to the same shape;
// main() fills the gaps from the headline payload and the previous snapshot.
function trimLeaderboard(l, slug) {
  const sc = l.scores || {};
  return trim({
    ...l,
    slug,
    creator: { name: l.modelCreatorName },
    releaseDate: null,
    hle: sc["humanitys-last-exam"],
    lcr: sc["artificial-analysis-long-context-reasoning"],
    intelligenceIndexCost: null,
  });
}

const slugify = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Fields the leaderboard rows lack that do not change once AA has measured a
// model, so carrying them over from the last snapshot is safe.
const STATIC_FIELDS = ["params", "active", "openness", "release", "gpqa", "aime25", "mmlu_pro", "coding", "agentic", "license", "cost"];

function trim(m) {
  const cr = m.creator || {};
  let act = m.inferenceParametersActiveBillions;
  const sp = pickSpeed(m);
  const pin = num(m.price1mInputTokens);
  const pout = num(m.price1mOutputTokens);
  let price = pin != null && pout != null ? (3 * pin + pout) / 4 : null;
  if (price != null && price <= 0) price = null;
  const iic = m.intelligenceIndexCost;
  const cost = iic && typeof iic === "object" ? posnum(iic.total) : null;
  // Long-context reasoning: AA-LCR, AA's successor to needle-in-a-haystack.
  // Stored 0-1 in the payload; we expose it as a percentage to plot as an axis.
  const lcr = num(m.lcr);
  return {
    slug: m.slug,
    name: m.shortName || m.name,
    creator: (cr && cr.name) || null,
    params: num(m.parameters),
    active: num(act),
    ii: num(m.intelligenceIndex),
    ii_est: !!m.intelligenceIndexIsEstimated,
    open: !!m.isOpenWeights,
    openness: m.openSourceCategorization || null,
    reasoning: !!m.isReasoning,
    release: m.releaseDate || null,
    gpqa: num(m.gpqa),
    aime25: num(m.aime25),
    hle: num(m.hle),
    mmlu_pro: num(m.mmluPro),
    coding: num(m.codingIndex),
    agentic: num(m.agenticIndex),
    license: m.licenseName || null,
    url: m.detailsUrl || m.externalUrl || (m.slug ? `/models/${m.slug}` : null),
    speed: sp ? Math.round(sp.medianOutputSpeed * 10) / 10 : null,
    ttft:
      sp && sp.medianTimeToFirstAnswerToken != null
        ? Math.round(sp.medianTimeToFirstAnswerToken * 100) / 100
        : null,
    price: price != null ? Math.round(price * 1e4) / 1e4 : null,
    price_in: posnum(pin),
    price_out: posnum(pout),
    cost: cost != null ? Math.round(cost * 100) / 100 : null,
    context: num(m.contextWindowTokens),
    lcr: lcr != null ? Math.round(lcr * 1000) / 10 : null,
  };
}

// --- Epoch AI Capabilities Index (ECI) -> AA intelligence conversion --------
// Epoch scores many models AA does not track. We fit a linear map from ECI to
// AA's index on the models both sources score, then convert the Epoch-only
// models. Converted rows are flagged (ii_est + ii_src) so the page can say so.
const EPOCH_ECI = "https://epoch.ai/data/eci_scores.csv";
const OPENROUTER = "https://openrouter.ai/api/v1/models";
const MIN_FIT_N = 30;

const normName = (s) => (s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

// Minimal CSV reader that honours double-quoted fields.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function fitLinear(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2;
  }
  const b = sxy / sxx, a = my - b * mx;
  return { a, b, r2: (sxy * sxy) / (sxx * syy), n };
}

// Epoch rows with no AA counterpart, converted to AA-scale intelligence.
async function epochConverted(aaModels) {
  const res = await fetch(EPOCH_ECI, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("epoch " + res.status);
  const [head, ...body] = parseCsv(await res.text());
  const col = (name) => head.indexOf(name);
  const iName = col("Display name"), iEci = col("eci"), iOrg = col("Organization"),
    iDate = col("date"), iGroup = col("Accessibility group");

  // one Epoch row per base model; keep the highest score if a name repeats
  const eci = new Map();
  for (const f of body) {
    const score = parseFloat(f[iEci]), key = normName(f[iName]);
    if (!key || isNaN(score)) continue;
    if (!eci.has(key) || score > eci.get(key).score) eci.set(key, { row: f, score });
  }
  // AA: best-effort variant per base model (Epoch scores the strongest setting)
  const best = new Map(), aaKeys = new Set();
  for (const m of aaModels) {
    const k = normName(m.name); aaKeys.add(k);
    if (m.ii != null && (!best.has(k) || m.ii > best.get(k).ii)) best.set(k, m);
  }
  const xs = [], ys = [];
  for (const [k, e] of eci) { const m = best.get(k); if (m) { xs.push(e.score); ys.push(m.ii); } }
  if (xs.length < MIN_FIT_N) throw new Error(`only ${xs.length} overlapping models for the fit`);
  const fit = fitLinear(xs, ys);
  const fitInfo = { n: fit.n, r2: +fit.r2.toFixed(3) };

  const out = [];
  for (const [k, e] of eci) {
    if (aaKeys.has(k)) continue;
    const f = e.row, ii = fit.a + fit.b * e.score;
    out.push({
      slug: "epoch-" + k, name: f[iName], creator: f[iOrg] || null,
      params: null, active: null, ii: Math.round(ii * 100) / 100, ii_est: true,
      ii_src: "epoch-eci", ii_fit: fitInfo,
      open: f[iGroup] === "Open weights", openness: null, reasoning: false,
      release: f[iDate] || null, gpqa: null, aime25: null, hle: null, mmlu_pro: null,
      coding: null, agentic: null, license: null, url: null, speed: null, ttft: null,
      price: null, price_in: null, price_out: null, cost: null, context: null, lcr: null,
    });
  }
  console.log(`epoch fit: n=${fit.n}, r2=${fitInfo.r2}, converted=${out.length}`);
  return out;
}

// Context window and per-token price for converted models, from OpenRouter's
// public list (keys: normalised display name, and the id's model part).
async function openRouterInfo(models) {
  const res = await fetch(OPENROUTER, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("openrouter " + res.status);
  const byKey = new Map();
  for (const m of (await res.json()).data || []) {
    if (m.id.includes(":")) continue;             // skip :batch / :free variants
    const p = m.pricing || {}, pin = parseFloat(p.prompt) * 1e6, pout = parseFloat(p.completion) * 1e6;
    const info = {
      context: num(m.context_length),
      price_in: pin > 0 ? Math.round(pin * 1e4) / 1e4 : null,
      price_out: pout > 0 ? Math.round(pout * 1e4) / 1e4 : null,
      price: pin > 0 && pout > 0 ? Math.round(((3 * pin + pout) / 4) * 1e4) / 1e4 : null,
    };
    const after = (m.name || "").includes(":") ? m.name.split(":").slice(1).join(":") : m.name;
    for (const key of [normName(after), normName(m.id.split("/").pop())]) {
      if (key && !byKey.has(key)) byKey.set(key, info);
    }
  }
  let hits = 0;
  for (const m of models) {
    const info = byKey.get(normName(m.name));
    if (!info) continue;
    Object.assign(m, info); hits++;
  }
  console.log(`openrouter: ${hits}/${models.length} converted models matched`);
}

// Cost to run the Intelligence Index for models AA does not price. Fit
// log(cost) on log(blended price) and intelligence over AA's own models, then
// apply it to converted models that have an OpenRouter price. Estimates are
// flagged cost_est; typical error is about 2.4x either way.
function fitCost(aaModels) {
  const rows = aaModels.filter((m) => m.cost != null && m.price != null && m.ii != null && !m.ii_src);
  const X = rows.map((m) => [1, Math.log(m.price), m.ii]), y = rows.map((m) => Math.log(m.cost));
  const k = 3, n = X.length;
  const A = Array.from({ length: k }, () => Array(k).fill(0)), B = Array(k).fill(0);
  for (let i = 0; i < n; i++)
    for (let p = 0; p < k; p++) {
      B[p] += X[i][p] * y[i];
      for (let q = 0; q < k; q++) A[p][q] += X[i][p] * X[i][q];
    }
  // Gauss-Jordan elimination on the normal equations
  for (let i = 0; i < k; i++) {
    const piv = A[i][i];
    for (let j = i; j < k; j++) A[i][j] /= piv;
    B[i] /= piv;
    for (let r = 0; r < k; r++)
      if (r !== i) {
        const f = A[r][i];
        for (let j = i; j < k; j++) A[r][j] -= f * A[i][j];
        B[r] -= f * B[i];
      }
  }
  const beta = B;
  const pred = X.map((x) => x[0] * beta[0] + x[1] * beta[1] + x[2] * beta[2]);
  const my = y.reduce((a, b) => a + b, 0) / n;
  const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const sse = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
  return { beta, n, r2: +(1 - sse / sst).toFixed(3) };
}

function estimateCost(converted, aaModels) {
  const fit = fitCost(aaModels);
  let n = 0;
  for (const m of converted) {
    if (m.cost != null || m.price == null || m.ii == null) continue;
    const [b0, b1, b2] = fit.beta;
    m.cost = Math.round(Math.exp(b0 + b1 * Math.log(m.price) + b2 * m.ii) * 100) / 100;
    m.cost_est = true;
    m.cost_fit = { n: fit.n, r2: fit.r2 };
    n++;
  }
  console.log(`cost fit: n=${fit.n}, r2=${fit.r2}, estimated=${n}`);
}

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

// Leaderboard rows keyed by AA's model id (raw, untrimmed).
function parseLeaderboard(flight) {
  const out = new Map();
  scanObjects(flight, 500, 50000, ['"release":{', '"intelligenceIndex":', '"isOpenWeights":'], (d) => {
    if (d.id && d.release && d.release.slug && d.intelligenceIndex != null && "isOpenWeights" in d && !out.has(d.id))
      out.set(d.id, d);
  });
  return out;
}

// Call accept(obj) for every JSON object in the flight text whose source length
// is within [min, max] and which contains all needles.
function scanObjects(flight, min, max, needles, accept) {
  const stack = [];
  let inStr = false,
    esc = false;
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
      if (len > max || len < min) continue;
      const seg = flight.slice(s, i + 1);
      if (needles.some((n) => seg.indexOf(n) === -1)) continue;
      let d;
      try {
        d = JSON.parse(seg);
      } catch {
        continue;
      }
      if (d && typeof d === "object") accept(d);
    }
  }
}

// Headline models, raw (untrimmed), keyed by slug.
function parseModelsRaw(flight) {
  const out = {};
  scanObjects(flight, 3000, 300000, ['"slug":"', '"intelligenceIndex":', '"parameters":', '"isOpenWeights":'], (d) => {
    if (d.slug && d.intelligenceIndex != null && "isOpenWeights" in d) {
      const prev = out[d.slug];
      if (!prev || Object.keys(d).length > prev.__n) {
        d.__n = Object.keys(d).length;
        out[d.slug] = d;
      }
    }
  });
  return Object.values(out);
}

function parseModels(flight) {
  return parseModelsRaw(flight).map((m) => trim(m));
}

async function fetchFlight(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error("upstream " + res.status + " for " + url);
  return extractFlight(await res.text());
}

async function main() {
  const flight = await fetchFlight(SRC);
  const headlineRaw = parseModelsRaw(flight);
  const headline = headlineRaw.map((m) => trim(m));
  const bySlug = new Map(headline.map((m) => [m.slug, m]));

  // The long tail. Until mid-Nov 2026 any /models/<slug> page embedded the
  // full ~300-model table; now they carry only the headline set, and the full
  // table lives on /leaderboards/models in a lighter per-model record. Its rows
  // have no slug, so reuse the previous snapshot's slug for the same model name
  // (keeps slugs stable) and carry over its static fields (params, licence...).
  let prev = [];
  try {
    prev = JSON.parse(await readFile(join(DATA_DIR, "aa_models.json"), "utf8"));
  } catch {
    /* first run */
  }
  const prevByName = new Map(prev.filter((m) => !m.ii_src).map((m) => [m.name, m]));
  const idToSlug = new Map(headlineRaw.map((m) => [m.id, m.slug]));
  let board = new Map();
  try {
    board = parseLeaderboard(await fetchFlight(LEADERBOARD));
  } catch (e) {
    console.log(`leaderboard fetch failed: ${e.message || e}`);
  }
  let longTail = 0;
  for (const [id, l] of board) {
    const hs = idToSlug.get(id);
    if (hs) {
      // headline model: only fill fields the headline payload lacks
      const m = bySlug.get(hs), t = trimLeaderboard(l, hs);
      for (const k of Object.keys(m)) if (m[k] == null && t[k] != null) m[k] = t[k];
      continue;
    }
    const old = prevByName.get(l.shortName) || prevByName.get(l.name);
    const slug = old ? old.slug : slugify(`${l.release.slug} ${l.suffix || ""}`);
    if (bySlug.has(slug)) continue;
    const m = trimLeaderboard(l, slug);
    if (old) for (const k of STATIC_FIELDS) if (m[k] == null && old[k] != null) m[k] = old[k];
    bySlug.set(slug, m);
    longTail++;
  }
  console.log(`leaderboard: ${board.size} rows, ${longTail} long-tail models added`);

  // AA's pages now list only current models, so models it has retired would
  // vanish from the charts. Keep their last scraped values, flagged retired.
  // Only when the scrape looks healthy, so a broken scrape cannot freeze the set.
  // But not across an Intelligence Index version change (AA rescales every
  // model), which shows up as models present in both scrapes shifting score.
  const cur = [...bySlug.values()];
  const prevBySlug = new Map(prev.filter((p) => !p.ii_src).map((p) => [p.slug, p]));
  const shifts = cur
    .filter((m) => m.ii != null && prevBySlug.get(m.slug)?.ii != null)
    .map((m) => Math.abs(m.ii - prevBySlug.get(m.slug).ii))
    .sort((a, b) => a - b);
  const medShift = shifts.length ? shifts[shifts.length >> 1] : Infinity;
  let kept = 0;
  if (board.size >= 50 && shifts.length >= 20 && medShift < 1) {
    for (const m of prevBySlug.values()) {
      if (bySlug.has(m.slug)) continue;
      // same model under a renamed variant (e.g. "GLM-5.3-Flash" -> "... (max)")
      if (cur.some((c) => normName(c.name) === normName(m.name) && Math.abs(c.ii - m.ii) < 0.3)) continue;
      bySlug.set(m.slug, { ...m, retired: true });
      kept++;
    }
  }
  console.log(
    `kept ${kept} retired models from the previous snapshot` +
      ` (median score shift ${medShift.toFixed(2)} over ${shifts.length} shared models)`
  );

  const all = [...bySlug.values()];

  // Epoch-only models get an intelligence score by conversion; each step is
  // best-effort so a failed fetch leaves the AA snapshot unchanged.
  let converted = [];
  try {
    converted = await epochConverted(all);
  } catch (e) {
    console.log("epoch conversion skipped:", e.message || e);
  }
  try {
    await openRouterInfo(converted);
  } catch (e) {
    console.log("openrouter lookup skipped:", e.message || e);
  }
  if (converted.length) estimateCost(converted, all);
  all.push(...converted);

  // Same plottability gate as the old function: needs intelligence plus at least
  // one quantitative axis. Each chart filters further client-side.
  const models = all.filter(
    (m) =>
      m.ii != null &&
      (m.params != null ||
        m.speed != null ||
        m.price != null ||
        m.cost != null ||
        m.context != null)
  );
  console.log(
    `headline: ${headline.length}, long tail added: ${longTail}`
  );
  if (models.length < 100)
    throw new Error("parsed too few models: " + models.length);

  // All three charts read a sibling snapshot of the same shape; they differ only
  // in which field they filter on, so the same superset works for each.
  const targets = ["aa_tradeoffs.json", "aa_speed.json", "aa_models.json"];
  for (const f of targets) {
    await writeFile(
      join(DATA_DIR, f),
      JSON.stringify(models, null, 0) + "\n",
      "utf8"
    );
  }
  const glm = models.find((m) => m.slug === "glm-5-2");
  console.log(
    `wrote ${models.length} models to ${targets.join(", ")}` +
      (glm ? `  (GLM 5.2 present: ii=${glm.ii?.toFixed(1)}, ctx=${glm.context}, lcr=${glm.lcr}%)` : "  (GLM 5.2 NOT found)")
  );
}

main().catch((e) => {
  console.error("update-aa failed:", e.message || e);
  process.exit(1);
});
