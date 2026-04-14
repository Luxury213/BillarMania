import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebase'; // Ajusta la ruta real
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

export default function Index() {
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [enJuego, setEnJuego] = useState(false);
  const [enRegistro, setEnRegistro] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060910', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#ff006e" size="large" />
      </View>
    );
  }

  if (!usuario) {
    if (enRegistro) return <RegisterScreen onLogin={() => setEnRegistro(false)} />;
    return <LoginScreen onRegister={() => setEnRegistro(true)} />;
  }

  if (enJuego) return <GameScreen onSalir={() => setEnJuego(false)} />;
  return <HomeScreen onJugar={() => setEnJuego(true)} />;
}