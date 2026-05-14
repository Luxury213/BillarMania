// components/AudioTest.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudio } from '../hooks/useAudio';

export const AudioTest = () => {
  const { playEffect, playBackgroundMusic, toggleMute, isMuted, isLoading } = useAudio();
  const [lastSound, setLastSound] = useState('');

  const testSound = async (soundFile: any, name: string) => {
    setLastSound(`Probando: ${name}...`);
    try {
      await playEffect(soundFile, 0.8);
      setLastSound(`✅ ${name} reproducido`);
      setTimeout(() => setLastSound(''), 2000);
    } catch (error) {
      setLastSound(`❌ Error: ${name}`);
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Cargando audio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 PRUEBA DE SONIDOS</Text>
      <Text style={styles.status}>{lastSound}</Text>
      <Text style={styles.muteStatus}>Estado: {isMuted ? '🔇 SILENCIADO' : '🔊 ACTIVADO'}</Text>
      
      <TouchableOpacity style={styles.muteBtn} onPress={toggleMute}>
        <Text style={styles.btnText}>{isMuted ? '🔊 ACTIVAR SONIDO' : '🔇 SILENCIAR'}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.btn} onPress={() => testSound(require('../assets/sounds/shot.mp3'), 'Disparo')}>
        <Text style={styles.btnText}>🎯 1. DISPARO</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => testSound(require('../assets/sounds/ball drop.mp3'), 'Bola')}>
        <Text style={styles.btnText}>⚽ 2. BOLA CAYENDO</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => testSound(require('../assets/sounds/round success.mp3'), 'Ronda')}>
        <Text style={styles.btnText}>🏆 3. RONDA PASADA</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={() => testSound(require('../assets/sounds/click UI.mp3'), 'Click UI')}>
        <Text style={styles.btnText}>🖱️ 4. CLICK UI</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.bgBtn]} onPress={() => playBackgroundMusic(require('../assets/sounds/Background.mp3'), 0.5)}>
        <Text style={styles.btnText}>🎵 5. MÚSICA DE FONDO</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 20,
    padding: 20,
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#ffbe0b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffbe0b',
    textAlign: 'center',
    marginBottom: 15,
  },
  status: {
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 12,
  },
  muteStatus: {
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  muteBtn: {
    backgroundColor: '#ff006e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#3a86ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  bgBtn: {
    backgroundColor: '#00ff88',
    marginTop: 10,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
});