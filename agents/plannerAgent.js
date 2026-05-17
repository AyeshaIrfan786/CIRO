// plannerAgent.js — Agent 3: Resource Allocation & Multi-Crisis Coordination
// Pure ESM — matches "type":"module" in package.json
 
import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config.js";
 
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });
 
const RESOURCE_POOL = {
  rescueTeams:     { total: 8,  available: 8  },
  medicalUnits:    { total: 5,  available: 5  },
  policeUnits:     { total: 12, available: 12 },
  evacuationBuses: { total: 20, available: 20 },
  helicopters:     { total: 2,  available: 2  },
  fireUnits:       { total: 4,  available: 4  },
};
 
export class PlannerAgent {
  constructor() {
    this.name = "PlannerAgent";
    this.tools = ["allocate_resources", "check_resource_conflicts", "generate_stakeholder_messages", "compute_response_plan"];
    this.trace = [];
    this.resourceState = JSON.parse(JSON.stringify(RESOURCE_POOL));
  }
 
  log(step, data) {
    const entry = { agent: this.name, step, timestamp: new Date().toISOString(), data };
    this.trace.push(entry);
    console.log(`\n[${this.name}] ${step}`);
    if (typeof data === "string") console.log("  →", data);
    else console.log("  →", JSON.stringify(data, null, 2).split("\n").slice(0, 10).join("\n"));
  }
 
  // TOOL: Allocate resources with shortfall detection
  allocateResources(required) {
    const allocated = {}, shortfalls = {}, tradeoffs = [];
    const defaults = { rescueTeams: 3, medicalUnits: 2, policeUnits: 4, evacuationBuses: 6 };
    const needs = { ...defaults, ...required };
 
    for (const [resource, needed] of Object.entries(needs)) {
      const pool = this.resourceState[resource];
      if (!pool) continue;
      const canAllocate = Math.min(pool.available, needed);
      pool.available -= canAllocate;
      allocated[resource] = canAllocate;
      if (needed > canAllocate) {
        shortfalls[resource] = needed - canAllocate;
        tradeoffs.push(`${resource}: needed ${needed}, got ${canAllocate} — requesting mutual aid from Rawalpindi`);
      }
    }
    return { allocated, shortfalls, tradeoffs, resourceStateAfter: this.resourceState };
  }
 
  // TOOL: Check conflicts when two crises compete
  checkResourceConflicts(primaryNeeds, secondaryNeeds) {
    const conflicts = [];
    for (const resource of Object.keys(primaryNeeds || {})) {
      const pool = this.resourceState[resource];
      if (!pool) continue;
      const totalNeeded = (primaryNeeds[resource] || 0) + (secondaryNeeds[resource] || 0);
      if (totalNeeded > pool.available) {
        conflicts.push({ resource, available: pool.available, totalNeeded, deficit: totalNeeded - pool.available, resolution: "Prioritize by severity; request mutual aid" });
      }
    }
    return conflicts;
  }
 
  // TOOL: Generate bilingual stakeholder messages
  generateMessages(crisis, impact, allocation, location) {
    const now = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
    return {
      publicSMS: {
        english: `CIRO ALERT [${now}]: ${crisis.type} detected in ${location}. Severity: ${crisis.severity}/10. Evacuate via designated routes. Call 1122 for rescue. NOT a drill.`,
        urdu: `سیرو انتباہ [${now}]: ${location} میں ہنگامی صورتحال۔ فوری طور پر محفوظ مقام پر جائیں۔ 1122 پر رابطہ کریں۔`,
      },
      ndmaAlert: `CIRO — PRIORITY ${crisis.severity}/10\nIncident: ${crisis.type}\nLocation: ${location}\nAffected: ~${(impact?.estimatedAffectedPopulation || 50000).toLocaleString()} persons\nResources deployed: ${JSON.stringify(allocation.allocated)}\nAction: Activate provincial emergency protocol`,
      hospitalNotice: `EMERGENCY INCOMING — ${location} ${crisis.type}. Prepare trauma unit. ETA first patients: ~25 minutes.`,
      mediaRelease: `At ${now}, CIRO detected a ${crisis.type} event in ${location}. Rescue teams deployed. Citizens advised to avoid the area.`,
    };
  }
 
