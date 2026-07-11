import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.text}>This screen is ready for the next milestone.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { padding: 22 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 14 },
  text: { color: '#6B7280', fontSize: 16, marginTop: 10 },
});
