// CIRO/config.js
// Replace your ENTIRE config.js file with this exact code.

export const GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  "AIzaSyAH9Yz5-qGTcgdESogBpAhapocHUkpUv7c";

const config = {
  gemini: {
    apiKey: GEMINI_KEY,
    model: "gemini-2.0-flash-lite",
  },

  thresholds: {
    highSeverity: 70,
    mediumSeverity: 40,
    escalationHours: 6,
    escalationCount: 2,
    floodNdwiDelta: 0.15,
    lakeSizeKm2Delta: 0.3,
  },

  signalWeights: {
    satellite: 0.30,
    soil: 0.20,
    rainfall: 0.25,
    text: 0.25,
  },

  twilio: {
    accountSid: "",
    authToken: "",
    from: "",
    to: "",
  },

  googleSheets: {
    credentialsPath: "",
    spreadsheetId: "",
  },

  locations: {
    g10: {
      lat: 33.7050,
      lon: 72.9730,
      name: "G-10, Islamabad",
    },

    faizabad: {
      lat: 33.6844,
      lon: 73.0479,
      name: "Faizabad, Islamabad",
    },

    attabad: {
      lat: 36.3167,
      lon: 74.8667,
      name: "Attabad Lake, Hunza",
    },

    lahore: {
      lat: 31.5497,
      lon: 74.3436,
      name: "Lahore",
    },

    karachi: {
      lat: 24.8607,
      lon: 67.0011,
      name: "Karachi",
    },

    default: {
      lat: 33.7294,
      lon: 73.0931,
      name: "Islamabad",
    },
  },
};

export default config;