  async plan(crisis, secondaryCrisis = null) {
    this.log("OBSERVE", `Planning for ${crisis.type} at ${crisis.location}, severity=${crisis.severity}/10`);
 
    const stateBefore = { resources: JSON.parse(JSON.stringify(RESOURCE_POOL)), activeAlerts: 0, systemStatus: "IDLE" };
 
    // Check conflicts with secondary crisis
    const secondaryNeeds = secondaryCrisis ? { medicalUnits: 2, policeUnits: 1 } : {};
    this.log("TOOL_CALL", "check_resource_conflicts(primary, secondary)");
    const conflicts = this.checkResourceConflicts({ rescueTeams: 3, medicalUnits: 2, policeUnits: 4 }, secondaryNeeds);
    this.log("TOOL_RESULT", conflicts.length ? `${conflicts.length} conflicts — priority-based allocation` : "No conflicts");
 
    // Allocate
    this.log("TOOL_CALL", "allocate_resources(required)");
    const allocation = this.allocateResources({ rescueTeams: 3, medicalUnits: 2, policeUnits: 4, evacuationBuses: 6 });
    this.log("TOOL_RESULT", { allocated: allocation.allocated, tradeoffs: allocation.tradeoffs });
 
    // Messages
    this.log("TOOL_CALL", "generate_stakeholder_messages()");
    const impact = { estimatedAffectedPopulation: crisis.severity >= 8 ? 80000 : 50000 };
    const messages = this.generateMessages(crisis, impact, allocation, crisis.location);
    this.log("TOOL_RESULT", "Bilingual SMS, NDMA alert, hospital notice generated");
 
    // Gemini generates phased action plan
    const prompt = `
You are CIRO's Planner Agent. Generate a phased emergency response plan.
 
CRISIS: ${crisis.type} at ${crisis.location}
SEVERITY: ${crisis.severity}/10, Confidence: ${(crisis.confidence * 100).toFixed(0)}%
${secondaryCrisis ? `SECONDARY CRISIS: ${secondaryCrisis.type} at ${secondaryCrisis.location} (severity ${secondaryCrisis.severity}/10)` : "No secondary crisis."}
 
RESOURCES ALLOCATED:
${JSON.stringify(allocation.allocated, null, 2)}
 
SHORTFALLS: ${allocation.tradeoffs.length > 0 ? allocation.tradeoffs.join("; ") : "None"}
RESOURCE CONFLICTS: ${conflicts.length > 0 ? conflicts.map(c => `${c.resource}: need ${c.totalNeeded}, have ${c.available}`).join(", ") : "None"}
CONFLICTING HYPOTHESIS: ${crisis.conflictingHypothesis || "None"}
 
Return ONLY this JSON:
{
  "responseId": "RESP-001",
  "primaryActions": [
    { "id": "ACT-001", "action": "Reroute traffic via Margalla Road", "unit": "Traffic Police", "unitsAssigned": 4, "priority": "immediate", "estimatedTime": "5 minutes", "targetLocation": "${crisis.location}" },
    { "id": "ACT-002", "action": "Dispatch rescue teams to affected zone", "unit": "1122 Rescue", "unitsAssigned": 3, "priority": "immediate", "estimatedTime": "8 minutes", "targetLocation": "${crisis.location}" },
    { "id": "ACT-003", "action": "Send public flood alert via SMS", "unit": "CIRO Alert System", "unitsAssigned": 0, "priority": "immediate", "estimatedTime": "1 minute", "targetLocation": "All residents" },
    { "id": "ACT-004", "action": "Notify PIMS Hospital for casualty readiness", "unit": "Emergency Coordination", "unitsAssigned": 0, "priority": "high", "estimatedTime": "2 minutes", "targetLocation": "PIMS Hospital" }
  ],
  "resourceAllocation": { "primaryCrisis": ${JSON.stringify(allocation.allocated)}, "secondaryCrisis": ${JSON.stringify(secondaryNeeds)} },
  "publicAlert": { "message": "FLOOD ALERT: ${crisis.location} experiencing ${crisis.type}. Avoid area. Use alternate routes. Call 1122.", "channels": ["SMS", "App Notification", "Radio"], "targetAudience": "${crisis.location} residents and commuters" },
  "hospitalNotification": "PIMS and Poly Clinic notified for potential flood casualties",
  "tradeoffs": "${secondaryCrisis ? `Splitting rescue teams: ${crisis.location} gets priority due to higher severity` : "Full allocation to primary crisis"}",
  "fallbackPlan": "If rescue teams delayed beyond 15 min, request helicopter deployment and PDMA activation",
  "estimatedResponseTimeMin": 8,
  "stagingRationale": "${crisis.conflictingHypothesis ? "Holding public alert pending field verification of conflicting hypothesis" : "Issuing immediate alert — confidence sufficient"}"
}`;
 
    this.log("REASONING", "Calling Gemini for phased action plan...");
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const match = raw.match(/\{[\s\S]*\}/);
      const plan = match ? JSON.parse(match[0]) : null;
 
      if (plan) {
        this.log("DECISION", `Plan ${plan.responseId}: ${plan.primaryActions?.length} actions, ETA ${plan.estimatedResponseTimeMin}min`);
        const stateAfter = { resources: this.resourceState, activeAlerts: 3, dispatched: Object.entries(allocation.allocated).map(([r, n]) => `${n} ${r}`), systemStatus: "ACTIVE_RESPONSE" };
        return { ...plan, allocation, conflicts, messages, stateBefore, stateAfter, trace: this.trace };
      }
    } catch (err) {
      this.log("FALLBACK", `Gemini failed: ${err.message} — using default plan`);
    }
 
    // Fallback plan
    const stateAfter = { resources: this.resourceState, activeAlerts: 3, systemStatus: "ACTIVE_RESPONSE" };
    return {
      responseId: `RESP-${Date.now()}`,
      primaryActions: [
        { id: "ACT-001", action: "Reroute traffic via alternate routes", unit: "Traffic Police", unitsAssigned: 4, priority: "immediate", estimatedTime: "5 minutes", targetLocation: crisis.location },
        { id: "ACT-002", action: "Dispatch rescue teams", unit: "1122 Rescue", unitsAssigned: 3, priority: "immediate", estimatedTime: "8 minutes", targetLocation: crisis.location },
        { id: "ACT-003", action: "Send public alert", unit: "CIRO Alert System", unitsAssigned: 0, priority: "immediate", estimatedTime: "1 minute", targetLocation: "All residents" },
      ],
      publicAlert: { message: `EMERGENCY: ${crisis.type} at ${crisis.location}. Call 1122.`, channels: ["SMS", "App"], targetAudience: "All residents" },
      allocation, conflicts, messages, stateBefore, stateAfter,
      tradeoffs: "Default allocation applied", fallbackPlan: "Escalate to PDMA if resources insufficient",
      estimatedResponseTimeMin: 10, trace: this.trace,
    };
  }
}
 
export default PlannerAgent;
 