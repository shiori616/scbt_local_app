import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../theme/colors';

export default function LogListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log List Screen</Text>
      <View style={styles.fabContainer}>
        <Button
          title="新規ログ作成"
          color={Colors.deepNeuroBlue}
          onPress={() => navigation.navigate('LogEdit')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightBlueWash,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.deepInkBrown,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 32,
  },
});


