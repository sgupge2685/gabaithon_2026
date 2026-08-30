import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";

import { COLORS } from "../constants/colors";

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <View style={styles.container}>

        <Text style={styles.logo}>
          MAGONEWS
        </Text>

        <Text style={styles.greeting}>
          こんにちは！
        </Text>

        <Text style={styles.message}>
          今日の家族ニュースが届いています
        </Text>

        <TouchableOpacity
          style={styles.newsButton}
          onPress={() => navigation.navigate("News")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="今日の新聞を見る"
        >
          <Text style={styles.newsButtonText}>
            📰今日のニュースを見る
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: 24,
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  message: {
    fontSize: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 40,
  },

  newsButton: {
    width: "90%",
    minHeight: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  newsButtonText: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.white,
  },
});