import { signOut } from 'firebase/auth';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../config/firebase';

export default function HomeScreen() {
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🎱 BillarMania</Text>
      <Text style={styles.bienvenida}>¡Bienvenido!</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <TouchableOpacity style={styles.boton} onPress={handleLogout}>
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { fontSize: 36, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  bienvenida: { fontSize: 24, color: 'white', marginBottom: 8 },
  email: { fontSize: 16, color: '#888', marginBottom: 48 },
  boton: { backgroundColor: '#e94560', borderRadius: 10, padding: 16, alignItems: 'center', width: '100%' },
  botonTexto: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});