// hooks/useAudio.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

export const useAudio = () => {
  const backgroundMusic = useRef<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar preferencia guardada al iniciar
  useEffect(() => {
    const loadMutePreference = async () => {
      try {
        const muted = await AsyncStorage.getItem('musicMuted');
        setIsMuted(muted === 'true');
      } catch (error) {
        console.log('Error loading mute preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMutePreference();
  }, []);

  // Configurar modo de audio
  const setupAudio = useCallback(async () => {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  // Reproducir música de fondo
  const playBackgroundMusic = useCallback(async (soundFile: any, volume: number = 0.35) => {
    try {
      await setupAudio();
      
      if (backgroundMusic.current) {
        await backgroundMusic.current.stopAsync();
        await backgroundMusic.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          isLooping: true, 
          volume: isMuted ? 0 : volume,
          shouldPlay: !isMuted 
        }
      );
      
      backgroundMusic.current = sound;
      console.log('🎵 Música de fondo iniciada');
    } catch (error) {
      console.log('Error playing background music:', error);
    }
  }, [isMuted, setupAudio]);

  // Reproducir efecto de sonido
  const playEffect = useCallback(async (soundFile: any, volume: number = 0.6) => {
    if (isMuted) {
      console.log('🔇 Sonido muteado');
      return;
    }
    
    try {
      const { sound } = await Audio.Sound.createAsync(soundFile, { volume });
      await sound.playAsync();
      console.log('🔊 Efecto reproducido');
      
      // Liberar memoria automáticamente después de reproducir
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing effect:', error);
    }
  }, [isMuted]);

  // Pausar música
  const pauseMusic = useCallback(async () => {
    if (backgroundMusic.current) {
      await backgroundMusic.current.pauseAsync();
    }
  }, []);

  // Reanudar música
  const resumeMusic = useCallback(async () => {
    if (backgroundMusic.current && !isMuted) {
      await backgroundMusic.current.playAsync();
    }
  }, [isMuted]);

  // Silenciar/Activar todo el audio
  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    // Guardar preferencia
    await AsyncStorage.setItem('musicMuted', String(newMuted));
    
    // Aplicar a la música de fondo
    if (backgroundMusic.current) {
      if (newMuted) {
        await backgroundMusic.current.pauseAsync();
        console.log('🔇 Audio silenciado');
      } else {
        await backgroundMusic.current.playAsync();
        console.log('🔊 Audio activado');
      }
    }
  }, [isMuted]);

  // Detener y limpiar música
  const stopBackgroundMusic = useCallback(async () => {
    if (backgroundMusic.current) {
      await backgroundMusic.current.stopAsync();
      await backgroundMusic.current.unloadAsync();
      backgroundMusic.current = null;
    }
  }, []);

  return {
    playBackgroundMusic,
    stopBackgroundMusic,
    playEffect,
    toggleMute,
    pauseMusic,
    resumeMusic,
    isMuted,
    isLoading,
  };
};