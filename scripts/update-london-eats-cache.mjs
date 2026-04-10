import { access, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kmlDir = path.join(rootDir, "content/post/london_eats/kml");
const outputFile = path.join(rootDir, "content/post/london_eats/restaurants.json");
const paramsFile = path.join(rootDir, "config/_default/params.yaml");
const hugoConfigFile = path.join(rootDir, "config/_default/hugo.yaml");
const defaultChromeBin =
  process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripCdata = (value = "") => {
  const trimmed = String(value).trim();
  const match = trimmed.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return match ? match[1] : trimmed;
};

const decodeXmlEntities = (value = "") =>
  stripCdata(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const normalizeWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

const normalizeQuery = (value = "") => normalizeWhitespace(value).toLowerCase();

const extractTag = (block, tagName) => {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? normalizeWhitespace(decodeXmlEntities(match[1])) : "";
};

const buildQuery = (point) => {
  const parts = [point.name, point.description].map(normalizeWhitespace).filter(Boolean);
  const joined = parts.join(", ");
  if (!joined) return "";
  return /london/i.test(joined) ? joined : `${joined}, London`;
};

const parsePlacemark = (block, category) => {
  const name = extractTag(block, "name");
  const description = extractTag(block, "description");
  const coordinates = extractTag(block, "coordinates");

  if (!name || !coordinates) return null;

  const [lngRaw, latRaw] = coordinates.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const query = buildQuery({ name, description });
  return {
    name,
    description,
    lat,
    lng,
    category,
    placeKey: normalizeQuery(query)
  };
};

const parseKml = (content, category) => {
  const placemarks = content.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi);
  const points = [];
  const seen = new Set();

  for (const match of placemarks) {
    const point = parsePlacemark(match[1], category);
    if (!point) continue;

    const dedupeKey = `${category}|${point.name}|${point.lat}|${point.lng}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    points.push(point);
  }

  return points;
};

const loadApiKey = async () => {
  if (process.env.HUGO_GOOGLE_MAPS_API_KEY) {
    return process.env.HUGO_GOOGLE_MAPS_API_KEY.trim();
  }

  if (process.env.GOOGLE_MAPS_API_KEY) {
    return process.env.GOOGLE_MAPS_API_KEY.trim();
  }

  const params = await readFile(paramsFile, "utf8");
  const match = params.match(/^\s*google_api_key:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  return match ? match[1].trim() : "";
};

const loadBaseUrl = async () => {
  const config = await readFile(hugoConfigFile, "utf8");
  const match = config.match(/^\s*baseURL:\s*['"]?([^'"\n]+)['"]?\s*(?:#.*)?$/m);
  return match ? match[1].trim() : "";
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when requesting ${url}`);
  }
  return response.json();
};

