// CIRO/services/trafficService.js

const MOCK_TRAFFIC = {
  g10: {
    congestionLevel: 'Severe',
    speedKmh: 4,
    incidentCount: 3,
    roadsBlocked: [
      'Kashmir Highway',
      'G-10 Markaz Road'
    ],
    source: 'mock',
  },

  attabad: {
    congestionLevel: 'High',
    speedKmh: 8,
    incidentCount: 1,
    roadsBlocked: [
      'Karakoram Highway near Attabad'
    ],
    source: 'mock',
  },

  lahore: {
    congestionLevel: 'High',
    speedKmh: 12,
    incidentCount: 2,
    roadsBlocked: [
      'Ferozepur Road',
      'Canal Road'
    ],
    source: 'mock',
  },

  karachi: {
    congestionLevel: 'Normal',
    speedKmh: 35,
    incidentCount: 0,
    roadsBlocked: [],
    source: 'mock',
  },
};

function congestionSeverityScore(data) {
  const severityMap = {
    Severe: 90,
    High: 65,
    Moderate: 40,
    Normal: 10,
  };

  return (
    severityMap[data.congestionLevel] || 20
  );
}

async function getTrafficData(locationKey) {
  // Production:
  // integrate HERE Traffic API
  // or Google Maps Platform

  const key = locationKey.toLowerCase();

  return (
    MOCK_TRAFFIC[key] || {
      congestionLevel: 'Unknown',
      speedKmh: 20,
      incidentCount: 0,
      roadsBlocked: [],
      source: 'mock',
    }
  );
}

// Temporary test runner
const result = await getTrafficData('g10');

console.log(result);

// ESM exports
export {
  getTrafficData,
  congestionSeverityScore,
};