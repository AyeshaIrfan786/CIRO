// CIRO/services/weatherService.js
import axios from 'axios';

const OWM_KEY =
  process.env.OWM_API_KEY || '409cda2ec5e0405bfb27601bfa264e1d';

// Realistic mock data for Pakistan locations when API unavailable
const MOCK_WEATHER = {
  attabad: {
    rainfall_mm: 42.5,
    humidity: 88,
    temp_c: 12,
    wind_kmh: 22,
    condition: 'Heavy Rain',
    source: 'mock',
  },
  g10: {
    rainfall_mm: 67.2,
    humidity: 94,
    temp_c: 28,
    wind_kmh: 15,
    condition: 'Thunderstorm',
    source: 'mock',
  },
  lahore: {
    rainfall_mm: 55.0,
    humidity: 91,
    temp_c: 30,
    wind_kmh: 18,
    condition: 'Heavy Rain',
    source: 'mock',
  },
  karachi: {
    rainfall_mm: 0.0,
    humidity: 72,
    temp_c: 34,
    wind_kmh: 12,
    condition: 'Clear',
    source: 'mock',
  },
};

async function getWeather(locationKey, lat, lon) {
  if (OWM_KEY) {
    try {
      const url =
        `https://api.openweathermap.org/data/2.5/weather` +
        `?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`;

      const res = await axios.get(url, { timeout: 5000 });
      const d = res.data;

      return {
        rainfall_mm: d.rain?.['1h'] || d.rain?.['3h'] || 0,
        humidity: d.main.humidity,
        temp_c: d.main.temp,
        wind_kmh: Math.round(d.wind.speed * 3.6),
        condition: d.weather[0].main,
        source: 'openweathermap',
      };
    } catch (err) {
      console.warn(
        `[WeatherService] API failed (${err.message}), using mock data`
      );
    }
  }

  // Fallback to mock data
  const key = locationKey.toLowerCase();
  return MOCK_WEATHER[key] || MOCK_WEATHER.g10;
}

function rainfallSeverityScore(rainfall_mm) {
  if (rainfall_mm >= 80) return { score: 95, label: 'Extreme' };
  if (rainfall_mm >= 50) return { score: 78, label: 'High' };
  if (rainfall_mm >= 25) return { score: 55, label: 'Moderate' };
  if (rainfall_mm >= 10) return { score: 30, label: 'Low' };
  return { score: 5, label: 'Minimal' };
}

// Export functions
export { getWeather, rainfallSeverityScore };

// Test block
const weather = await getWeather('lahore', 31.5497, 74.3436);

console.log('Weather Data:');
console.log(weather);

console.log('Severity Score:');
console.log(rainfallSeverityScore(weather.rainfall_mm));