const findPlace = async (point, apiKey) => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  url.searchParams.set("input", buildQuery(point));
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", "place_id,name,formatted_address");
  url.searchParams.set("locationbias", `point:${point.lat},${point.lng}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);

  const data = await fetchJson(url);
  if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) {
    const reason = data.error_message ? ` - ${data.error_message}` : "";
    throw new Error(`Find Place failed for "${point.name}": ${data.status}${reason}`);
  }

  return Array.isArray(data.candidates) && data.candidates[0] ? data.candidates[0] : null;
};

const fetchPlaceDetails = async (placeId, apiKey) => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "place_id,name,formatted_address,rating,user_ratings_total,website,url"
  );
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);

  const data = await fetchJson(url);
  if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) {
    const reason = data.error_message ? ` - ${data.error_message}` : "";
    throw new Error(`Place Details failed for "${placeId}": ${data.status}${reason}`);
  }

  return data.result || null;
};

const loadChromeBin = async () => {
  try {
    await access(defaultChromeBin);
    return defaultChromeBin;
  } catch (error) {
    return "";
  }
};

const allocateDebugPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });

const waitForDebugger = async (port, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      // Retry until Chrome exposes the debugger endpoint.
    }

    await sleep(200);
  }

  throw new Error("Timed out waiting for headless Chrome to start.");
};

const createCdpClient = async (webSocketUrl) => {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;

  const openPromise = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener(
      "error",
      (event) => {
        reject(event.error || new Error("Failed to connect to the Chrome debugger."));
      },
      { once: true }
    );
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (typeof message.id === "number") {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(message.error.message || "Chrome debugger request failed."));
      } else {
        entry.resolve(message.result || {});
      }
      return;
    }

    listeners.forEach((listener) => listener(message));
  });

  socket.addEventListener("close", () => {
    pending.forEach(({ reject }) =>
      reject(new Error("Chrome debugger connection closed unexpectedly."))
    );
    pending.clear();
  });

  await openPromise;

  return {
    close: () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
    onEvent: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send: (method, params = {}, sessionId = "") =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        const payload = { id, method, params };
        if (sessionId) {
          payload.sessionId = sessionId;
        }
        socket.send(JSON.stringify(payload));
      }),
    waitFor: (predicate, timeoutMs = 30000) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          listeners.delete(handleEvent);
          reject(new Error("Timed out waiting for a Chrome debugger event."));
        }, timeoutMs);

        const handleEvent = (message) => {
          if (!predicate(message)) return;
          clearTimeout(timer);
          listeners.delete(handleEvent);
          resolve(message);
        };

        listeners.add(handleEvent);
      })
  };
};

const serializePlaceDetails = (place) => {
  if (!place) return null;

  return {
    place_id: place.place_id || "",
    name: place.name || "",
    formatted_address: place.formatted_address || "",
    rating: typeof place.rating === "number" ? place.rating : null,
    user_ratings_total:
      typeof place.user_ratings_total === "number" ? place.user_ratings_total : null,
    website: place.website || "",
    url: place.url || ""
  };
};

const collectPoints = async () => {
  const entries = (await readdir(kmlDir))
    .filter((name) => name.toLowerCase().endsWith(".kml"))
    .sort((left, right) => left.localeCompare(right));

  const points = [];
  for (const entry of entries) {
    const content = await readFile(path.join(kmlDir, entry), "utf8");
    const category = path.basename(entry, ".kml").toLowerCase().replace(/^london_restaurants_/, "");
    points.push(...parseKml(content, category));
  }

  points.sort(
    (left, right) =>
      left.category.localeCompare(right.category) ||
      left.name.localeCompare(right.name) ||
      left.description.localeCompare(right.description)
  );

  return points;
};

const runBrowserPlaceLookup = async (points, apiKey, baseUrl) => {
  const chromeBin = await loadChromeBin();
  if (!chromeBin) {
    throw new Error(
      "Google Chrome was not found. Set CHROME_BIN to a Chrome executable to enable browser-side enrichment."
    );
  }

  if (!baseUrl) {
    throw new Error("baseURL is missing from config/_default/hugo.yaml.");
  }

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "london-eats-chrome-"));
  const debugPort = await allocateDebugPort();
  const chrome = spawn(
    chromeBin,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${userDataDir}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank"
    ],
    {
      stdio: "ignore"
    }
  );

  let client = null;

  try {
    const version = await waitForDebugger(debugPort);
    client = await createCdpClient(version.webSocketDebuggerUrl);

    const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await client.send(
      "Target.attachToTarget",
      { targetId, flatten: true }
    );

    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    await client.send("Page.navigate", { url: baseUrl }, sessionId);
    await client.waitFor(
      (message) => message.method === "Page.loadEventFired" && message.sessionId === sessionId,
      30000
    );

    const browserScript = async ({ points, apiKey }) => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const normalizeWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

      const normalizeQuery = (value = "") => normalizeWhitespace(value).toLowerCase();

      const buildQuery = (point) => {
        const parts = [point.name, point.description].map(normalizeWhitespace).filter(Boolean);
        const joined = parts.join(", ");
        if (!joined) return "";
        return /london/i.test(joined) ? joined : `${joined}, London`;
      };

      const ensurePlacesApi = async () => {
        if (window.google && google.maps && google.maps.places && google.maps.places.PlacesService) {
          return;
        }

        if (window.google && google.maps && typeof google.maps.importLibrary === "function") {
          await google.maps.importLibrary("maps");
          await google.maps.importLibrary("places");
          if (google.maps.places && google.maps.places.PlacesService) {
            return;
          }
        }

        await new Promise((resolve, reject) => {
          const callbackName = `__leChromeReady_${Date.now()}`;
          window[callbackName] = () => resolve();
          const script = document.createElement("script");
          script.src =
            "https://maps.googleapis.com/maps/api/js?key=" +
            encodeURIComponent(apiKey) +
            "&libraries=places,marker&v=beta&callback=" +
            callbackName;
          script.async = true;
          script.onerror = () => reject(new Error("Failed to load the Google Maps JS API."));
          document.head.appendChild(script);
        });

        if (window.google && google.maps && typeof google.maps.importLibrary === "function") {
          await google.maps.importLibrary("maps");
          await google.maps.importLibrary("places");
        }

        if (!(window.google && google.maps && google.maps.places && google.maps.places.PlacesService)) {
          throw new Error("Google Places is unavailable in the browser context.");
        }
      };

      const serializePlace = (place) => {
        if (!place) return null;
        return {
          place_id: place.place_id || "",
          name: place.name || "",
          formatted_address: place.formatted_address || "",
          rating: typeof place.rating === "number" ? place.rating : null,
          user_ratings_total:
            typeof place.user_ratings_total === "number" ? place.user_ratings_total : null,
          website: place.website || "",
          url: place.url || ""
        };
      };

      await ensurePlacesApi();

      const mapEl = document.createElement("div");
      mapEl.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:16px;height:16px;overflow:hidden;";
      document.body.appendChild(mapEl);

      const map = new google.maps.Map(mapEl, {
        center: { lat: 51.5074, lng: -0.1278 },
        zoom: 11
      });
      const service = new google.maps.places.PlacesService(map);
      const statusOk = google.maps.places.PlacesServiceStatus.OK;

      const findPlace = (point) =>
        new Promise((resolve) => {
          service.findPlaceFromQuery(
            {
              query: buildQuery(point),
              fields: ["place_id", "name", "formatted_address"]
            },
            (results, status) => {
              resolve({
                place: Array.isArray(results) && results[0] ? results[0] : null,
                status
              });
            }
          );
        });

      const getDetails = (placeId) =>
        new Promise((resolve) => {
          service.getDetails(
            {
              placeId,
              fields: [
                "place_id",
                "name",
                "formatted_address",
                "rating",
                "user_ratings_total",
                "website",
                "url"
              ]
            },
            (detail, status) => {
              resolve({ detail, status });
            }
          );
        });

      const placeByKey = new Map();
      points.forEach((point) => {
        const key = point.placeKey || normalizeQuery(buildQuery(point));
        if (key && !placeByKey.has(key)) {
          placeByKey.set(key, point);
        }
      });

      const places = {};
      const errors = [];
      const uniquePoints = [...placeByKey.entries()];

      for (let index = 0; index < uniquePoints.length; index += 1) {
        const [placeKey, point] = uniquePoints[index];

        try {
          const found = await findPlace(point);
          if (found.status !== statusOk || !found.place || !found.place.place_id) {
            errors.push(`${point.name}: ${found.status || "NO_RESULT"}`);
            continue;
          }

          await sleep(180);
          const detail = await getDetails(found.place.place_id);
          if (detail.status === statusOk) {
            const serialized = serializePlace(detail.detail || found.place);
            if (serialized) {
              places[placeKey] = serialized;
            }
          } else {
            errors.push(`${point.name}: ${detail.status || "DETAILS_FAILED"}`);
          }
        } catch (error) {
          errors.push(`${point.name}: ${error.message || error}`);
        }

        await sleep(180);
      }

      return {
        places,
        errors
      };
    };

    const expression = `(${browserScript.toString()})(${JSON.stringify({ points, apiKey })})`;
    const evaluation = await client.send(
      "Runtime.evaluate",
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
        timeout: 600000
      },
      sessionId
    );

    if (evaluation.exceptionDetails) {
      throw new Error(
        evaluation.exceptionDetails.text || "The browser-side cache generation script failed."
      );
    }

    return evaluation.result && evaluation.result.value
      ? evaluation.result.value
      : { places: {}, errors: [] };
  } finally {
    if (client) {
      client.close();
    }

    chrome.kill("SIGKILL");
    await rm(userDataDir, { recursive: true, force: true });
  }
};

const main = async () => {
  const apiKey = await loadApiKey();
  const baseUrl = await loadBaseUrl();
  const points = await collectPoints();
  const uniquePlaceKeys = [...new Set(points.map((point) => point.placeKey).filter(Boolean))];
  const placeCache = new Map();
  let disabledReason = "";
  let shouldUseBrowserFallback = false;

  if (!apiKey) {
    disabledReason =
      "No Google Maps API key was found. Writing a points-only dataset without place enrichment.";
  } else {
    console.log(
      `Resolving ${uniquePlaceKeys.length} place lookups for ${points.length} map points...`
    );

    let completed = 0;
    for (const placeKey of uniquePlaceKeys) {
      const point = points.find((item) => item.placeKey === placeKey);
      completed += 1;

      if (!point) {
        continue;
      }

      console.log(`[${completed}/${uniquePlaceKeys.length}] ${point.name}`);

      try {
        const candidate = await findPlace(point, apiKey);
        if (candidate && candidate.place_id) {
          await sleep(120);
          const detail = await fetchPlaceDetails(candidate.place_id, apiKey);
          const serialized = serializePlaceDetails(detail || candidate);
          if (serialized) {
            placeCache.set(placeKey, serialized);
          }
        }
      } catch (error) {
        console.warn(`Lookup failed for "${point.name}": ${error.message}`);
        if (/referer restrictions/i.test(error.message) || /REQUEST_DENIED/i.test(error.message)) {
          shouldUseBrowserFallback = true;
          break;
        }
      }

      await sleep(120);
    }
  }

  if (shouldUseBrowserFallback && uniquePlaceKeys.length) {
    console.log("Falling back to headless Chrome for browser-side Places enrichment...");

    try {
      const browserResult = await runBrowserPlaceLookup(points, apiKey, baseUrl);
      Object.entries(browserResult.places || {}).forEach(([placeKey, place]) => {
        if (place) {
          placeCache.set(placeKey, place);
        }
      });

      if (Array.isArray(browserResult.errors) && browserResult.errors.length) {
        const preview = browserResult.errors.slice(0, 10);
        preview.forEach((message) => console.warn(`Browser lookup issue: ${message}`));
        if (browserResult.errors.length > preview.length) {
          console.warn(
            `Browser lookup reported ${browserResult.errors.length - preview.length} additional issues.`
          );
        }
      }
    } catch (error) {
      disabledReason =
        "Browser-side enrichment failed, so the updater wrote a points-only dataset. " +
        (error.message || error);
    }
  }

  const places = Object.fromEntries(
    [...placeCache.entries()].sort(([left], [right]) => left.localeCompare(right))
  );

  const dataset = {
    generatedAt: new Date().toISOString(),
    version: 1,
    points,
    places
  };

  await writeFile(outputFile, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  const resolvedCount = Object.keys(places).length;
  const missingCount = uniquePlaceKeys.length - resolvedCount;
  console.log(`Wrote ${outputFile}`);
  console.log(`Resolved ${resolvedCount} places, ${missingCount} missing.`);
  if (disabledReason) {
    console.warn(disabledReason);
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
