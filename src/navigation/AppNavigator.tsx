import React, {
  useEffect,
} from "react";

import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

import { setupNotificationResponseListener } from "../services/notificationService";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import * as Linking from "expo-linking";

import RoleSelectScreen from "../screens/RoleSelectScreen";
import LoginScreen from "../screens/Loginscreen";

import HomeScreen from "../screens/HomeScreen";
import NewsScreen from "../screens/NewsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import FamilyHomeScreen from "../screens/FamilyHomeScreen";
import CreateNewsScreen from "../screens/CreateNewsScreen";
import AddFamilyScreen from "../screens/AddFamilyScreen";

export type RootStackParamList = {
  RoleSelect: undefined;

  Login: {
    role: "family" | "elderly";
  };

  // 高齢者側
  Home: undefined;
  News: undefined;
  History: undefined;
  AddFamily: {
    token?: string;
  };

  // 家族側
  FamilyHome: undefined;
  CreateNews: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

// ============================================================
// Deep Link設定
// ============================================================

const linking = {
  prefixes: [
    Linking.createURL("/"),
    "magonews://",
  ],

  config: {
    screens: {
      RoleSelect: "",

      Login: "login",

      // 高齢者側
      Home: "home",
      News: "news",
      History: "history",

      // 家族招待リンク
      // magonews://invite/xxxxx
      // ↓
      // AddFamily
      AddFamily: {
        path: "invite/:token",
        parse: {
          token: (
            token: string
          ) => token,
        },
      },

      // 家族側
      FamilyHome: "family",
      CreateNews: "create-news",
    },
  },

  // --------------------------------------------------
  // アプリ起動中にDeep Linkを受け取った場合
  // --------------------------------------------------

  subscribe(
    listener: (url: string) => void
  ) {
    const onReceiveURL = ({
      url,
    }: {
      url: string;
    }) => {
      console.log(
        "Deep Link受信:",
        url
      );

      listener(url);
    };

    const subscription =
      Linking.addEventListener(
        "url",
        onReceiveURL
      );

    return () => {
      subscription.remove();
    };
  },
};

// ============================================================
// AppNavigator
// ============================================================

export default function AppNavigator() {
  // --------------------------------------------------
  // アプリ起動時のDeep Linkを確認
  // --------------------------------------------------

  useEffect(() => {
    Linking.getInitialURL().then(
      (url) => {
        if (url) {
          console.log(
            "初期Deep Link:",
            url
          );
        }
      }
    );

    // 通知バナーをタップした時の画面遷移リスナー
    const unsubscribeNotification = setupNotificationResponseListener(
      (screen, params) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(screen as any, params);
        }
      }
    );

    return () => {
      unsubscribeNotification();
    };
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
    >
      <Stack.Navigator
        initialRouteName="RoleSelect"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* =========================
            共通
           ========================= */}

        <Stack.Screen
          name="RoleSelect"
          component={RoleSelectScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
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