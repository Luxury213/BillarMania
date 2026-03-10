import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../config/firebase';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert('Error', 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🎱 BillarMania</Text>
      <Text style={styles.subtitulo}>Iniciar sesión</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={loading}>
        <Text style={styles.botonTexto}>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 36, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#16213e', color: 'white', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#0f3460' },
  boton: { backgroundColor: '#e94560', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  botonTexto: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#888', textAlign: 'center', fontSize: 14 }
});