import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { COLORS } from "../constants/colors";

export default function RoleSelectScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.message}>どなたがご利用になりますか？</Text>

        <TouchableOpacity
          style={[styles.button, styles.elderlyButton]}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>👵👴おじいちゃんおばあちゃんの方はこちら</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.familyButton]}
          onPress={() => navigation.navigate("FamilyHome")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>👨‍👩‍👧ご家族の方はこちら</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logo: { fontSize: 40, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  message: { fontSize: 20, color: COLORS.textSecondary, marginBottom: 48 },
  button: { width: "100%", height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 3 },
  elderlyButton: { backgroundColor: COLORS.warning, borderWidth: 2, borderColor: COLORS.warningBorder },
  familyButton: { backgroundColor: COLORS.primary },
  buttonText: { fontSize: 22, fontWeight: "700", color: COLORS.text },
});