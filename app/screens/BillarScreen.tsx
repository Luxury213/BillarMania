import { View, StyleSheet } from 'react-native';
import BillarGame from '../../game/BillarGame';

export default function BillarScreen() {
  return (
    <View style={styles.container}>
      <BillarGame />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
});
