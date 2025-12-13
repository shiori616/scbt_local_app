import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogListScreen from '../screens/LogListScreen';
import LogEditScreen from '../screens/LogEditScreen';
import { Colors } from '../theme/colors';
import HomeScreen from '../screens/HomeScreen';

export type RootStackParamList = {
  Home: undefined;
  LogList: undefined;
  LogEdit: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.deepNeuroBlue },
        headerTintColor: Colors.pureWhite,
        headerTitleStyle: { color: Colors.pureWhite },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="LogList" component={LogListScreen} options={{ title: 'Log List' }} />
      <Stack.Screen name="LogEdit" component={LogEditScreen} options={{ title: 'Log Edit' }} />
    </Stack.Navigator>
  );
}



