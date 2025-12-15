import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReportScreen from '../screens/ReportScreen';
import { Colors } from '../theme/colors';

export type ReportStackParamList = {
  ReportMain: undefined;
};

const Stack = createNativeStackNavigator<ReportStackParamList>();

export default function ReportStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ReportMain"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.deepNeuroBlue },
        headerTintColor: Colors.pureWhite,
        headerTitleStyle: { color: Colors.pureWhite },
      }}
    >
      <Stack.Screen name="ReportMain" component={ReportScreen} options={{ title: 'レポート' }} />
    </Stack.Navigator>
  );
}


