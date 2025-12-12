import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});


