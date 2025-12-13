import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ADMIN_DATA_ENDPOINTS } from './src/config/adminData';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { NavigationTheme } from './src/theme/navigationTheme';
import { Colors } from './src/theme/colors';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchSequentially = async () => {
      try {
        // 1) manifest.json を取得
        console.log('Fetching manifest.json:', ADMIN_DATA_ENDPOINTS.manifest);
        const manifestRes = await fetch(ADMIN_DATA_ENDPOINTS.manifest);
        if (!manifestRes.ok) {
          throw new Error(`manifest ${manifestRes.status} ${manifestRes.statusText}`);
        }
        const manifestJson = await manifestRes.json();
        console.log('manifest.json content:', manifestJson);

        // 2) symptom_master.json を取得
        console.log('Fetching symptom_master.json:', ADMIN_DATA_ENDPOINTS.symptomMaster);
        const symptomRes = await fetch(ADMIN_DATA_ENDPOINTS.symptomMaster);
        if (!symptomRes.ok) {
          throw new Error(`symptom_master ${symptomRes.status} ${symptomRes.statusText}`);
        }
        const symptomJson = await symptomRes.json();
        console.log('symptom_master.json content:', symptomJson);

        setIsCompleted(true);
      } catch (err) {
        console.error('Fetch error:', err);
        setIsCompleted(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSequentially();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <NavigationContainer theme={NavigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBlueWash,
  },
});


