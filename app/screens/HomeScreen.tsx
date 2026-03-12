import * as ScreenOrientation from 'expo-screen-orientation';
import { signOut } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import {
  Alert, Animated, Dimensions,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../config/firebase';
import { colors, neonBox, neonText, spacing, typography } from '../../config/theme';

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

export default function HomeScreen() {
  const user = auth.currentUser;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const ball1X    = useRef(new Animated.Value(0)).current;
  const ball1Y    = useRef(new Animated.Value(0)).current;
  const ball2X    = useRef(new Animated.Value(0)).current;
  const ball2Y    = useRef(new Animated.Value(0)).current;
  const ball3Y    = useRef(new Animated.Value(0)).current;
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const swirlAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Forzar horizontal
   setTimeout(() => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}, 500);

    Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();

    // Glow del título
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
    ])).start();

    // Bolas flotantes
    const float = (anim: Animated.Value, dur: number, dist: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: -dist, duration: dur, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  dist, duration: dur, useNativeDriver: true }),
      ]));

    float(ball1X, 3000, 8).start();
    float(ball1Y, 2000, 10).start();
    float(ball2X, 2500, 6).start();
    float(ball2Y, 3200, 12).start();
    float(ball3Y, 1800, 8).start();

    // Scanline
    Animated.loop(
      Animated.timing(scanAnim, { toValue: height, duration: 3000, useNativeDriver: true })
    ).start();

    // Swirl de fondo
    Animated.loop(
      Animated.timing(swirlAnim, { toValue: 1, duration: 8000, useNativeDriver: false })
    ).start();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      '[ CERRAR SESIÓN ]',
      '¿Seguro que quieres salir?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'SALIR', onPress: async () => { await signOut(auth); } }
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* Fondo swirl simulado */}
      <View style={styles.bgSwirl}>
        <Animated.View style={[styles.swirlCircle1, {
          opacity: swirlAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.15, 0.08] })
        }]} />
        <Animated.View style={[styles.swirlCircle2, {
          opacity: swirlAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.06, 0.12, 0.06] })
        }]} />
        <Animated.View style={[styles.swirlCircle3, {
          opacity: swirlAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.04, 0.1, 0.04] })
        }]} />
      </View>

      <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />
      <CRTOverlay />

      {/* Bolas decorativas */}
      <Animated.View style={[styles.floatBall, { top: '15%', left: '5%', transform: [{ translateX: ball1X }, { translateY: ball1Y }] }]}>
        <PixelBall number={1} color={colors.balls[1]} size={32} />
      </Animated.View>
      <Animated.View style={[styles.floatBall, { bottom: '20%', left: '8%', transform: [{ translateX: ball2X }, { translateY: ball2Y }] }]}>
        <PixelBall number={5} color={colors.balls[5]} size={28} />
      </Animated.View>
      <Animated.View style={[styles.floatBall, { top: '10%', right: '5%', transform: [{ translateY: ball3Y }] }]}>
        <PixelBall number={9} color={colors.balls[9]} size={30} />
      </Animated.View>
      <Animated.View style={[styles.floatBall, { bottom: '15%', right: '6%', transform: [{ translateY: ball1Y }] }]}>
        <PixelBall number={13} color={colors.balls[13]} size={26} />
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* Centro — Logo */}
        <View style={styles.center}>
          <Animated.Text style={[styles.emoji, { opacity: glowAnim }]}>🎱</Animated.Text>
          <View style={styles.titleRow}>
            <Text style={styles.titleBlue}>BILLAR</Text>
            <Text style={styles.titleRed}>MANIA</Text>
          </View>
          <View style={styles.pixelRow}>
            {Array(20).fill(0).map((_, i) => (
              <View key={i} style={[styles.pixelDot, { opacity: i % 2 === 0 ? 1 : 0.2 }]} />
            ))}
          </View>
        </View>

        {/* Botones abajo */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.btnLogoutText}>{'[ SALIR ]'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPlay} activeOpacity={0.7}>
            <Text style={styles.btnPlayText}>{'[ JUGAR ]'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSettings} activeOpacity={0.7}>
            <Text style={styles.btnSettingsText}>{'[ AJUSTES ]'}</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  bgSwirl:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  swirlCircle1:   { position: 'absolute', width: 600, height: 600, borderRadius: 300, backgroundColor: colors.primary },
  swirlCircle2:   { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: colors.purple },
  swirlCircle3:   { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.accent },
  scanLine:       { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary, opacity: 0.06, top: 0 },
  floatBall:      { position: 'absolute', zIndex: 0 },
  content:        { flex: 1, justifyContent: 'space-between', padding: spacing.lg },

  // Centro
  center:         { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emoji:          { fontSize: 40, marginBottom: 4 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  titleBlue:      { ...typography.gameTitle, fontSize: 44, color: colors.primary, ...neonText(colors.primary) },
  titleRed:       { ...typography.gameTitle, fontSize: 44, color: colors.accent, ...neonText(colors.accent) },
  pixelRow:       { flexDirection: 'row', marginTop: spacing.sm, gap: 4 },
  pixelDot:       { width: 5, height: 5, backgroundColor: colors.primary },

  // Botones
  buttonsRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.sm },
  btnPlay:        { borderWidth: 2, borderColor: colors.green, borderRadius: 2, paddingVertical: 14, paddingHorizontal: 32, ...neonBox(colors.green) },
  btnPlayText:    { ...typography.button, color: colors.green, ...neonText(colors.green) },
  btnLogout:      { borderWidth: 1, borderColor: colors.textMuted, borderRadius: 2, paddingVertical: 14, paddingHorizontal: 24 },
  btnLogoutText:  { ...typography.button, color: colors.textMuted },
  btnSettings:    { borderWidth: 1, borderColor: colors.primary, borderRadius: 2, paddingVertical: 14, paddingHorizontal: 24 },
  btnSettingsText:{ ...typography.button, color: colors.primary },
});