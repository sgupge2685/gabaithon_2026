import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RoleSelectScreen from "../screens/RoleSelectScreen";
import HomeScreen from "../screens/HomeScreen";
import NewsScreen from "../screens/NewsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import FamilyHomeScreen from "../screens/FamilyHomeScreen";
import CreateNewsScreen from "../screens/CreateNewsScreen";
import AddFamilyScreen from "../screens/AddFamilyScreen";

export type RootStackParamList = {
  RoleSelect: undefined;

  // 高齢者側
  Home: undefined;
  News: undefined;
  History: undefined;
  AddFamily: undefined;

  // 家族側
  FamilyHome: undefined;
  CreateNews: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RoleSelect"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* 共通 */}
        <Stack.Screen
          name="RoleSelect"
          component={RoleSelectScreen}
        />

        {/* =========================
            高齢者側
           ========================= */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />

        <Stack.Screen
          name="News"
          component={NewsScreen}
        />

        <Stack.Screen
          name="History"
          component={HistoryScreen}
        />

        <Stack.Screen
          name="AddFamily"
          component={AddFamilyScreen}
        />

        {/* =========================
            家族側
           ========================= */}
        <Stack.Screen
          name="FamilyHome"
          component={FamilyHomeScreen}
        />

        <Stack.Screen
          name="CreateNews"
          component={CreateNewsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}