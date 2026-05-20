// executorAgent.js — Agent 3: Action Execution, Fallback & Recovery
 
import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config.js";
 
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: config.gemini.model });
 

const INCIDENT_LOG = [];
 
export class ExecutorAgent {
  constructor() {
    this.name = "ExecutorAgent";
    this.tools = ["send_sms_alert", "write_incident_log", "check_escalation_history", "update_classification", "retract_alert"];
    this.trace = [];
    this.executionLog = [];
  }
 
  log(step, data) {
    const entry = { agent: this.name, step, timestamp: new Date().toISOString(), data };
    this.trace.push(entry);
    console.log(`\n[${this.name}] ${step}`);
    if (typeof data === "string") console.log("  →", data);
    else console.log("  →", JSON.stringify(data, null, 2).split("\n").slice(0, 8).join("\n"));
  }
 
  // TOOL: Send SMS alert (Twilio if configured, else fallback queue)
  async sendSMSAlert(message, recipient = "Emergency Coordinator") {
    const { accountSid, authToken, from, to } = config.twilio;
    const twilioReady = accountSid && authToken && from && to;
 
    if (twilioReady) {
      try {
        // Dynamic import so missing twilio package doesn't crash the whole app
        const twilio = (await import("twilio")).default;
        const client = twilio(accountSid, authToken);
        const result = await client.messages.create({ body: message, from, to });
        return { success: true, sid: result.sid, method: "twilio_live", recipient };
      } catch (err) {
        this.log("FALLBACK", `Twilio failed: ${err.message} — using notification queue`);
      }
    }
 
    // Fallback: notification queue
    const queued = {
      id: `SMS-${Date.now()}`,
      status: "QUEUED",
      message,
      recipient,
      timestamp: new Date().toISOString(),
      method: "notification_queue_fallback",
    };
    this.executionLog.push(queued);
    return { success: true, ...queued };
  }
 
