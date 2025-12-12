import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogListScreen from '../screens/LogListScreen';
import LogEditScreen from '../screens/LogEditScreen';

export type RootStackParamList = {
  LogList: undefined;
  LogEdit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="LogList">
      <Stack.Screen name="LogList" component={LogListScreen} options={{ title: 'Log List' }} />
      <Stack.Screen name="LogEdit" component={LogEditScreen} options={{ title: 'Log Edit' }} />
    </Stack.Navigator>
  );
}



