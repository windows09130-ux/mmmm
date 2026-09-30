import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  useEffect(() => {
    // کدها و هوک‌های مورد نیاز
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>صفحه Explore</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
  },
});
