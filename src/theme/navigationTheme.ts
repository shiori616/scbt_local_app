import { DefaultTheme, Theme } from '@react-navigation/native';
import { Colors } from './colors';

export const NavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.deepNeuroBlue,
    background: Colors.lightBlueWash,
    card: Colors.deepNeuroBlue, // ヘッダーカラーに反映
    text: Colors.deepInkBrown,
    border: Colors.grayBlue,
    notification: Colors.softBlueGradient,
  },
};


