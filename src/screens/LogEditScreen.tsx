import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';

export default function LogEditScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Edit Screen</Text>
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
});


