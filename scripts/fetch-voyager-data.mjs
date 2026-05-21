import { mkdir, writeFile } from "node:fs/promises";

const DAY = 86400000;
const STOP_TIME = process.env.STOP_TIME || new Date().toISOString().slice(0, 10);
const STEP_SIZE = process.env.STEP_SIZE || "20 d";

function jdToMs(jd) {
  return (jd - 2440587.5) * DAY;
}

function parseHorizonsVectors(text) {
  const start = text.indexOf("$$SOE");
  const end = text.indexOf("$$EOE");
  if (start < 0 || end < 0) throw new Error("Horizons result did not contain vector table markers.");

  const body = text.slice(start + 5, end).trim().split(/\r?\n/);
  const points = [];

  for (const raw of body) {
    const line = raw.trim();
    if (!line || line.startsWith("$$")) continue;

    const parts = line.split(",").map((s) => s.trim());
    if (parts.length >= 5) {
      const jd = Number(parts[0]);
      const x = Number(parts[2]);
      const y = Number(parts[3]);
      const z = Number(parts[4]);
      if (Number.isFinite(jd) && Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        const t = jdToMs(jd);
        points.push({
          t,
          date: new Date(t).toISOString().slice(0, 10),
          jd,
          x,
          y,
          z
        });
      }
      continue;
    }

    const xMatch = line.match(/\bX\s*=\s*([-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?)/);
    const yMatch = line.match(/\bY\s*=\s*([-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?)/);
    const zMatch = line.match(/\bZ\s*=\s*([-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?)/);
    const jdMatch = line.match(/^\s*([-+]?\d+\.\d+)/);
    if (xMatch && yMatch && zMatch && jdMatch) {
      const jd = Number(jdMatch[1]);
      const t = jdToMs(jd);
      points.push({
        t,
        date: new Date(t).toISOString().slice(0, 10),
        jd,
        x: Number(xMatch[1]),
        y: Number(yMatch[1]),
        z: Number(zMatch[1])
      });
    }
  }

  if (points.length < 20) throw new Error("Could not parse enough vector points.");
  return points.sort((a, b) => a.t - b.t);
}

async function fetchCraft({ id, name, startCandidates }) {
  let lastError;

  for (const startTime of startCandidates) {
    const url = new URL("https://ssd.jpl.nasa.gov/api/horizons.api");
    url.search = new URLSearchParams({
      format: "json",
      COMMAND: `'${id}'`,
      OBJ_DATA: "NO",
      MAKE_EPHEM: "YES",
      EPHEM_TYPE: "VECTORS",
      CENTER: "'@0'",
      START_TIME: `'${startTime}'`,
      STOP_TIME: `'${STOP_TIME}'`,
      STEP_SIZE: `'${STEP_SIZE}'`,
      OUT_UNITS: "AU-D",
      REF_PLANE: "ECLIPTIC",
      REF_SYSTEM: "ICRF",
      CSV_FORMAT: "YES",
      VEC_TABLE: "2"
    });

    console.log(`Fetching ${name} from ${startTime} to ${STOP_TIME}...`);
    const response = await fetch(url);
    if (!response.ok) {
      lastError = new Error(`${name}: HTTP ${response.status}`);
      continue;
    }

    const json = await response.json();
    if (json.error) {
      lastError = new Error(`${name}: ${json.error}`);
      console.warn(lastError.message);
      continue;
    }
    if (!json.result) {
      lastError = new Error(`${name}: no Horizons result returned.`);
      continue;
    }

    const points = parseHorizonsVectors(json.result);
    console.log(`${name}: ${points.length} points`);
    return { points, startTime };
  }

  throw lastError || new Error(`${name}: failed to fetch Horizons vectors.`);
}

const voyager1 = await fetchCraft({
  id: "-31",
  name: "Voyager 1",
  startCandidates: ["1977-Sep-05 14:00", "1977-Sep-06 00:00", "1977-Sep-07 00:00"]
});

const voyager2 = await fetchCraft({
  id: "-32",
  name: "Voyager 2",
  startCandidates: ["1977-Aug-20 16:00", "1977-Aug-21 00:00", "1977-Aug-22 00:00"]
});

const output = {
  generatedAt: new Date().toISOString(),
  source: "NASA/JPL Horizons API sampled state vectors, heliocentric, ecliptic, AU-D",
  stopTime: STOP_TIME,
  stepSize: STEP_SIZE,
  voyager1StartTime: voyager1.startTime,
  voyager2StartTime: voyager2.startTime,
  voyager1: voyager1.points,
  voyager2: voyager2.points
};

await mkdir("data", { recursive: true });
await writeFile("data/voyager_vectors.json", JSON.stringify(output));
console.log("Wrote data/voyager_vectors.json");
