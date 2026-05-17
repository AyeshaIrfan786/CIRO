import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, SafeAreaView, StatusBar } from 'react-native';
import { simulateImpact } from '../simulation/impactSimulator.js';

function MetricRow({ label, before, after, good, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[s.metricRow, { opacity: anim }]}>
      <Text style={s.metricLabel}>{label}</Text>
      <View style={s.metricVals}>
        <Text style={s.metricBefore}>{before}</Text>
        <Text style={s.metricArrow}>→</Text>
        <Text style={[s.metricAfter, { color: good ? '#22C55E' : '#EF4444' }]}>{after}</Text>
      </View>
    </Animated.View>
  );
}

function AgentTraceItem({ entry, index }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true }).start();
  }, []);

  const stepColors = {
    OBSERVE: '#3B82F6', TOOL_CALL: '#8B5CF6', TOOL_RESULT: '#22C55E',
    REASONING: '#F59E0B', DECISION: '#EC4899', FALLBACK: '#EF4444',
    ADAPT: '#14B8A6', EVALUATE: '#F97316', ACTION: '#84CC16',
  };
  const color = stepColors[entry.step] || '#555';

  return (
    <Animated.View style={[s.traceItem, { opacity: anim }]}>
      <View style={[s.traceStep, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Text style={[s.traceStepText, { color }]}>{entry.step}</Text>
      </View>
      <View style={s.traceRight}>
        <Text style={s.traceAgent}>{entry.agent}</Text>
        <Text style={s.traceData} numberOfLines={2}>
          {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data).slice(0, 80)}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function OutcomeScreen({ route, navigation }) {
  const { scenario, detection, analysis, plan, execResult } = route.params;

  const crisis = {
    type: detection.classification.primaryCrisisType,
    location: detection.locationKey,
    severity: analysis.fusion.fusedScore >= 70 ? 8 : 6,
    confidence: detection.classification.confidence || 0.7,
  };

  const impact = simulateImpact(crisis, plan, execResult);

  // Collect all agent traces
  const allTraces = [
    ...(detection.trace || []),
    ...(analysis.trace || []),
    ...(plan?.trace || []),
    ...(execResult?.trace || []),
  ];

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={s.stepLabel}>IMPACT REPORT</Text>
        </View>

        {/* Success header */}
        <Animated.View style={[s.successHeader, { opacity: headerAnim }]}>
          <View style={s.successBadge}><Text style={s.successBadgeText}>✓ PIPELINE COMPLETE</Text></View>
          <Text style={s.successTitle}>MISSION{'\n'}ACCOMPLISHED</Text>
          <Text style={s.successSub}>{scenario.name} · {new Date().toLocaleTimeString()}</Text>
        </Animated.View>

        {/* Before vs After */}
        <Text style={s.sectionLabel}>BEFORE vs AFTER</Text>
        <View style={s.beforeAfterCard}>
          <MetricRow label="Congestion" before={impact.before.congestionLevel} after={impact.after.congestionLevel} good delay={100} />
          <MetricRow label="Response time" before={impact.before.estimatedResponseTime} after={impact.after.estimatedResponseTime} good delay={200} />
          <MetricRow label="Rescue units" before="0 deployed" after={`${impact.after.activeRescueUnits} deployed`} good delay={300} />
          <MetricRow label="Alerts sent" before="0" after={impact.after.alertsSent.toLocaleString()} good delay={400} />
          <MetricRow label="System status" before={impact.before.systemStatus} after={impact.after.systemStatus} good delay={500} />
        </View>

        {/* Key metrics */}
        <Text style={s.sectionLabel}>KEY METRICS</Text>
        <View style={s.metricsGrid}>
          <View style={s.metricCard}>
            <Text style={s.metricCardNum} numberOfLines={1}>{impact.metrics.congestionReduction}</Text>
            <Text style={s.metricCardLabel}>Congestion reduced</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricCardNum} numberOfLines={1}>{impact.metrics.responseTimeImprovement.split(' ')[0]}</Text>
            <Text style={s.metricCardLabel}>Faster response</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={[s.metricCardNum, { fontSize: 13 }]}>{impact.metrics.costPerOperation.split(' ')[0]}</Text>
            <Text style={s.metricCardLabel}>Per operation</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={[s.metricCardNum, { fontSize: 13, color: '#22C55E' }]}>4 AGENTS</Text>
            <Text style={s.metricCardLabel}>Coordinated</Text>
          </View>
        </View>

        {/* Baseline comparison */}
        <Text style={s.sectionLabel}>BASELINE COMPARISON</Text>
        <View style={s.comparisonCard}>
          <View style={s.compRow}>
            <View style={s.compLabel}>
              <View style={[s.compDot, { backgroundColor: '#22C55E' }]} />
              <Text style={s.compLabelText}>CIRO AGENTIC</Text>
            </View>
            <Text style={s.compVal}>{impact.metrics.baselineComparison.agenticSystem.split('—')[0]}</Text>
          </View>
          <View style={s.compRow}>
            <View style={s.compLabel}>
              <View style={[s.compDot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.compLabelText}>MANUAL SYSTEM</Text>
            </View>
            <Text style={s.compVal}>{impact.metrics.baselineComparison.manualSystem.split('—')[0]}</Text>
          </View>
          <View style={s.improvementBadge}>
            <Text style={s.improvementText}>↑ {impact.metrics.baselineComparison.improvement}</Text>
          </View>
        </View>

        {/* Scalability */}
        <View style={s.scaleCard}>
          <Text style={s.scaleTitle}>📈 SCALABILITY</Text>
          <Text style={s.scaleText}>{impact.metrics.scalabilityNote}</Text>
        </View>

        {/* Agent trace */}
        <Text style={s.sectionLabel}>AGENT TRACE LOG ({allTraces.length} entries)</Text>
        <View style={s.traceCard}>
          {allTraces.slice(0, 20).map((entry, i) => (
            <AgentTraceItem key={i} entry={entry} index={i} />
          ))}
          {allTraces.length > 20 && (
            <Text style={s.traceMore}>+ {allTraces.length - 20} more entries</Text>
          )}
        </View>

        {/* Restart */}
        <TouchableOpacity
          style={s.restartBtn}
          onPress={() => navigation.navigate('Input')}
          activeOpacity={0.85}
        >
          <Text style={s.restartBtnText}>← RUN ANOTHER SCENARIO</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  scroll: { padding: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  stepLabel: { color: '#333', fontSize: 10, letterSpacing: 2 },
  successHeader: { marginBottom: 32 },
  successBadge: { backgroundColor: '#22C55E22', borderWidth: 1, borderColor: '#22C55E44', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  successBadgeText: { color: '#22C55E', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  successTitle: { color: '#FFF', fontSize: 40, fontWeight: '900', letterSpacing: 4, lineHeight: 44, marginBottom: 8 },
  successSub: { color: '#444', fontSize: 12, letterSpacing: 1 },
  sectionLabel: { color: '#333', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  beforeAfterCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 16, marginBottom: 20 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A22' },
  metricLabel: { color: '#555', fontSize: 11, fontWeight: '600', letterSpacing: 1, flex: 1 },
  metricVals: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricBefore: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  metricArrow: { color: '#333', fontSize: 12 },
  metricAfter: { fontSize: 12, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14 },
  metricCardNum: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  metricCardLabel: { color: '#444', fontSize: 10, letterSpacing: 1 },
  comparisonCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 16, marginBottom: 12 },
  compRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A22' },
  compLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compDot: { width: 8, height: 8, borderRadius: 4 },
  compLabelText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  compVal: { color: '#888', fontSize: 11, flex: 1, textAlign: 'right', marginLeft: 12 },
  improvementBadge: { backgroundColor: '#22C55E22', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  improvementText: { color: '#22C55E', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  scaleCard: { backgroundColor: '#3B82F608', borderWidth: 1, borderColor: '#3B82F633', borderRadius: 10, padding: 14, marginBottom: 20 },
  scaleTitle: { color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  scaleText: { color: '#555', fontSize: 12, lineHeight: 18 },
  traceCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 12, marginBottom: 24, gap: 2 },
  traceItem: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#16161E' },
  traceStep: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', minWidth: 72, alignItems: 'center' },
  traceStepText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  traceRight: { flex: 1 },
  traceAgent: { color: '#444', fontSize: 9, fontWeight: '600', letterSpacing: 1, marginBottom: 2 },
  traceData: { color: '#555', fontSize: 11, lineHeight: 16 },
  traceMore: { color: '#333', fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  restartBtn: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  restartBtnText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});
