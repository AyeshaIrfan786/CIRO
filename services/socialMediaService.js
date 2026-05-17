// CIRO/services/socialMediaService.js
// Parses Urdu, Roman Urdu, and English crisis reports from social media

const CRISIS_KEYWORDS = {
  flood: [
    'pani',
    'flooding',
    'flood',
    'baadh',
    'sayl',
    'باڑھ',
    'پانی',
    'سیلاب',
    'bhar gaya',
    'doob',
    'overflowing'
  ],

  fire: [
    'aag',
    'fire',
    'blaze',
    'آگ',
    'جل رہا',
    'jal raha',
    'flames'
  ],

  heat: [
    'garmi',
    'heat',
    'heatwave',
    'گرمی',
    'loo',
    'sun stroke',
    'dehydration'
  ],

  accident: [
    'accident',
    'crash',
    'hadsa',
    'حادثہ',
    'collision',
    'car crash',
    'takkar'
  ],

  stuck: [
    'phansi',
    'phans',
    'stuck',
    'phansi hui',
    'پھنسی',
    'trapped',
    'blocked'
  ],

  road: [
    'rasta',
    'road',
    'traffic',
    'jam',
    'block',
    'سڑک',
    'congestion',
    'gaadi'
  ],
};

const URGENCY_WORDS = [
  'jaldi',
  'emergency',
  'help',
  'madad',
  'فوری',
  'bachao',
  'SOS',
  'urgent',
  'critical'
];

const LOCATION_PATTERNS = [
  /G[-\s]?(\d+)/i,
  /F[-\s]?(\d+)/i,
  /I[-\s]?(\d+)/i,
  /lahore/i,
  /karachi/i,
  /islamabad/i,
  /rawalpindi/i,
  /hunza/i,
  /attabad/i,
  /peshawar/i,
];

// Realistic mock social media reports for demo
const MOCK_REPORTS = {
  g10_flood: [
    {
      id: 'sm001',
      text: 'G-10 mein pani bhar gaya hai, gaariyan phans gayi hain! Jaldi help chahiye',
      platform: 'Twitter',
      time: new Date().toISOString(),
      lang: 'roman_urdu',
    },

    {
      id: 'sm002',
      text: 'Massive flooding in G-10 sector. Roads completely blocked. Families stranded on rooftops',
      platform: 'Facebook',
      time: new Date().toISOString(),
      lang: 'english',
    },

    {
      id: 'sm003',
      text: 'جی ۱۰ میں شدید بارش سے سیلاب آ گیا ہے، فوری مدد درکار ہے',
      platform: 'WhatsApp',
      time: new Date().toISOString(),
      lang: 'urdu',
    },

    {
      id: 'sm004',
      text: 'Water main burst in G-10? Or actual flooding? Confused. Pani bohat zyada hai',
      platform: 'Twitter',
      time: new Date().toISOString(),
      lang: 'mixed',
      conflicting: true,
    },
  ],

  heat_emergency: [
    {
      id: 'sm005',
      text: 'Heat emergency in I-8 low income area. Multiple people collapsed. Garmi bohat zyada hai',
      platform: 'Twitter',
      time: new Date().toISOString(),
      lang: 'mixed',
    },

    {
      id: 'sm006',
      text: 'Medical help needed urgently in I-8. Heat stroke cases increasing',
      platform: 'Facebook',
      time: new Date().toISOString(),
      lang: 'english',
    },
  ],

  attabad: [
    {
      id: 'sm007',
      text: 'Attabad Lake water level rising fast. Hunza road blocked by overflow',
      platform: 'Twitter',
      time: new Date().toISOString(),
      lang: 'english',
    },
  ],
};

function parseCrisisSignals(reports) {
  const signals = [];

  for (const report of reports) {
    const text = report.text.toLowerCase();

    const detectedTypes = [];

    let urgencyScore = 0;

    let hasConflict = report.conflicting || false;

    // Detect crisis types
    for (const [type, keywords] of Object.entries(CRISIS_KEYWORDS)) {
      if (
        keywords.some((kw) =>
          text.includes(kw.toLowerCase())
        )
      ) {
        detectedTypes.push(type);
      }
    }

    // Detect urgency
    if (
      URGENCY_WORDS.some((word) =>
        text.includes(word.toLowerCase())
      )
    ) {
      urgencyScore += 20;
    }

    // Multi-type crises are more serious
    if (detectedTypes.length > 1) {
      urgencyScore += 10;
    }

    // Extract location
    let locationMentioned = null;

    for (const pattern of LOCATION_PATTERNS) {
      const match = report.text.match(pattern);

      if (match) {
        locationMentioned = match[0];
        break;
      }
    }

    signals.push({
      id: report.id,
      platform: report.platform,
      crisisTypes: detectedTypes,
      urgencyScore,
      locationMentioned,
      hasConflict,
      lang: report.lang,
      timestamp: report.time,
      rawText: report.text,
    });
  }

  return signals;
}

function aggregateSocialSignal(signals) {
  if (!signals.length) {
    return {
      score: 0,
      label: 'No signal',
      conflicting: false,
    };
  }

  const avgUrgency =
    signals.reduce(
      (sum, report) => sum + report.urgencyScore,
      0
    ) / signals.length;

  const hasConflict = signals.some(
    (report) => report.hasConflict
  );

  const reportCount = signals.length;

  const typeSet = new Set(
    signals.flatMap((report) => report.crisisTypes)
  );

  let score = Math.min(
    100,
    reportCount * 10 +
      avgUrgency +
      typeSet.size * 5
  );

  // Reduce confidence if reports conflict
  if (hasConflict) {
    score *= 0.7;
  }

  return {
    score: Math.round(score),

    label:
      score >= 70
        ? 'High'
        : score >= 40
        ? 'Medium'
        : 'Low',

    conflicting: hasConflict,

    reportCount,

    types: [...typeSet],

    locations: [
      ...new Set(
        signals
          .map((report) => report.locationMentioned)
          .filter(Boolean)
      ),
    ],
  };
}

async function getSocialSignals(scenarioKey) {
  // In production:
  // integrate Twitter/X API, Facebook Graph API, etc.

  const reports =
    MOCK_REPORTS[scenarioKey] ||
    MOCK_REPORTS.g10_flood;

  const parsedSignals = parseCrisisSignals(reports);

  const aggregate =
    aggregateSocialSignal(parsedSignals);

  return {
    rawReports: reports,
    parsedSignals,
    aggregate,
    dataSource: 'synthetic_mock',
  };
}

// ESM exports
export {
  getSocialSignals,
  parseCrisisSignals,
  aggregateSocialSignal,
  MOCK_REPORTS,
};