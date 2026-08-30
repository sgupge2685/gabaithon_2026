import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RoleSelectScreen from "../screens/RoleSelectScreen";
import HomeScreen from "../screens/HomeScreen";
import NewsScreen from "../screens/NewsScreen";
import FamilyHomeScreen from "../screens/FamilyHomeScreen";
import CreateNewsScreen from "../screens/CreateNewsScreen";

export type RootStackParamList = {
  RoleSelect: undefined;
  Home: undefined;
  News: undefined;
  FamilyHome: undefined;
  CreateNews: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RoleSelect"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        
        {/* 高齢者側の画面 */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="News" component={NewsScreen} />
        
        {/* 家族側の画面 */}
        <Stack.Screen name="FamilyHome" component={FamilyHomeScreen} />
        <Stack.Screen name="CreateNews" component={CreateNewsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}