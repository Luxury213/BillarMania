import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebase';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';

export default function Index() {
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [enJuego, setEnJuego] = useState(false);

  useEffect(() => {
    const unsuscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsuscribe;
  }, []);

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060910', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#ff006e" size="large" />
      </View>
    );
  }

  if (!usuario) return <LoginScreen />;
  if (enJuego) return <GameScreen />;
  return <HomeScreen onJugar={() => setEnJuego(true)} />;
}