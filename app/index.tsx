import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebase';
import { colors } from '../config/theme';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import BillarScreen from './screens/BillarScreen'; // Cambio 1

const Stack = createNativeStackNavigator();

export default function Index() {
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const [fontsLoaded] = useFonts({
    VT323: VT323_400Regular,
    m6x11: require('../assets/fonts/m6x11plus.ttf'),
  });

  useEffect(() => {
    const unsuscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsuscribe;
  }, []);

  if (!fontsLoaded || cargando) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {usuario ? (
        <>  {/*Cambio 2 */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Billar" component={BillarScreen} /> {/* Cambio 3 */}
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
