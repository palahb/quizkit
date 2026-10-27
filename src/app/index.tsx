import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text>Quizkit</Text>
      {/* Temporary: Phase 0 math spike. Removed after the gate decision. */}
      <Link href="/spike" style={{ fontSize: 18, color: '#208AEF' }}>Open math spike</Link>
    </View>
  );
}
