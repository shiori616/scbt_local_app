import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../theme/colors';

const LOGO_SOURCE = require('../../assets/logo.png');

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={LOGO_SOURCE} style={styles.logo} resizeMode="contain" />
      </View>

      <Text style={styles.title}>脳腫瘍支持療法記録</Text>

      <View style={styles.dots}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => navigation.navigate('LogList')}
        >
          <Text style={styles.primaryText}>記録</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => navigation.navigate('LogList')}
        >
          <Text style={styles.secondaryText}>レポート</Text>
        </Pressable>
      </View>

      <Text style={styles.copy}>© 2025 SCBT. All rights reserved.</Text>
    </View>
  );
}

const BUTTON_RADIUS = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightBlueWash,
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: '70%',
    maxWidth: 360,
    aspectRatio: 1,
    marginBottom: 24,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.deepNeuroBlue,
    marginBottom: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.softBlueGradient,
    opacity: 0.5,
  },
  dotActive: {
    opacity: 1,
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  primaryBtn: {
    width: 220,
    paddingVertical: 16,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: Colors.deepNeuroBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: Colors.pureWhite,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryBtn: {
    width: 220,
    paddingVertical: 16,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: Colors.softBlueGradient,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Colors.pureWhite,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  copy: {
    position: 'absolute',
    bottom: 24,
    color: Colors.grayBlue,
  },
});


