import * as ScreenOrientation from 'expo-screen-orientation';
import { signOut } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import {
  Alert, Animated, Dimensions, Easing,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../../config/firebase';
import { colors, spacing } from '../../config/theme';

const { width, height } = Dimensions.get('window');

const BTN_H = 58;
const SHADOW_H = 7;
const BTN_W = 200;

function CRTOverlay() {
  const lines = Math.floor(height / 3);
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {Array(lines).fill(0).map((_, i) => (
        <View key={i} style={{
          position: 'absolute', top: i * 3,
          left: 0, right: 0, height: 1,
          backgroundColor: '#000', opacity: 0.06,
        }} />
      ))}
    </View>
  );
}

export default function HomeScreen({ onJugar }: { onJugar: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const btn1Float = useRef(new Animated.Value(0)).current;
  const btn2Float = useRef(new Animated.Value(0)).current;
  const btn3Float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, 500);

    const subscription = ScreenOrientation.addOrientationChangeListener(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    });

    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    const floatBtn = (anim: Animated.Value, duration: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();

    floatBtn(btn1Float, 1800);
    floatBtn(btn2Float, 2200);
    floatBtn(btn3Float, 1600);

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'CERRAR SESIÓN',
      '¿Seguro que quieres salir?',
      [
        { text: 'CANCELAR', style: 'cancel' },
        { text: 'SALIR', onPress: async () => { await signOut(auth); } }
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* ── FONDO MINIMALISTA ── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#060910' }} />

        {/* Línea arriba */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, backgroundColor: colors.primary, opacity: 0.4,
        }} />

        {/* Línea antes de botones */}
        <View style={{
          position: 'absolute', bottom: BTN_H + SHADOW_H, left: 0, right: 0,
          height: 1, backgroundColor: colors.primary, opacity: 0.15,
        }} />

        {/* Glow central sutil detrás del título */}
        <View style={{
          position: 'absolute',
          width: 500, height: 300,
          borderRadius: 250,
          backgroundColor: colors.purple,
          opacity: 0.07,
          top: '15%',
          alignSelf: 'center',
        }} />
      </View>

      <CRTOverlay />

      {/* ── CONTENIDO ── */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* ── TÍTULO CENTRADO ── */}
        <View style={styles.logoContainer}>
          <Text style={styles.titleLine1}>BILLAR</Text>
          <Text style={styles.titleLine2}>MANIA</Text>
        </View>

        {/* ── BOTONES FLOTANTES ── */}
        <View style={styles.buttonsRow}>

          <Animated.View style={{ transform: [{ translateY: btn1Float }] }}>
            <TouchableOpacity activeOpacity={0.8} onPress={onJugar}>
  <View style={[styles.btnInner, { backgroundColor: colors.primary }]}>
    <Text style={styles.btnText}>JUGAR</Text>
  </View>
  <View style={[styles.btnShadow, { backgroundColor: '#1a5fb4' }]} />
</TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: btn2Float }] }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => {}}>
              <View style={[styles.btnInner, { backgroundColor: colors.gold, width: 220 }]}>
                <Text style={[styles.btnText, { color: '#1a1a1a' }]}>OPCIONES</Text>
              </View>
              <View style={[styles.btnShadow, { backgroundColor: '#b8860b', width: 220 }]} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: btn3Float }] }}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleLogout}>
              <View style={[styles.btnInner, { backgroundColor: colors.accent, width: 160 }]}>
                <Text style={styles.btnText}>SALIR</Text>
              </View>
              <View style={[styles.btnShadow, { backgroundColor: '#990040', width: 160 }]} />
            </TouchableOpacity>
          </Animated.View>

        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060910',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleLine1: {
    fontFamily: 'm6x11',
    fontSize: 96,
    color: colors.primary,
    letterSpacing: 16,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    lineHeight: 104,
  },
  titleLine2: {
    fontFamily: 'm6x11',
    fontSize: 96,
    color: colors.accent,
    letterSpacing: 16,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    lineHeight: 104,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-end',
    paddingBottom: spacing.md,
  },
  btnInner: {
    width: BTN_W,
    height: BTN_H,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightColor: 'rgba(0,0,0,0.2)',
  },
  btnShadow: {
    width: BTN_W,
    height: SHADOW_H,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  btnText: {
    fontFamily: 'm6x11',
    fontSize: 22,
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
});