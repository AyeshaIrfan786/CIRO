import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { PlannerAgent } from '../agents/plannerAgent.js';
import { ExecutorAgent } from '../agents/executorAgent.js';

const ACTION_ICONS = { immediate: '🚨', high: '⚡', medium: '📋' };
const UNIT_COLORS = {
  'Traffic Police': '#3B82F6',
  '1122 Rescue': '#EF4444',
  'CIRO Alert System': '#F59E0B',
  'Emergency Coordination': '#8B5CF6',
};

function ActionCard({ action, index, visible }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const unitColor = UNIT_COLORS[action.unit] || '#555';

  return (
    <Animated.View style={[s.actionCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={s.actionLeft}>
        <View style={[s.actionIconBox, { backgroundColor: unitColor + '22' }]}>
          <Text style={s.actionIcon}>{ACTION_ICONS[action.priority] || '📋'}</Text>
        </View>
        <View style={s.actionBody}>
          <Text style={s.actionText}>{action.action}</Text>
          <View style={s.actionMeta}>
            <View style={[s.unitPill, { backgroundColor: unitColor + '22', borderColor: unitColor + '44' }]}>
              <Text style={[s.unitText, { color: unitColor }]}>{action.unit}</Text>
            </View>
            <Text style={s.actionTime}>{action.estimatedTime}</Text>
          </View>
        </View>
      </View>
      <View style={s.doneTag}><Text style={s.doneText}>✓ EXEC</Text></View>
    </Animated.View>
  );
}

export default function SimulationScreen({ route, navigation }) {
  const { scenario, userText, detection, analysis } = route.params;
  const [phase, setPhase] = useState('planning');
  const [plan, setPlan] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [visibleActions, setVisibleActions] = useState(0);
  const [logs, setLogs] = useState([]);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const addLog = (msg) => setLogs(prev => [...prev, { msg, time: new Date().toLocaleTimeString() }]);

  useEffect(() => { runPlanAndExecute(); }, []);

  const runPlanAndExecute = async () => {
    try {
      const cls = detection.classification;
      const crisis = {
        type: cls.primaryCrisisType || 'urban_flooding',
        location: detection.locationKey,
        severity: analysis.fusion.fusedScore >= 70 ? 8 : analysis.fusion.fusedScore >= 40 ? 6 : 4,
        confidence: cls.confidence || 0.7,
        conflictingHypothesis: cls.alternativeHypothesis || null,
        affectedZones: cls.affectedZones || [],
      };

      addLog('Planner Agent: checking resource conflicts...');
      const planner = new PlannerAgent();
      const planResult = await planner.plan(crisis, scenario.secondaryCrisis || null);
      setPlan(planResult);
      addLog(`Plan ${planResult.responseId}: ${planResult.primaryActions?.length} actions`);

      Animated.timing(progressAnim, { toValue: 0.5, duration: 600, useNativeDriver: false }).start();
      setPhase('executing');

      addLog('Executor Agent: simulating response...');
      const executor = new ExecutorAgent();
      const result = await executor.execute(crisis, planResult);
      setExecResult(result);
      addLog(`Incident logged: ${result.incidentId}`);
      addLog(`Traffic: ${result.reroute.congestionBefore} → ${result.reroute.congestionAfter}`);
      if (result.correctionResult) addLog('⚠ RETRACTION issued — classification updated');

      Animated.timing(progressAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();

      // Reveal actions one by one
      setPhase('done');
      const actions = planResult.primaryActions || [];
      for (let i = 0; i <= actions.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setVisibleActions(i + 1);
      }
    } catch (err) {
      addLog(`Error: ${err.message}`);
      setPhase('error');
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (phase === 'planning' || phase === 'executing') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={s.loadingTitle}>{phase === 'planning' ? 'PLANNING RESPONSE' : 'EXECUTING ACTIONS'}</Text>
          <Text style={s.loadingPhase}>{phase === 'planning' ? 'Agent 3 of 4' : 'Agent 4 of 4'}</Text>
          <View style={s.progressWrap}>
            <Animated.View style={[s.progressBar, { width: progressWidth }]} />
          </View>
          <View style={s.logsBox}>
            {logs.slice(-5).map((l, i) => (
              <Text key={i} style={s.logLine}><Text style={s.logTime}>{l.time}  </Text>{l.msg}</Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const actions = plan?.primaryActions || [];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={s.stepLabel}>STEP 3–4 OF 4</Text>
        </View>

        {/* Plan header */}
        <View style={s.planHeader}>
          <View style={s.planBadge}><Text style={s.planBadgeText}>{plan?.responseId}</Text></View>
          <Text style={s.planTitle}>RESPONSE EXECUTED</Text>
          <Text style={s.planSub}>{actions.length} actions · ETA {plan?.estimatedResponseTimeMin || 8} min</Text>
        </View>

        {/* Incident ticket */}
        {execResult && (
          <View style={s.ticketCard}>
            <View style={s.ticketRow}>
              <Text style={s.ticketLabel}>TICKET ID</Text>
              <Text style={s.ticketVal}>{execResult.incidentId}</Text>
            </View>
            <View style={s.ticketRow}>
              <Text style={s.ticketLabel}>STORAGE</Text>
              <Text style={[s.ticketVal, { color: '#22C55E' }]}>{execResult.logResult?.method?.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
            <View style={s.ticketRow}>
              <Text style={s.ticketLabel}>ALERTS SENT</Text>
              <Text style={s.ticketVal}>{execResult.notificationQueue?.length || 0} queued</Text>
            </View>
            <View style={s.ticketRow}>
              <Text style={s.ticketLabel}>ESCALATION</Text>
              <Text style={s.ticketVal}>{execResult.escalation?.escalationLevel}</Text>
            </View>
          </View>
        )}

        {/* Traffic reroute */}
        {execResult?.reroute && (
          <View style={s.rerouteCard}>
            <Text style={s.rerouteTitle}>🚦 TRAFFIC REROUTED</Text>
            <View style={s.rerouteRow}>
              <Text style={s.rerouteBefore}>{execResult.reroute.congestionBefore}</Text>
              <Text style={s.rerouteArrow}>→</Text>
              <Text style={s.rerouteAfter}>{execResult.reroute.congestionAfter}</Text>
            </View>
            <Text style={s.rerouteRoute}>{execResult.reroute.alternateRoute}</Text>
          </View>
        )}

        {/* Retraction banner */}
        {execResult?.correctionResult && (
          <View style={s.retractionCard}>
            <Text style={s.retractionTitle}>⚠ CLASSIFICATION UPDATED</Text>
            <Text style={s.retractionText}>Field team confirmed: "{execResult.correctionResult.correction}" — public alert retracted.</Text>
          </View>
        )}

        {/* Actions */}
        <Text style={s.sectionLabel}>SIMULATED ACTIONS</Text>
        {actions.map((action, i) => (
          <ActionCard key={action.id} action={action} index={i} visible={i < visibleActions} />
        ))}

        {/* Public alert */}
        {plan?.publicAlert && visibleActions >= actions.length && (
          <View style={s.alertCard}>
            <Text style={s.alertTitle}>📢 PUBLIC ALERT SENT</Text>
            <Text style={s.alertMsg}>{plan.publicAlert.message}</Text>
            <View style={s.alertChannels}>
              {(plan.publicAlert.channels || []).map(ch => (
                <View key={ch} style={s.channelPill}><Text style={s.channelText}>{ch}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Next */}
        {visibleActions >= actions.length && (
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => navigation.navigate('Outcome', { scenario, detection, analysis, plan, execResult })}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>VIEW IMPACT REPORT</Text>
            <Text style={s.nextBtnArrow}>→</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  scroll: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  loadingTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 3, marginTop: 16 },
  loadingPhase: { color: '#555', fontSize: 12, letterSpacing: 2 },
  progressWrap: { width: '80%', height: 3, backgroundColor: '#1E1E2A', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 3, backgroundColor: '#22C55E', borderRadius: 2 },
  logsBox: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14, width: '100%', marginTop: 4, gap: 4 },
  logLine: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  logTime: { color: '#333' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  stepLabel: { color: '#333', fontSize: 10, letterSpacing: 2 },
  planHeader: { marginBottom: 20, alignItems: 'flex-start' },
  planBadge: { backgroundColor: '#22C55E22', borderWidth: 1, borderColor: '#22C55E44', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  planBadgeText: { color: '#22C55E', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  planTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  planSub: { color: '#555', fontSize: 12 },
  ticketCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 16, marginBottom: 12 },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1A1A22' },
  ticketLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  ticketVal: { color: '#888', fontSize: 11, fontFamily: 'monospace' },
  rerouteCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#3B82F633', borderRadius: 12, padding: 16, marginBottom: 12 },
  rerouteTitle: { color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  rerouteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  rerouteBefore: { color: '#EF4444', fontSize: 24, fontWeight: '800' },
  rerouteArrow: { color: '#555', fontSize: 20 },
  rerouteAfter: { color: '#22C55E', fontSize: 24, fontWeight: '800' },
  rerouteRoute: { color: '#555', fontSize: 12 },
  retractionCard: { backgroundColor: '#F59E0B11', borderWidth: 1, borderColor: '#F59E0B33', borderRadius: 10, padding: 14, marginBottom: 12 },
  retractionTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  retractionText: { color: '#F59E0BAA', fontSize: 12, lineHeight: 18 },
  sectionLabel: { color: '#333', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  actionCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  actionIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 16 },
  actionBody: { flex: 1 },
  actionText: { color: '#CCC', fontSize: 13, marginBottom: 6, lineHeight: 18 },
  actionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitPill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  unitText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  actionTime: { color: '#444', fontSize: 10 },
  doneTag: { backgroundColor: '#22C55E22', borderWidth: 1, borderColor: '#22C55E44', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  doneText: { color: '#22C55E', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  alertCard: { backgroundColor: '#F59E0B08', borderWidth: 1, borderColor: '#F59E0B33', borderRadius: 10, padding: 14, marginBottom: 20 },
  alertTitle: { color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  alertMsg: { color: '#AAA', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  alertChannels: { flexDirection: 'row', gap: 6 },
  channelPill: { backgroundColor: '#F59E0B22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  channelText: { color: '#F59E0B', fontSize: 9, fontWeight: '700' },
  nextBtn: { backgroundColor: '#3B82F6', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12, marginTop: 8 },
  nextBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  nextBtnArrow: { color: '#FFF', fontSize: 18 },
});
