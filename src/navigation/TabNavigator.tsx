import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SeizureStackNavigator from './SeizureStackNavigator';
import ReportStackNavigator from './ReportStackNavigator';
import MyPageScreen from '../screens/MyPageScreen';
import { Colors } from '../theme/colors';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

export type TabParamList = {
  Guide: undefined;
  SeizureLog: undefined;
  Report: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.deepNeuroBlue,
        tabBarInactiveTintColor: Colors.grayBlue,
        tabBarStyle: {
          backgroundColor: Colors.pureWhite,
          borderTopColor: '#E5EAF2',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Guide"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ガイド',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="SeizureLog"
        component={SeizureStackNavigator}
        options={{
          tabBarLabel: '記録',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="flare" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportStackNavigator}
        options={{
          tabBarLabel: 'レポート',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{
          tabBarLabel: 'マイページ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}


