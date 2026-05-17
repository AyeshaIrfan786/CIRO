import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Animated, StatusBar, SafeAreaView } from 'react-native';

const SCENARIOS = [
  {
    id: 0,
    name: 'G-10 Flash Flood',
    tag: 'FLOOD',
    tagColor: '#3B82F6',
    desc: 'Urban flooding + water main conflict',
    icon: '🌊',
    locationKey: 'g10',
    scenario: 'flooding',
    defaultText: 'G-10 mein pani bhar gaya hai, gaariyan phans gayi hain! Koi help karo',
  },
  {
    id: 1,
    name: 'Faizabad Accident',
    tag: 'ACCIDENT',
    tagColor: '#F59E0B',
    desc: 'Major pile-up in dense fog',
    icon: '🚗',
    locationKey: 'faizabad',
    scenario: 'accident',
    defaultText: 'Bara accident hua hai Faizabad interchange pe, 3 gaariyan takra gayi',
  },
  {
    id: 2,
    name: 'API Failure Test',
    tag: 'STRESS',
    tagColor: '#EF4444',
    desc: 'Missing data robustness test',
    icon: '⚠️',
    locationKey: 'default',
    scenario: 'flooding',
    defaultText: 'Flooding near Blue Area, office buildings evacuating',
  },
];

export default function InputScreen({ navigation }) {
  const [selected, setSelected] = useState(0);
  const [userText, setUserText] = useState(SCENARIOS[0].defaultText);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setUserText(SCENARIOS[selected].defaultText);
  }, [selected]);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleAnalyze = () => {
    setLoading(true);
    startPulse();
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Detection', {
        scenario: SCENARIOS[selected],
        userText,
      });
    }, 300);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <View style={s.logoDot} />
              <Text style={s.logoText}>CIRO</Text>
              <View style={s.liveTag}><Text style={s.liveText}>LIVE</Text></View>
            </View>
            <Text style={s.headerSub}>Crisis Intelligence & Response Orchestrator</Text>
          </View>

          {/* Signal section */}
          <Text style={s.sectionLabel}>SELECT SCENARIO</Text>
          {SCENARIOS.map((sc) => (
            <TouchableOpacity
              key={sc.id}
              style={[s.scenarioCard, selected === sc.id && s.scenarioCardActive]}
              onPress={() => setSelected(sc.id)}
              activeOpacity={0.8}
            >
              <View style={s.scenarioLeft}>
                <Text style={s.scenarioIcon}>{sc.icon}</Text>
                <View>
                  <View style={s.scenarioTitleRow}>
                    <Text style={[s.scenarioName, selected === sc.id && s.scenarioNameActive]}>{sc.name}</Text>
                    <View style={[s.tagPill, { backgroundColor: sc.tagColor + '22', borderColor: sc.tagColor + '55' }]}>
                      <Text style={[s.tagText, { color: sc.tagColor }]}>{sc.tag}</Text>
                    </View>
                  </View>
                  <Text style={s.scenarioDesc}>{sc.desc}</Text>
                </View>
              </View>
              {selected === sc.id && <View style={s.selectedDot} />}
            </TouchableOpacity>
          ))}

          {/* Field report */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>FIELD REPORT / SOCIAL SIGNAL</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              value={userText}
              onChangeText={setUserText}
              multiline
              numberOfLines={3}
              placeholderTextColor="#444"
              placeholder="Paste social media post or field report..."
            />
            <View style={s.inputFooter}>
              <Text style={s.inputHint}>Urdu / Roman Urdu / English supported</Text>
              <Text style={s.charCount}>{userText.length}</Text>
            </View>
          </View>

          {/* Signals preview */}
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>ACTIVE SIGNAL SOURCES</Text>
          <View style={s.signalsRow}>
            {['SATELLITE', 'WEATHER', 'TRAFFIC', 'SOCIAL'].map((sig) => (
              <View key={sig} style={s.signalPill}>
                <View style={s.signalDot} />
                <Text style={s.signalText}>{sig}</Text>
              </View>
            ))}
          </View>

          {/* Analyze button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 32 }}>
            <TouchableOpacity style={s.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.85} disabled={loading}>
              <View style={s.analyzeBtnInner}>
                {loading ? (
                  <Text style={s.analyzeBtnText}>INITIALIZING PIPELINE...</Text>
                ) : (
                  <>
                    <Text style={s.analyzeBtnText}>ANALYZE CRISIS</Text>
                    <Text style={s.analyzeBtnArrow}>→</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.footer}>4 agents · Gemini 1.5 Flash · Simulated execution</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 32, marginTop: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  logoText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 6 },
  liveTag: { backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF444455', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  liveText: { color: '#EF4444', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerSub: { color: '#555', fontSize: 12, letterSpacing: 1 },
  sectionLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  scenarioCard: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scenarioCardActive: { borderColor: '#3B82F6', backgroundColor: '#3B82F608' },
  scenarioLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scenarioIcon: { fontSize: 24 },
  scenarioTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  scenarioName: { color: '#666', fontSize: 14, fontWeight: '600' },
  scenarioNameActive: { color: '#FFF' },
  scenarioDesc: { color: '#444', fontSize: 12 },
  tagPill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  tagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  inputWrap: { backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 12, padding: 14 },
  input: { color: '#CCC', fontSize: 14, lineHeight: 22, minHeight: 72 },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  inputHint: { color: '#333', fontSize: 11 },
  charCount: { color: '#333', fontSize: 11 },
  signalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  signalPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111116', borderWidth: 1, borderColor: '#1E1E2A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  signalText: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  analyzeBtn: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#3B82F6' },
  analyzeBtnInner: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12 },
  analyzeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  analyzeBtnArrow: { color: '#FFF', fontSize: 18, fontWeight: '300' },
  footer: { color: '#2A2A35', fontSize: 11, textAlign: 'center', marginTop: 20, letterSpacing: 1 },
});