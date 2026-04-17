// app/index.tsx — FUENTE ÚNICA DE VERDAD
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebase';
import { usePowerups } from '../hooks/usePowerups';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ShopScreen from './screens/ShopScreen';

export default function Index() {
  // Auth
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [enRegistro, setEnRegistro] = useState(false);

  // Juego
  const [enJuego, setEnJuego] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentScore, setCurrentScore] = useState(0);

  // ✅ usePowerups vive SOLO aquí — fuente única de verdad
  const {
    inventory,
    coins,
    setCoins,
    buyPowerup,
    sellPowerup,
  } = usePowerups();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsub;
  }, []);

  // ─── HANDLERS ─────────────────────────────────────────────

  const handleStartGame = () => {
    setCoins(150);
    setCurrentRound(1);
    setCurrentScore(0);
    setEnJuego(true);
  };

  const handleExitGame = () => {
    setEnJuego(false);
    setShowShop(false);
  };

  // GameScreen llama esto cuando gana una ronda
  // coins aquí ya incluye las monedas ganadas durante la partida
  const handleRoundWin = (score: number, coinsEarned: number, round: number) => {
    setCoins(coinsEarned); // coinsEarned viene de shotDataRef, ya acumuladas
    setCurrentScore(score);
    setCurrentRound(round);
    setShowShop(true);
    setEnJuego(false);
  };

  // ShopScreen llama esto al presionar Continuar
  const handleShopClose = (result: { coins: number; selectedCue: string }) => {
    setCoins(result.coins);
    setShowShop(false);
    setEnJuego(true);
  };

  // ─── RENDER ───────────────────────────────────────────────

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

  if (showShop) {
    return (
      <ShopScreen
        coins={coins}
        round={currentRound}
        score={currentScore}
        inventory={inventory}            // ✅ viene del hook central
        onBuyPowerup={buyPowerup}        // ✅ función del hook central
        onSellPowerup={sellPowerup}      // ✅ función del hook central
        onClose={handleShopClose}
      />
    );
  }

  if (enJuego) {
    return (
      <GameScreen
        onSalir={handleExitGame}
        onRoundWin={handleRoundWin}
        inventory={inventory}   // ✅ siempre actualizado desde el hook central
        initialCoins={coins}    // ✅ le pasamos las monedas actuales
      />
    );
  }

  return <HomeScreen onJugar={handleStartGame} />;
}