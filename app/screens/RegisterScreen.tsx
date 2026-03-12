import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';
import { colors, components, neonBox, neonText, spacing, typography } from '../../config/theme';

const { width, height } = Dimensions.get('window');

function CRTOverlay() {
  const lines = Math.floor(height / 4);
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array(lines).fill(0).map((_, i) => (
        <View key={i} style={{
          position: 'absolute', top: i * 4,
          left: 0, right: 0, height: 1,
          backgroundColor: '#000', opacity: 0.08,
        }} />
      ))}
    </View>
  );
}

function PixelBall({ number, color, size = 36 }: { number: number, color: string, size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
      ...neonBox(color),
    }}>
      <View style={{
        width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: '900', color: '#111' }}>
          {number}
        </Text>
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const ball1Y    = useRef(new Animated.Value(0)).current;
  const ball2Y    = useRef(new Animated.Value(0)).current;
  const ball3Y    = useRef(new Animated.Value(0)).current;
  const scanAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
    ])).start();

    const floatBall = (anim: Animated.Value, duration: number, distance: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: -distance, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: distance,  duration, useNativeDriver: true }),
      ]));

    floatBall(ball1Y, 2200, 12).start();
    floatBall(ball2Y, 1900, 8).start();
    floatBall(ball3Y, 2800, 10).start();

    Animated.loop(
      Animated.timing(scanAnim, { toValue: height, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      Alert.alert('[ ERROR ]', 'Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('[ ERROR ]', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre, email,
        monedas: 100, ronda: 1,
        inventario: [], creadoEn: new Date()
      });
    } catch (error: any) {
      Alert.alert('[ ERROR ]', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgGrid} />
      <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />
      <CRTOverlay />

      {/* Bolas decorativas */}
      <Animated.View style={[styles.floatBall, { top: '8%', left: '6%', transform: [{ translateY: ball1Y }] }]}>
        <PixelBall number={7} color={colors.balls[7]} />
      </Animated.View>
      <Animated.View style={[styles.floatBall, { top: '14%', right: '8%', transform: [{ translateY: ball2Y }] }]}>
        <PixelBall number={2} color={colors.balls[2]} size={44} />
      </Animated.View>
      <Animated.View style={[styles.floatBall, { top: '6%', right: '30%', transform: [{ translateY: ball3Y }] }]}>
        <PixelBall number={5} color={colors.balls[5]} size={28} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={styles.header}>
            <Animated.Text style={[styles.emoji, { opacity: glowAnim }]}>🎱</Animated.Text>
            <View style={styles.titleRow}>
              <Text style={styles.titleBlue}>BILLAR</Text>
              <Text style={styles.titleRed}>MANIA</Text>
            </View>
            <View style={styles.pixelRow}>
              {Array(18).fill(0).map((_, i) => (
                <View key={i} style={[styles.pixelDot, { opacity: i % 2 === 0 ? 1 : 0.2 }]} />
              ))}
            </View>
            <Text style={styles.prompt}>{'> NUEVA PARTIDA_'}</Text>
          </View>

          {/* Formulario */}
          <View style={styles.card}>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{'// JUGADOR'}</Text>
              <TextInput
                style={styles.input}
                placeholder="tu nombre aquí"
                placeholderTextColor={colors.textDim}
                value={nombre}
                onChangeText={setNombre}
              />
              <View style={styles.inputUnderline} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{'// CORREO'}</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@correo.com"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.inputUnderline} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{'// CONTRASEÑA'}</Text>
              <TextInput
                style={styles.input}
                placeholder="mínimo 6 caracteres"
                placeholderTextColor={colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.inputUnderline} />
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? '[ CREANDO... ]' : '[ CREAR CUENTA ]'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerStar}>✦</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>{'> YA TENGO CUENTA'}</Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.version}>{'© BILLARMANIA v1.0 — 2026'}</Text>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bg },
  bgGrid:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
  scanLine:         { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary, opacity: 0.06, top: 0 },
  floatBall:        { position: 'absolute', zIndex: 0 },
  scroll:           { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingTop: 80 },
  header: { alignItems: 'center', marginBottom: spacing.xl, width: '100%' },
  emoji:            { fontSize: 56, marginBottom: spacing.sm },
 titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' },
  titleBlue:        { ...typography.gameTitle, color: colors.primary, ...neonText(colors.primary) },
  titleRed:         { ...typography.gameTitle, color: colors.accent, ...neonText(colors.accent) },
  pixelRow:         { flexDirection: 'row', marginVertical: spacing.md, gap: 4 },
  pixelDot:         { width: 5, height: 5, backgroundColor: colors.primary },
  prompt:           { ...typography.label, color: colors.purple, opacity: 0.9 },
  card:             { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.dark, borderRadius: 2, padding: spacing.lg, ...neonBox(colors.dark) },
  fieldGroup:       { marginBottom: spacing.lg },
  fieldLabel:       { ...typography.label, color: colors.accent, marginBottom: spacing.sm },
  input:            { ...components.input, color: colors.primary },
  inputUnderline:   { height: 2, backgroundColor: colors.dark, marginTop: 4 },
  btnPrimary:       { ...components.buttonPrimary, marginTop: spacing.md },
  btnPrimaryText:   { ...typography.button, color: colors.accent, ...neonText(colors.accent) },
  divider:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine:      { flex: 1, height: 1, backgroundColor: colors.dark },
  dividerStar:      { ...typography.small, color: colors.textMuted },
  btnSecondary:     { ...components.buttonSecondary, marginTop: 0 },
  btnSecondaryText: { ...typography.button, color: colors.primary },
  version:          { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});