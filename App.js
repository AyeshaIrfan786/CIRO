import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import InputScreen from './screens/InputScreen.js';
import DetectionScreen from './screens/DetectionScreen.js';
import SimulationScreen from './screens/SimulationScreen.js';
import OutcomeScreen from './screens/OutcomeScreen.js';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Input"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0A0A0F' },
        }}
      >
        <Stack.Screen name="Input"      component={InputScreen}      />
        <Stack.Screen name="Detection"  component={DetectionScreen}  />
        <Stack.Screen name="Simulation" component={SimulationScreen} />
        <Stack.Screen name="Outcome"    component={OutcomeScreen}    />
      </Stack.Navigator>
    </NavigationContainer>
  );
}