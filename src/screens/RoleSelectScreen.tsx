import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

import { COLORS } from "../constants/colors";

export default function RoleSelectScreen({
  navigation,
}: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>
          MAGONEWS
        </Text>

        <Text style={styles.message}>
          どなたがご利用になりますか？
        </Text>

        {/* ==================================================
            役割選択ボタン
           ================================================== */}

        <View style={styles.buttonContainer}>

          {/* ================================================
              高齢者
             ================================================ */}

          <TouchableOpacity
            style={[
              styles.squareButton,
              styles.elderlyButton,
            ]}
            onPress={() =>
              navigation.navigate(
                "Login",
                {
                  role: "elderly",
                }
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              👵👴
              {"\n"}
              おじいちゃん
              {"\n"}
              おばあちゃん
            </Text>
          </TouchableOpacity>

          {/* ================================================
              家族
             ================================================ */}

          <TouchableOpacity
            style={[
              styles.squareButton,
              styles.familyButton,
            ]}
            onPress={() =>
              navigation.navigate(
                "Login",
                {
                  role: "family",
                }
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              👨‍👩‍👧
              {"\n"}
              ご家族の方
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },

  message: {
    fontSize: 20,
    color:
      COLORS.textSecondary,
    marginBottom: 48,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    width: "100%",
  },

  squareButton: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    padding: 10,
  },

  elderlyButton: {
    backgroundColor:
      COLORS.warning,
    borderWidth: 2,
    borderColor:
      COLORS.warningBorder,
  },

  familyButton: {
    backgroundColor: "#00fa9a",
    borderWidth: 2,
    borderColor: "#0000cd",
  },

  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 28,
  },
});