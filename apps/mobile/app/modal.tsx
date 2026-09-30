import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About KS1J</Text>
      <Text style={styles.body}>
        One app for Jamaat services, welfare, Khums and learning. Built for the Jamaat hackathon.
      </Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, marginTop: 12, textAlign: 'center' },
});
