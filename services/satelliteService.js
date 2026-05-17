// CIRO/services/satelliteService.js
// Google Earth Engine integration (mock for JS backend; real GEE runs in Python)
// Provides realistic Attabad Lake NDWI + soil data

const SATELLITE_DATA = {
  attabad: {
    current:  { ndwi: 0.78, lakeSizeKm2: 11.8, soilMoisture: 0.82, snowCover: 0.45 },
    baseline: { ndwi: 0.61, lakeSizeKm2: 10.2, soilMoisture: 0.55, snowCover: 0.40 },
    delta:    { ndwi: 0.17, lakeSizeKm2: 1.6,  soilMoisture: 0.27 },
    date:     new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    source:   'synthetic_mock_sentinel2',
  },

  g10: {
    current:  { ndwi: 0.55, lakeSizeKm2: 0, soilMoisture: 0.91, snowCover: 0 },
    baseline: { ndwi: 0.20, lakeSizeKm2: 0, soilMoisture: 0.45, snowCover: 0 },
    delta:    { ndwi: 0.35, lakeSizeKm2: 0, soilMoisture: 0.46 },
    date:     new Date().toISOString(),
    source:   'synthetic_mock_sentinel2',
  },

  lahore: {
    current:  { ndwi: 0.48, lakeSizeKm2: 0, soilMoisture: 0.88, snowCover: 0 },
    baseline: { ndwi: 0.15, lakeSizeKm2: 0, soilMoisture: 0.42, snowCover: 0 },
    delta:    { ndwi: 0.33, lakeSizeKm2: 0, soilMoisture: 0.46 },
    date:     new Date().toISOString(),
    source:   'synthetic_mock_sentinel2',
  },
};

function satelliteSeverityScore(data) {
  const ndwiScore = Math.min(100, data.delta.ndwi * 300);
  const soilScore = Math.min(100, data.delta.soilMoisture * 150);
  const sizeScore = Math.min(100, data.delta.lakeSizeKm2 * 30);

  return Math.round(
    (ndwiScore * 0.5) +
    (soilScore * 0.3) +
    (sizeScore * 0.2)
  );
}

async function getSatelliteData(locationKey) {
  const key = locationKey.toLowerCase();

  const data =
    SATELLITE_DATA[key] ||
    SATELLITE_DATA['g10'];

  return {
    ...data,
    severityScore: satelliteSeverityScore(data),
  };
}

// Proactive check: compare latest vs stored baseline
function checkProactiveAlert(locationKey, storedBaseline) {
  const data =
    SATELLITE_DATA[locationKey.toLowerCase()] ||
    SATELLITE_DATA['g10'];

  const threshold = 0.3;

  const deltaNdwi =
    data.current.ndwi -
    (storedBaseline?.ndwi || data.baseline.ndwi);

  const deltaSize =
    data.current.lakeSizeKm2 -
    (storedBaseline?.lakeSizeKm2 || data.baseline.lakeSizeKm2);

  if (deltaNdwi >= 0.15 || deltaSize >= threshold) {
    return {
      triggered: true,
      reason:
        `Satellite detected: NDWI +${deltaNdwi.toFixed(2)}, ` +
        `Lake size +${deltaSize.toFixed(2)} km² since last check`,
      severity: deltaNdwi >= 0.25 ? 'HIGH' : 'MEDIUM',
    };
  }

  return { triggered: false };
}

export {
  getSatelliteData,
  satelliteSeverityScore,
  checkProactiveAlert
};