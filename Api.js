// screens/api.js — All API calls from mobile to backend
// Change API_URL to your PC's IPv4 address

export const API_URL = 'http://192.168.1.100:3000'; // ← CHANGE THIS

// Run full CIRO pipeline
export async function runPipeline(scenario, userText) {
  try {
    const res = await fetch(`${API_URL}/api/run`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ scenario, userText }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Pipeline failed');
    return data.result;
  } catch (err) {
    console.warn('[API] Server unreachable, using mock:', err.message);
    return getMockResult(scenario);
  }
}

// Mock result when server is not running
function getMockResult(scenario) {
  const sev = 78;
  return {
    incidentId: `INC-${Date.now().toString().slice(-6)}`,
    crisis: {
      type: 'Urban Flooding', location: scenario?.locationKey || 'g10',
      severity: 7, confidence: 0.87, conflictingHypothesis: 'Broken Water Main',
    },
    detection: {
      locationKey: scenario?.locationKey || 'g10',
      classification: {
        primaryCrisisType: 'Urban Flooding', confidence: 87,
        alternativeHypothesis: 'Broken Water Main', requiresFieldVerification: true,
        severity: 7, affectedZones: ['G-10 Sector', 'G-10 Markaz'],
        immediateThreats: ['Road closure', 'Trapped residents', 'Property flooding'],
        reasoning: 'NDWI delta +0.35 with 67mm rainfall and 4 social reports confirms active flooding. Water main conflict reduces confidence by 18%.',
      },
      trace: [
        { agent: 'DetectorAgent', step: 'OBSERVE',     data: 'Signal ingestion started — location=g10' },
        { agent: 'DetectorAgent', step: 'TOOL_CALL',   data: 'get_satellite_data(g10)' },
        { agent: 'DetectorAgent', step: 'TOOL_RESULT', data: 'NDWI=0.55, delta=+0.35, score=85' },
        { agent: 'DetectorAgent', step: 'TOOL_CALL',   data: 'get_weather(lat=33.705, lon=72.973)' },
        { agent: 'DetectorAgent', step: 'TOOL_RESULT', data: 'rainfall=67.2mm, Thunderstorm, score=78' },
        { agent: 'DetectorAgent', step: 'TOOL_CALL',   data: 'get_social_signals(g10_flood)' },
        { agent: 'DetectorAgent', step: 'TOOL_RESULT', data: '4 reports, score=65, conflicting=true' },
        { agent: 'DetectorAgent', step: 'REASONING',   data: 'Conflicting: "Water Main" vs "Flooding" — confidence reduced' },
        { agent: 'DetectorAgent', step: 'DECISION',    data: 'Urban Flooding | 87% confidence | field verification required' },
      ],
    },
    analysis: {
      fusion: {
        fusedScore: sev, severityLabel: 'HIGH', primaryDriver: 'satellite',
        conflictPenalty: 'Applied — conflicting signals -18%',
        components: {
          social:   { score: 65, weight: 0.25, label: 'MEDIUM' },
          traffic:  { score: 90, weight: 0.25, label: 'HIGH'   },
          weather:  { score: 78, weight: 0.30, label: 'HIGH'   },
          severity: { score: 85, weight: 0.20, label: 'HIGH'   },
        },
      },
      impact: {
        estimatedAffectedPopulation: 50000,
        economicLossFormatted: 'Rs 11.0B',
        responseTimeTargetMin: 12,
        hospitalAlert: true,
        cascadeRisk: true,
      },
      analysis: {
        confirmedSeverity: 'HIGH',
        analysisReasoning: 'Multi-source fusion confirms HIGH severity. Satellite NDWI delta is primary driver at 37 contribution points. Economic exposure Rs 11B warrants immediate full-resource response.',
        baselineComparison: { improvement: '74% faster than manual' },
        costEstimate: { totalCost: '$0.01', apiCallsThisRun: 12 },
      },
      trace: [
        { agent: 'AnalystAgent', step: 'TOOL_CALL',   data: 'compute_confidence_fusion(satellite=0.30, soil=0.20, rainfall=0.25, text=0.25)' },
        { agent: 'AnalystAgent', step: 'TOOL_RESULT', data: 'fusedScore=78, primaryDriver=weather, conflictPenalty=Applied' },
        { agent: 'AnalystAgent', step: 'REASONING',   data: 'Conflict detected — confidence reduced, field verification flagged' },
        { agent: 'AnalystAgent', step: 'DECISION',    data: 'Severity: HIGH | 50,000 at risk | Rs 11.0B economic exposure' },
      ],
    },
    plan: {
      responseId: 'RESP-001',
      estimatedResponseTimeMin: 12,
      primaryActions: [
        { id: 'ACT-001', action: 'Dispatch 3 rescue teams to G-10 crisis zone', unit: '1122 Rescue', priority: 'immediate', estimatedTime: '8 minutes' },
        { id: 'ACT-002', action: 'Reroute traffic via Kashmir Highway → Ring Road', unit: 'Traffic Police', priority: 'immediate', estimatedTime: '5 minutes' },
        { id: 'ACT-003', action: 'Send bilingual public alert (English + Urdu)', unit: 'CIRO Alert System', priority: 'immediate', estimatedTime: '1 minute' },
        { id: 'ACT-004', action: 'Notify PIMS Hospital — prepare trauma intake', unit: 'Emergency Coordination', priority: 'high', estimatedTime: '2 minutes' },
      ],
      publicAlert: {
        message: 'CIRO ALERT: Urban Flooding in G-10, Islamabad. Severity HIGH. Evacuate via Kashmir Highway to H-8. Call 1122.',
        channels: ['SMS', 'App', 'Radio'],
      },
      allocation: { allocated: { rescueTeams: 3, medicalUnits: 2, policeUnits: 4, evacuationBuses: 6 }, tradeoffs: [] },
      stagingRationale: 'Alert staged pending field verification of water main hypothesis',
      trace: [
        { agent: 'PlannerAgent', step: 'TOOL_CALL',   data: 'check_resource_conflicts(flood_needs, heat_emergency_needs)' },
        { agent: 'PlannerAgent', step: 'DECISION',    data: 'No conflicts — full allocation to primary crisis' },
        { agent: 'PlannerAgent', step: 'TOOL_CALL',   data: 'allocate_resources({rescueTeams:3, medicalUnits:2, policeUnits:4, evacuationBuses:6})' },
        { agent: 'PlannerAgent', step: 'TOOL_RESULT', data: 'Allocated successfully, tradeoffs=None' },
        { agent: 'PlannerAgent', step: 'DECISION',    data: '4 immediate actions, ETA=12min, staged alert' },
      ],
    },
    execResult: {
      incidentId: `INC-${Date.now().toString().slice(-6)}`,
      logResult: { method: 'in_memory_fallback' },
      notificationQueue: [
        { id: 'SMS-001', status: 'QUEUED', recipient: 'NDMA Coordinator', method: 'notification_queue' },
        { id: 'SMS-002', status: 'QUEUED', recipient: 'PIMS Hospital',    method: 'notification_queue' },
      ],
      escalation: { recentIncidents: 0, shouldEscalate: false, escalationLevel: 'Standard 1122' },
      correctionResult: null,
      reroute: { congestionBefore: '93%', congestionAfter: '31%', alternateRoute: 'G-10 → Kashmir Highway → H-8 Relief Camp' },
      trace: [
        { agent: 'ExecutorAgent', step: 'TOOL_CALL',   data: 'check_escalation_history(g10)' },
        { agent: 'ExecutorAgent', step: 'TOOL_RESULT', data: 'recentIncidents=0, shouldEscalate=false' },
        { agent: 'ExecutorAgent', step: 'TOOL_CALL',   data: 'write_incident_to_sheets(INC)' },
        { agent: 'ExecutorAgent', step: 'TOOL_RESULT', data: 'method=in_memory_fallback, saved' },
        { agent: 'ExecutorAgent', step: 'ADAPT',       data: 'Conflicting signals — staging alert, notifying NDMA only' },
        { agent: 'ExecutorAgent', step: 'TOOL_CALL',   data: 'send_sms_alert(NDMA staged alert)' },
        { agent: 'ExecutorAgent', step: 'EVALUATE',    data: 'Field team confirmed original — no retraction needed' },
        { agent: 'ExecutorAgent', step: 'DECISION',    data: 'Status=SUCCESS | Incident=MONITORING' },
      ],
    },
    impact: {
      before: { congestionLevel: '93%', activeRescueUnits: 0, alertsSent: 0, estimatedResponseTime: '18-25 min (manual)', systemStatus: 'IDLE' },
      after:  { congestionLevel: '31%', activeRescueUnits: 3, alertsSent: 5600, estimatedResponseTime: '12 min (CIRO)', systemStatus: 'ACTIVE_RESPONSE', ticketId: `INC-${Date.now().toString().slice(-6)}` },
      metrics: {
        congestionReduction: '62%',
        responseTimeImprovement: '74% faster than manual',
        estimatedLivesSaved: '4-8 potential casualties avoided',
        costPerOperation: '$0.01 (12 Gemini API calls)',
        scalabilityNote: '100x load = ~$1.00/incident. Linear scaling via parallel agent instances on Google Cloud Run.',
        baselineComparison: {
          agenticSystem: '12 min — automated 4-source fusion + planning + execution',
          manualSystem:  '18-25 min — human operator collects signals manually',
          improvement:   '74% faster, 4 signal sources fused simultaneously',
        },
      },
    },
  };
}