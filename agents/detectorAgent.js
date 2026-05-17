// CIRO/agents/detectorAgent.js — Agent 1: Signal Ingestion & Detection
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWeather, rainfallSeverityScore } from '../services/weatherService.js';
import { getSocialSignals } from '../services/socialMediaService.js';
import { getTrafficData, congestionSeverityScore } from '../services/trafficService.js';
import { getSatelliteData } from '../services/satelliteService.js';
import config from '../config.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });

export class DetectorAgent {
  constructor() {
    this.name = 'DetectorAgent';
    this.tools = ['get_satellite_data', 'get_weather', 'get_social_signals', 'get_traffic_data'];
    this.trace = [];
  }

  log(step, data) {
    const entry = { agent: this.name, step, timestamp: new Date().toISOString(), data };
    this.trace.push(entry);
    console.log(`\n[${this.name}] ${step}`);
    if (typeof data === 'string') console.log('  →', data);
    else console.log('  →', JSON.stringify(data, null, 2).split('\n').slice(0, 6).join('\n'));
  }

  async detect(locationKey, scenario, userText = '') {
    this.log('OBSERVE', `Signal ingestion started — location=${locationKey}, scenario=${scenario}`);

    // TOOL 1: Satellite
    this.log('TOOL_CALL', `get_satellite_data(${locationKey})`);
    const satellite = await getSatelliteData(locationKey);
    this.log('TOOL_RESULT', `NDWI=${satellite.current.ndwi}, delta=${satellite.delta.ndwi}, score=${satellite.severityScore}`);

    // TOOL 2: Weather
    const loc = config.locations[locationKey] || config.locations.g10;
    this.log('TOOL_CALL', `get_weather(lat=${loc.lat}, lon=${loc.lon})`);
    const weather = await getWeather(locationKey, loc.lat, loc.lon);
    const rainfallSig = rainfallSeverityScore(weather.rainfall_mm);
    this.log('TOOL_RESULT', `rainfall=${weather.rainfall_mm}mm, condition=${weather.condition}, score=${rainfallSig.score}`);

    // TOOL 3: Social media
    this.log('TOOL_CALL', `get_social_signals(${scenario})`);
    const social = await getSocialSignals(scenario);
    this.log('TOOL_RESULT', `reports=${social.rawReports.length}, score=${social.aggregate.score}, conflicting=${social.aggregate.conflicting}`);

    // TOOL 4: Traffic
    this.log('TOOL_CALL', `get_traffic_data(${locationKey})`);
    const traffic = await getTrafficData(locationKey);
    const trafficScore = congestionSeverityScore(traffic);
    this.log('TOOL_RESULT', `congestion=${traffic.congestionLevel}, score=${trafficScore}`);

    // GEMINI: classify crisis from fused signals
    const prompt = `You are the Detection Agent of CIRO (Crisis Intelligence & Response Orchestration) for Pakistan emergency management.
 
Analyze these multi-source signals and classify the crisis. Respond ONLY with valid JSON — no markdown, no explanation, no code fences.
 
SATELLITE DATA (source: ${satellite.source}):
- NDWI current: ${satellite.current.ndwi} (baseline: ${satellite.baseline.ndwi}, delta: +${satellite.delta.ndwi})
- Water area change: +${satellite.delta.lakeSizeKm2} km²
- Soil moisture: ${satellite.current.soilMoisture} (baseline: ${satellite.baseline.soilMoisture})
- Satellite severity score: ${satellite.severityScore}/100
 
WEATHER DATA (source: ${weather.source}):
- Rainfall: ${weather.rainfall_mm}mm, Condition: ${weather.condition}
- Humidity: ${weather.humidity}%, Temperature: ${weather.temp_c}°C
- Rainfall severity: ${rainfallSig.label} (score: ${rainfallSig.score}/100)
 
SOCIAL MEDIA (${social.rawReports.length} reports, source: ${social.dataSource}):
- Aggregate score: ${social.aggregate.score}/100
- Crisis types detected: ${(social.aggregate.types || []).join(', ') || 'none'}
- Conflicting information: ${social.aggregate.conflicting}
- Sample reports: ${social.rawReports.slice(0, 2).map(r => `"${r.text}"`).join(' | ')}
 
TRAFFIC DATA (source: ${traffic.source}):
- Congestion: ${traffic.congestionLevel}, Speed: ${traffic.speedKmh} km/h
- Roads blocked: ${traffic.roadsBlocked.join(', ') || 'none'}
- Traffic severity score: ${trafficScore}/100
 
USER/FIELD REPORT: "${userText || 'None'}"
 
Return ONLY this JSON object:
{
  "primaryCrisisType": "Urban Flooding",
  "alternativeHypothesis": "Broken Water Main or null",
  "conflictingHypothesis": "Broken Water Main or null",
  "requiresFieldVerification": true,
  "confidence": 0.87,
  "conflictingSignals": "Social media reports conflict between flooding and water main burst",
  "affectedZones": ["G-10 Sector", "G-10 Markaz"],
  "estimatedAffectedPopulation": 50000,
  "immediateThreats": ["Road closure", "Property flooding", "Trapped residents"],
  "severity": 7,
  "location": "${locationKey}",
  "type": "urban_flooding",
  "reasoning": "Satellite NDWI delta of 0.35 combined with 67mm rainfall and 4 social reports strongly indicate active flooding event."
}`;

    this.log('REASONING', 'Calling Gemini to classify crisis from fused multi-source signals...');

    let classification;
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/gi, '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      classification = match ? JSON.parse(match[0]) : null;
    } catch (err) {
      this.log('FALLBACK', `Gemini parse failed: ${err.message} — using computed fallback`);
      classification = null;
    }

    // Robust fallback — never crash
    if (!classification) {
      classification = {
        primaryCrisisType: 'Urban Flooding',
        alternativeHypothesis: social.aggregate.conflicting ? 'Broken Water Main' : null,
        conflictingHypothesis: social.aggregate.conflicting ? 'Broken Water Main' : null,
        requiresFieldVerification: social.aggregate.conflicting,
        confidence: satellite.severityScore / 100,
        conflictingSignals: social.aggregate.conflicting ? 'Social media reports conflict' : null,
        affectedZones: [locationKey],
        estimatedAffectedPopulation: 50000,
        immediateThreats: ['Flooding', 'Road closure'],
        severity: Math.round(satellite.severityScore / 10),
        location: locationKey,
        type: 'urban_flooding',
        reasoning: 'Computed from satellite + weather + social signal fusion.',
      };
    }

    this.log('DECISION', `Crisis: ${classification.primaryCrisisType} | Confidence: ${(classification.confidence * 100).toFixed(0)}% | FieldVerif: ${classification.requiresFieldVerification}`);

    return {
      locationKey,
      scenario,
      signals: { satellite, weather, rainfallSig, social, traffic, trafficScore },
      classification,
      trace: this.trace,
    };
  }
}

export default DetectorAgent;