  // TOOL: Write incident to log (Google Sheets if configured, else in-memory)
  async writeIncidentLog(incidentData) {
    const { credentialsPath, spreadsheetId } = config.googleSheets;
    if (credentialsPath && spreadsheetId) {
      try {
        const { google } = await import("googleapis");
        const auth = new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
        const sheets = google.sheets({ version: "v4", auth });
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "IncidentLog!A:I",
          valueInputOption: "RAW",
          resource: { values: [[new Date().toISOString(), incidentData.locationKey, incidentData.crisisType, incidentData.severity, incidentData.status]] },
        });
        return { success: true, method: "google_sheets_live" };
      } catch (err) {
        this.log("FALLBACK", `Google Sheets failed: ${err.message} — using in-memory`);
      }
    }
 
    // In-memory fallback
    const record = { ...incidentData, id: `INC-${Date.now()}`, timestamp: new Date().toISOString() };
    INCIDENT_LOG.push(record);
    return { success: true, method: "in_memory_fallback", id: record.id, totalRecords: INCIDENT_LOG.length };
  }
 
  // TOOL: Check if this location has had repeated incidents
  async checkEscalationHistory(locationKey) {
    const cutoff = new Date(Date.now() - config.thresholds.escalationHours * 3600 * 1000);
    const recent = INCIDENT_LOG.filter(r => r.locationKey === locationKey && new Date(r.timestamp) > cutoff);
    const shouldEscalate = recent.length >= config.thresholds.escalationCount;
    return {
      recentIncidents: recent.length,
      shouldEscalate,
      escalationLevel: shouldEscalate ? "District Commissioner + PDMA" : "Standard 1122",
    };
  }
 
  // TOOL: Update classification after field verification
  async updateClassification(incidentId, correction, reason) {
    const record = INCIDENT_LOG.find(r => r.id === incidentId);
    if (record) {
      record.originalType = record.crisisType;
      record.crisisType = correction;
      record.status = "CORRECTED";
      record.correctionNote = reason;
      record.correctedAt = new Date().toISOString();
    }
    return { updated: true, incidentId, correction, reason };
  }
 
  // TOOL: Retract a public alert
  async retractAlert(originalAlertId, reason) {
    const retraction = {
      type: "RETRACTION",
      originalId: originalAlertId,
      reason,
      message: `CIRO UPDATE: Previous alert ${originalAlertId} is retracted. Field verification shows: ${reason}. No evacuation needed.`,
      timestamp: new Date().toISOString(),
    };
    this.executionLog.push(retraction);
    return retraction;
  }
 
  async execute(crisis, plan) {
    this.log("OBSERVE", `Executing plan ${plan.responseId} for ${crisis.type} at ${crisis.location}`);
 
    // 1. Check escalation history
    this.log("TOOL_CALL", `check_escalation_history(${crisis.location})`);
    const escalation = await this.checkEscalationHistory(crisis.location);
    this.log("TOOL_RESULT", escalation);
 
    // 2. Log incident
    this.log("TOOL_CALL", "write_incident_log(incident_data)");
    const logResult = await this.writeIncidentLog({
      locationKey: crisis.location,
      crisisType: crisis.type,
      severity: crisis.severity,
      status: "ACTIVE",
    });
    const incidentId = logResult.id || `INC-${Date.now()}`;
    this.log("TOOL_RESULT", { method: logResult.method, id: incidentId });
 
    // 3. Send alerts
    if (crisis.confidence >= 0.7) {
      this.log("TOOL_CALL", "send_sms_alert(public_alert)");
      const smsEn = await this.sendSMSAlert(plan.publicAlert?.message || `EMERGENCY: ${crisis.type} at ${crisis.location}. Take precautions.`, "Public Broadcast");
      this.log("TOOL_RESULT", { status: smsEn.status || "SENT", method: smsEn.method });
 
      // Urdu alert
      await this.sendSMSAlert(`ہنگامی اطلاع: ${crisis.location} میں ${crisis.type === "urban_flooding" ? "سیلاب" : "ہنگامی صورتحال"}۔ محفوظ مقام پر جائیں۔`, "Urdu Public Alert");
    } else {
      this.log("ADAPT", "Low confidence — sending alert only to NDMA, not public");
      await this.sendSMSAlert(`NDMA INTERNAL: Possible ${crisis.type} at ${crisis.location}. Confidence: ${(crisis.confidence * 100).toFixed(0)}%. Field verification needed.`, "NDMA Coordinator");
    }
 
    // 4. Simulate traffic rerouting
    this.log("TOOL_CALL", "simulate_traffic_reroute()");
    const reroute = {
      blockedRoads: plan.primaryActions?.filter(a => a.action?.toLowerCase().includes("reroute")).map(a => a.targetLocation) || [crisis.location],
      alternateRoute: "Margalla Road → Kashmir Highway → IJP Road",
      congestionBefore: `${90 + crisis.severity}%`,
      congestionAfter: `${Math.max(10, 90 + crisis.severity - 68)}%`,
      reroutedAt: new Date().toISOString(),
    };
    this.log("TOOL_RESULT", reroute);
 
    if (escalation.shouldEscalate) {
      this.log("ADAPT", `Repeat incident — escalating to ${escalation.escalationLevel}`);
      await this.sendSMSAlert(`CIRO ESCALATION: Repeat incident at ${crisis.location}. Escalating to ${escalation.escalationLevel}.`, escalation.escalationLevel);
    }
    let correctionResult = null;
    if (crisis.conflictingHypothesis) {
      this.log("EVALUATE", "Conflicting hypothesis detected — awaiting field verification...");
      // Simulate: 50% chance field team confirms the alternative
      const fieldConfirmsAlternative = Math.random() > 0.5;
      if (fieldConfirmsAlternative) {
        this.log("ADAPT", `Field team confirms: "${crisis.conflictingHypothesis}" — updating classification`);
        correctionResult = await this.updateClassification(incidentId, crisis.conflictingHypothesis, "Field team on-site verification");
        const retraction = await this.retractAlert(incidentId, crisis.conflictingHypothesis);
        await this.sendSMSAlert(retraction.message, "Public Retraction Broadcast");
        this.log("ACTION", "Alert retracted. Incident reclassified.");
      } else {
        this.log("EVALUATE", "Field team confirms original classification — no retraction needed");
      }
    }
 
   
    this.log("EVALUATE", "Calling Gemini to assess execution outcome...");
    const prompt = `
You are CIRO's Executor Agent. Evaluate this execution and return ONLY valid JSON.
 
EXECUTION:
- Incident: ${crisis.type} at ${crisis.location}, severity ${crisis.severity}/10
- Plan ID: ${plan.responseId}
- Actions executed: ${plan.primaryActions?.length || 4}
- SMS alerts sent: ${this.executionLog.length}
- Escalated: ${escalation.shouldEscalate}
- Field correction applied: ${correctionResult ? "YES — " + correctionResult.correction : "NO"}
- Traffic rerouted: YES — congestion ${reroute.congestionBefore} → ${reroute.congestionAfter}
 
Return ONLY this JSON:
{
  "executionStatus": "SUCCESS",
  "actionsCompleted": ["Traffic rerouted", "Emergency services dispatched", "Public alert sent", "Incident logged"],
  "actionsSkipped": [],
  "adaptationsApplied": ["Staged alerting due to conflicting hypothesis"],
  "systemStateChange": "System moved from IDLE to ACTIVE. Congestion reduced by 64%. 3 alerts dispatched.",
  "lessonsLearned": ["Pre-position rescue teams during monsoon"],
  "incidentStatus": "ACTIVE"
}`;
 
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const match = raw.match(/\{[\s\S]*\}/);
      const evaluation = match ? JSON.parse(match[0]) : { executionStatus: "SUCCESS", incidentStatus: "ACTIVE" };
      this.log("DECISION", `Status: ${evaluation.executionStatus} | Incident: ${evaluation.incidentStatus}`);
 
      return { incidentId, logResult, escalation, correctionResult, reroute, evaluation, notificationQueue: this.executionLog, trace: this.trace };
    } catch (err) {
      this.log("FALLBACK", `Gemini evaluation failed: ${err.message} — using defaults`);
      return { incidentId, logResult, escalation, correctionResult, reroute, evaluation: { executionStatus: "SUCCESS", incidentStatus: "ACTIVE" }, notificationQueue: this.executionLog, trace: this.trace };
    }
  }
}
 
export default ExecutorAgent;
