import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebase';

export default function RegisterScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre,
        email,
        monedas: 100,
        ronda: 1,
        inventario: [],
        creadoEn: new Date()
      });
      Alert.alert('¡Bienvenido!', `Cuenta creada exitosamente, ${nombre}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🎱 BillarMania</Text>
      <Text style={styles.subtitulo}>Crear cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#888"
        value={nombre}
        onChangeText={setNombre}
      />
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

      <TouchableOpacity style={styles.boton} onPress={handleRegister} disabled={loading}>
        <Text style={styles.botonTexto}>{loading ? 'Creando cuenta...' : 'Registrarse'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
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