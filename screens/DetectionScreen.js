import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import DetectorAgent from '../agents/detectorAgent.js';
import { AnalystAgent } from '../agents/analystAgent.js';

export default function DetectionScreen({ route, navigation }) {
  const { scenario, userText } = route.params;
  const [phase, setPhase] = useState('detecting'); // detecting | analyzing | done | error
  const [detection, setDetection] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [logs, setLogs] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const addLog = (msg) => setLogs(prev => [...prev, { msg, time: new Date().toLocaleTimeString() }]);

  useEffect(() => {
    runDetection();
  }, []);

  const runDetection = async () => {
    try {
      addLog('Detector Agent: ingesting signals...');
      const detector = new DetectorAgent();
      const detectionResult = await detector.detect(scenario.locationKey, scenario.scenario, userText);
      setDetection(detectionResult);
      addLog(`Detected: ${detectionResult.classification.primaryCrisisType}`);
      addLog(`Confidence: ${((detectionResult.classification.confidence || 0.7) * 100).toFixed(0)}%`);

      setPhase('analyzing');
      addLog('Analyst Agent: computing confidence fusion...');
      const analyst = new AnalystAgent();
      const analysisResult = await analyst.analyze(detectionResult);
      setAnalysis(analysisResult);
      addLog(`Fused score: ${analysisResult.fusion.fusedScore}/100`);
      addLog(`Severity: ${analysisResult.analysis.confirmedSeverity}`);

      setPhase('done');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      addLog(`Error: ${err.message}`);
      setPhase('error');
    }
  };

  const getSeverityColor = (label) => {
    if (!label) return '#F59E0B';
    if (label === 'HIGH') return '#EF4444';
    if (label === 'MEDIUM') return '#F59E0B';
    return '#22C55E';
  };

  const getConfidenceBar = (conf) => Math.round((conf || 0.7) * 100);

  if (phase === 'detecting' || phase === 'analyzing') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={s.loadingTitle}>{phase === 'detecting' ? 'DETECTING CRISIS' : 'ANALYZING SIGNALS'}</Text>
          <Text style={s.loadingPhase}>{phase === 'detecting' ? 'Agent 1 of 4' : 'Agent 2 of 4'}</Text>
          <View style={s.logsBox}>
            {logs.slice(-5).map((l, i) => (
              <Text key={i} style={s.logLine}>
                <Text style={s.logTime}>{l.time}  </Text>{l.msg}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'error' || !detection || !analysis) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingContainer}>
          <Text style={[s.loadingTitle, { color: '#EF4444' }]}>DETECTION ERROR</Text>
          <Text style={s.loadingPhase}>Check console for details</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>← GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cls = detection.classification;
  const severityColor = getSeverityColor(analysis.analysis.confirmedSeverity);
  const confPct = getConfidenceBar(cls.confidence);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView contentContainerStyle={s.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.backText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={s.stepLabel}>STEP 1–2 OF 4</Text>
          </View>

          {/* Crisis headline card */}
          <View style={[s.headlineCard, { borderColor: severityColor + '55' }]}>
            <View style={s.headlineTop}>
              <View style={[s.severityBadge, { backgroundColor: severityColor + '22', borderColor: severityColor + '55' }]}>
                <View style={[s.severityDot, { backgroundColor: severityColor }]} />
                <Text style={[s.severityText, { color: severityColor }]}>{analysis.analysis.confirmedSeverity} SEVERITY</Text>
              </View>
              <Text style={s.crisisType}>{cls.primaryCrisisType?.toUpperCase()}</Text>
            </View>
            <Text style={s.locationText}>{scenario.scenario === 'flooding' ? '📍 ' : '📍 '}{scenario.locationKey.toUpperCase()} · {scenario.name}</Text>

            {/* Confidence bar */}
            <View style={s.confRow}>
              <Text style={s.confLabel}>CONFIDENCE</Text>
              <View style={s.confBarWrap}>
                <View style={[s.confBar, { width: `${confPct}%`, backgroundColor: confPct >= 70 ? '#22C55E' : confPct >= 50 ? '#F59E0B' : '#EF4444' }]} />
              </View>
              <Text style={s.confPct}>{confPct}%</Text>
            </View>

            {cls.requiresFieldVerification && (
              <View style={s.warningRow}>
                <Text style={s.warningText}>⚠ Field verification required — conflicting hypothesis: "{cls.alternativeHypothesis}"</Text>
              </View>
            )}
          </View>

          {/* Fusion scores */}
          <Text style={s.sectionLabel}>SIGNAL FUSION</Text>
          <View style={s.fusionCard}>
            <View style={s.fusionRow}>
              <Text style={s.fusionLabel}>FUSED SCORE</Text>
              <Text style={[s.fusionScore, { color: severityColor }]}>{analysis.fusion.fusedScore}<Text style={s.fusionMax}>/100</Text></Text>
            </View>
            <View style={s.fusionDivider} />
            {Object.entries(analysis.fusion.components || {}).map(([key, val]) => (
              <View key={key} style={s.componentRow}>
                <Text style={s.componentLabel}>{key.toUpperCase()}</Text>
                <View style={s.componentBarWrap}>
                  <View style={[s.componentBar, { width: `${val.score}%` }]} />
                </View>
                <Text style={s.componentScore}>{val.score}</Text>
                <View style={[s.componentLevelPill, { backgroundColor: val.label === 'HIGH' ? '#EF444422' : '#F59E0B22' }]}>
                  <Text style={[s.componentLevel, { color: val.label === 'HIGH' ? '#EF4444' : '#F59E0B' }]}>{val.label}</Text>
                </View>
              </View>
            ))}
            {analysis.fusion.conflictPenalty !== 'None' && (
              <Text style={s.penaltyNote}>⚡ Conflict penalty applied: {analysis.fusion.conflictPenalty}</Text>
            )}
          </View>

          {/* Impact */}
          <Text style={s.sectionLabel}>IMPACT ESTIMATE</Text>
          <View style={s.impactGrid}>
            <View style={s.impactCard}>
              <Text style={s.impactNum}>{(analysis.impact.estimatedAffectedPopulation || 0).toLocaleString()}</Text>
              <Text style={s.impactCardLabel}>People affected</Text>
            </View>
            <View style={s.impactCard}>
              <Text style={s.impactNum}>{analysis.impact.economicLossFormatted}</Text>
              <Text style={s.impactCardLabel}>Economic risk</Text>
            </View>
            <View style={s.impactCard}>
              <Text style={s.impactNum}>{analysis.impact.responseTimeTargetMin}m</Text>
              <Text style={s.impactCardLabel}>Target response</Text>
            </View>
            <View style={s.impactCard}>
              <Text style={[s.impactNum, { color: analysis.impact.cascadeRisk ? '#EF4444' : '#22C55E', fontSize: 14 }]}>
                {analysis.impact.cascadeRisk ? 'HIGH RISK' : 'CONTAINED'}
              </Text>
              <Text style={s.impactCardLabel}>Cascade risk</Text>
            </View>
          </View>

          {/* Agent reasoning */}
          {analysis.analysis.analysisReasoning && (
            <>
              <Text style={s.sectionLabel}>AGENT REASONING</Text>
              <View style={s.reasoningCard}>
                <Text style={s.reasoningText}>{analysis.analysis.analysisReasoning}</Text>
              </View>
            </>
          )}

          {/* Next step */}
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => navigation.navigate('Simulation', { scenario, userText, detection, analysis })}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>PLAN & SIMULATE RESPONSE</Text>
            <Text style={s.nextBtnArrow}>→</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  scroll: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  loadingTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 3, marginTop: 16 },
  loadingPhase: { color: '#555', fontSize: 12, letterSpacing: 2 },
  logsBox: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14, width: '100%', marginTop: 8, gap: 4 },
  logLine: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  logTime: { color: '#333' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  stepLabel: { color: '#333', fontSize: 10, letterSpacing: 2 },
  headlineCard: { backgroundColor: '#111116', borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 24 },
  headlineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  crisisType: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  locationText: { color: '#555', fontSize: 12, marginBottom: 16 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  confLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 80 },
  confBarWrap: { flex: 1, height: 4, backgroundColor: '#1E1E2A', borderRadius: 2, overflow: 'hidden' },
  confBar: { height: 4, borderRadius: 2 },
  confPct: { color: '#888', fontSize: 11, width: 32, textAlign: 'right' },
  warningRow: { backgroundColor: '#F59E0B11', borderWidth: 1, borderColor: '#F59E0B33', borderRadius: 8, padding: 10, marginTop: 8 },
  warningText: { color: '#F59E0B', fontSize: 11, lineHeight: 16 },
  sectionLabel: { color: '#333', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  fusionCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 16, marginBottom: 20 },
  fusionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fusionLabel: { color: '#444', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  fusionScore: { fontSize: 36, fontWeight: '800' },
  fusionMax: { fontSize: 14, color: '#444' },
  fusionDivider: { height: 1, backgroundColor: '#1E1E2A', marginBottom: 12 },
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  componentLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 64 },
  componentBarWrap: { flex: 1, height: 3, backgroundColor: '#1E1E2A', borderRadius: 2, overflow: 'hidden' },
  componentBar: { height: 3, backgroundColor: '#3B82F6', borderRadius: 2 },
  componentScore: { color: '#666', fontSize: 11, width: 24, textAlign: 'right' },
  componentLevelPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  componentLevel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  penaltyNote: { color: '#F59E0B', fontSize: 11, marginTop: 8 },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  impactCard: { flex: 1, minWidth: '45%', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14 },
  impactNum: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  impactCardLabel: { color: '#444', fontSize: 10, letterSpacing: 1 },
  reasoningCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14, marginBottom: 24 },
  reasoningText: { color: '#777', fontSize: 13, lineHeight: 20 },
  nextBtn: { backgroundColor: '#22C55E', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  nextBtnText: { color: '#000', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  nextBtnArrow: { color: '#000', fontSize: 18, fontWeight: '300' },
  backBtn: { marginTop: 24, padding: 16 },
  backBtnText: { color: '#555', fontSize: 12, letterSpacing: 2 },
});
