import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LogCreateScreen from '../screens/LogCreateScreen';
import LogListScreen from '../screens/LogListScreen';
import LogEditScreen from '../screens/LogEditScreen';
import { Colors } from '../theme/colors';

export type SeizureStackParamList = {
  LogCreate: undefined;
  LogList: undefined;
  LogEdit: undefined;
};

const Stack = createNativeStackNavigator<SeizureStackParamList>();

export default function SeizureStackNavigator() {
  console.log('===== SeizureStackNavigator RENDER =====');
  return (
    <Stack.Navigator
      initialRouteName="LogCreate"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.deepNeuroBlue },
        headerTintColor: Colors.pureWhite,
        headerTitleStyle: { color: Colors.pureWhite },
      }}
    >
      <Stack.Screen
        name="LogCreate"
        component={LogCreateScreen}
        options={{ title: '記録' }}
      />
      <Stack.Screen name="LogList" component={LogListScreen} options={{ title: 'Log List' }} />
      <Stack.Screen name="LogEdit" component={LogEditScreen} options={{ title: 'Log Edit' }} />
    </Stack.Navigator>
  );
}


