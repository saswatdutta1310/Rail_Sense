/**
 * RailSense — NTES Bridge Server
 * 
 * A lightweight Express microservice that wraps the irctc-connect SDK.
 * The Python FastAPI backend calls this service on port 3001 to get
 * real live train data, instead of using mock data.
 * 
 * Endpoints:
 *   GET /track/:trainNo          — live running status + coordinates
 *   GET /info/:trainNo           — train route and schedule
 *   GET /station/:stationCode    — live arrivals/departures at a station
 *   GET /health                  — health check
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../backend/.env") });

const express = require("express");
const { trackTrain, getTrainInfo, liveAtStation } = require("irctc-connect");

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
const app  = express();
const PORT = process.env.NTES_BRIDGE_PORT || 3001;
const API_KEY = process.env.IRCTC_API_KEY;

console.log("[ntes-bridge] irctc-connect loaded successfully (no configure needed)");

app.use(express.json());

// ---------------------------------------------------------------------------
// Station coordinates cache (for trains where IRCTC returns station name
// but not GPS coords — we resolve via a known lookup table)
// ---------------------------------------------------------------------------
const STATION_COORDS = {
  "NDLS": { lat: 28.6139, lon: 77.2090, name: "New Delhi" },
  "NZM":  { lat: 28.5838, lon: 77.2502, name: "Hazrat Nizamuddin" },
  "CNB":  { lat: 26.4499, lon: 80.3319, name: "Kanpur Central" },
  "PNBE": { lat: 25.6122, lon: 85.1235, name: "Patna Junction" },
  "HWH":  { lat: 22.5958, lon: 88.2636, name: "Howrah Junction" },
  "MAS":  { lat: 13.0827, lon: 80.2707, name: "Chennai Central" },
  "SBC":  { lat: 12.9770, lon: 77.5730, name: "Bengaluru City" },
  "UBL":  { lat: 15.3647, lon: 75.1240, name: "Hubballi Junction" },
  "BCT":  { lat: 18.9696, lon: 72.8197, name: "Mumbai Central" },
  "CSTM": { lat: 18.9398, lon: 72.8355, name: "Mumbai CST" },
  "SC":   { lat: 17.4339, lon: 78.5005, name: "Secunderabad" },
  "JP":   { lat: 26.9219, lon: 75.7873, name: "Jaipur" },
  "ADI":  { lat: 23.0285, lon: 72.6021, name: "Ahmedabad" },
  "LKO":  { lat: 26.8467, lon: 80.9462, name: "Lucknow" },
  "BPL":  { lat: 23.2599, lon: 77.4126, name: "Bhopal" },
  "NGP":  { lat: 21.1458, lon: 79.0882, name: "Nagpur" },
  "BSB":  { lat: 25.3176, lon: 82.9739, name: "Varanasi" },
  "GHY":  { lat: 26.1445, lon: 91.7362, name: "Guwahati" },
  "BBS":  { lat: 20.2961, lon: 85.8245, name: "Bhubaneswar" },
  "TVC":  { lat: 8.4855,  lon: 76.9492, name: "Thiruvananthapuram" },
  "CBE":  { lat: 11.0168, lon: 76.9558, name: "Coimbatore" },
  "MDU":  { lat: 9.9252,  lon: 78.1198, name: "Madurai" },
  "ERS":  { lat: 9.9816,  lon: 76.2999, name: "Ernakulam" },
  "ST":   { lat: 21.1944, lon: 72.8342, name: "Surat" },
  "PNQ":  { lat: 18.5204, lon: 73.8567, name: "Pune" },
  "AGC":  { lat: 27.1767, lon: 78.0081, name: "Agra" },
  "ET":   { lat: 23.6693, lon: 77.0063, name: "Itarsi" },
};

function resolveCoords(stationCode, stationName) {
  // 1. Try by code
  const byCode = STATION_COORDS[stationCode?.toUpperCase()];
  if (byCode) return byCode;

  // 2. Try fuzzy match by name
  if (stationName) {
    const lower = stationName.toLowerCase();
    for (const [, v] of Object.entries(STATION_COORDS)) {
      if (v.name.toLowerCase().includes(lower) || lower.includes(v.name.toLowerCase())) {
        return v;
      }
    }
  }

  // 3. Fallback: rough centre of India
  return { lat: 20.5937, lon: 78.9629, name: stationName || stationCode || "Unknown" };
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ntes-bridge", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// GET /track/:trainNo
// Returns: { train_number, status, station_name, station_code, latitude,
//            longitude, delay_minutes, last_updated }
// ---------------------------------------------------------------------------
app.get("/track/:trainNo", async (req, res) => {
  const { trainNo } = req.params;
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

  try {
    const result = await trackTrain(trainNo, dateStr);

    if (!result || !result.success) {
      return res.status(404).json({
        error: "Train not found or no live data available",
        train_number: trainNo,
      });
    }

    const d = result.data;

    // Extract current station info
    let stationCode = "";
    let stationName = "";
    let delayMin = 0;

    if (Array.isArray(d)) {
      if (d.length > 0 && d[0].status === "upcoming") {
        // If the very first station is 'upcoming', the train hasn't departed for today yet.
        // Ignore any 'crossed' statuses from yesterday's journey.
        stationName = d[0].station;
        delayMin = parseInt(d[0].delay || "0", 10);
      } else {
        // Find the last station with status "crossed" or the one with current="true"
        let currentStation = d.find(s => s.current === "true") || [...d].reverse().find(s => s.status === "crossed") || d[0];
        if (currentStation) {
          stationName = currentStation.station;
          delayMin = parseInt(currentStation.delay || "0", 10);
        }
      }
    } else {
      stationCode = d.current_station_code || d.stationCode || "";
      stationName = d.current_station      || d.station      || d.last_station || "";
      delayMin = parseInt(d.delay_minutes || d.delay || 0, 10);
    }

    const coords      = resolveCoords(stationCode, stationName);

    // Normalise status string
    let status = "Running";
    const rawStatus = (d.status || d.train_status || "").toLowerCase();
    if (rawStatus.includes("halt") || rawStatus.includes("stop")) status = "Halted";
    else if (rawStatus.includes("delay") || delayMin > 0) status = "Delayed";

    return res.json({
      train_number:  trainNo,
      train_name:    d.train_name || d.trainName || "",
      status,
      station_name:  coords.name,
      station_code:  stationCode,
      latitude:      coords.lat,
      longitude:     coords.lon,
      delay_minutes: isNaN(delayMin) ? 0 : delayMin,
      last_updated:  new Date().toISOString(),
      raw:           d,  // pass-through for debugging
    });

  } catch (err) {
    console.error(`[ntes-bridge] trackTrain(${trainNo}) error:`, err.message);
    return res.status(502).json({ error: err.message, train_number: trainNo });
  }
});

// ---------------------------------------------------------------------------
// GET /info/:trainNo
// Returns: train route, name, schedule
// ---------------------------------------------------------------------------
app.get("/info/:trainNo", async (req, res) => {
  const { trainNo } = req.params;
  try {
    const result = await getTrainInfo(trainNo);
    if (!result || !result.success) {
      return res.status(404).json({ error: "Train info not found", train_number: trainNo });
    }
    return res.json(result.data);
  } catch (err) {
    console.error(`[ntes-bridge] getTrainInfo(${trainNo}) error:`, err.message);
    return res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /station/:stationCode
// Returns: live arrivals and departures at a station
// ---------------------------------------------------------------------------
app.get("/station/:stationCode", async (req, res) => {
  const { stationCode } = req.params;
  try {
    const result = await liveAtStation(stationCode.toUpperCase());
    if (!result || !result.success) {
      return res.status(404).json({ error: "Station data not found", station_code: stationCode });
    }
    return res.json(result.data);
  } catch (err) {
    console.error(`[ntes-bridge] liveAtStation(${stationCode}) error:`, err.message);
    return res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[ntes-bridge] Listening on http://localhost:${PORT}`);
  console.log(`[ntes-bridge] Endpoints:`);
  console.log(`             GET /health`);
  console.log(`             GET /track/:trainNo`);
  console.log(`             GET /info/:trainNo`);
  console.log(`             GET /station/:stationCode`);
});
