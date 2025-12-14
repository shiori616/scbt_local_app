import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';

export default function ReportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>レポート</Text>
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
  text: {
    color: Colors.deepInkBrown,
    fontSize: 18,
    fontWeight: '600',
  },
});


