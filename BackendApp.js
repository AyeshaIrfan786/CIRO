// app.js — CIRO Main Orchestrator
// Run: node app.js [0|1|2]   (scenario index)
 
import DetectorAgent from "./agents/detectorAgent.js";
import { AnalystAgent } from "./agents/analystAgent.js";
import { PlannerAgent } from "./agents/plannerAgent.js";
import { ExecutorAgent } from "./agents/executorAgent.js";
import { simulateImpact, formatImpactReport } from "./simulation/impactSimulator.js";
 
// Scenarios — match what detectorAgent expects
const SCENARIOS = [
  {
    name: "G-10 Flash Flood ",
    description: "Urban flooding with conflicting water-main hypothesis + secondary heat crisis",
    locationKey: "g10",
    scenario: "flooding",
    userText: "G-10 mein pani bhar gaya hai, gaariyan phans gayi hain! Koi help karo",
    secondaryCrisis: { type: "heatwave", location: "I-9 Industrial Area", severity: 6, confidence: 0.78 },
  },
  {
    name: "Faizabad Accident + Fog ",
    description: "Major road accident in dense fog",
    locationKey: "faizabad",
    scenario: "accident",
    userText: "Bara accident hua hai Faizabad interchange pe, 3 gaariyan takra gayi",
    secondaryCrisis: null,
  },
  {
    name: "API Failure Stress Test ⚠",
    description: "Simulates missing weather data — tests system robustness",
    locationKey: "default",
    scenario: "flooding",
    userText: "Flooding near Blue Area, office buildings evacuating",
    secondaryCrisis: null,
    simulateApiFailure: true,
  },
];
 
async function runCIROPipeline(scenario) {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  CIRO — ${scenario.name.padEnd(32)}║`);
  console.log("╚══════════════════════════════════════════╝");
  console.log(`   ${scenario.description}\n`);
 
  // ── STEP 1: DETECTOR AGENT ──────────────────────────────
  console.log("\n━━━ STEP 1: DETECTOR AGENT ━━━━━━━━━━━━━━━━");
  const detector = new DetectorAgent();
  const detectionResult = await detector.detect(
    scenario.simulateApiFailure ? "default" : scenario.locationKey,
    scenario.scenario,
    scenario.userText
  );
  const { classification } = detectionResult;
 
  console.log(`\n DETECTED: ${classification.primaryCrisisType || "Unknown"}`);
  console.log(`   Confidence: ${classification.confidence || 0}%`);
  if (classification.requiresFieldVerification) console.log(`   ⚠ Field verification required: "${classification.alternativeHypothesis}"`);
 
  // ── STEP 2: ANALYST AGENT ───────────────────────────────
  console.log("\n━━━ STEP 2: ANALYST AGENT ━━━━━━━━━━━━━━━━━");
  const analyst = new AnalystAgent();
 const analysisResult = await analyst.analyze(detectionResult, detectionResult.signals);
 
  console.log(`\n ANALYSIS: ${analysisResult.analysis.confirmedSeverity || "HIGH"} severity`);
  console.log(`   Fused score: ${analysisResult.fusion.fusedScore}/100 | Driver: ${analysisResult.fusion.primaryDriver}`);
  console.log(`   Affected: ~${(analysisResult.impact.estimatedAffectedPopulation || 0).toLocaleString()} people | ${analysisResult.impact.economicLossFormatted}`);
 
  // ── STEP 3: PLANNER AGENT ───────────────────────────────
  console.log("\n━━━ STEP 3: PLANNER AGENT ━━━━━━━━━━━━━━━━━");
  const planner = new PlannerAgent();
 
  // Build crisis object for planner from detection result
  const crisis = {
    type: classification.primaryCrisisType || "urban_flooding",
    location: detectionResult.locationKey,
    severity: analysisResult.fusion.fusedScore >= 70 ? 8 : analysisResult.fusion.fusedScore >= 40 ? 6 : 4,
    confidence: (classification.confidence || 75) / 100,
    conflictingHypothesis: classification.alternativeHypothesis || null,
    affectedZones: classification.affectedZones || [],
  };
 
  const plan = await planner.plan(crisis, scenario.secondaryCrisis || null);
 
  console.log(`\n PLAN ${plan.responseId}: ${plan.primaryActions?.length || 0} actions`);
  plan.primaryActions?.forEach((a, i) => console.log(`   ${i+1}. [${a.priority?.toUpperCase()}] ${a.action}`));
  if (scenario.secondaryCrisis) console.log(`   ↳ Resource split applied for secondary ${scenario.secondaryCrisis.type}`);
 
  // ── STEP 4: EXECUTOR AGENT ──────────────────────────────
  console.log("\n━━━ STEP 4: EXECUTOR AGENT ━━━━━━━━━━━━━━━━");
  const executor = new ExecutorAgent();
  const execResult = await executor.execute(crisis, plan);
 
  console.log(`\n EXECUTED: Incident ID ${execResult.incidentId}`);
  console.log(`   Storage: ${execResult.logResult.method}`);
  console.log(`   Alerts queued: ${execResult.notificationQueue.length}`);
  console.log(`   Traffic: ${execResult.reroute.congestionBefore} → ${execResult.reroute.congestionAfter}`);
  if (execResult.correctionResult) console.log(`\n   ⚠ RETRACTION: Reclassified as "${execResult.correctionResult.correction}"`);
 
  // ── IMPACT SIMULATION ────────────────────────────────────
  const impact = simulateImpact(crisis, plan, execResult);
  console.log(formatImpactReport(impact));
 
  return { detectionResult, analysisResult, plan, execResult, impact };
}
 
// ── RUN ──────────────────────────────────────────────────
const idx = parseInt(process.argv[2] || "0");
runCIROPipeline(SCENARIOS[Math.min(idx, SCENARIOS.length - 1)]).catch(err => {
  console.error("\nPipeline error:", err.message, err.stack);
  process.exit(1);
});
