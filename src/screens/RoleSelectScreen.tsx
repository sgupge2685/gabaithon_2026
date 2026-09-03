import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { COLORS } from "../constants/colors";

export default function RoleSelectScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.message}>どなたがご利用になりますか？</Text>

        {/* 追加: ボタンを横に並べるための「親の箱（コンテナ）」 */}
        <View style={styles.buttonContainer}>
          
          {/* おじいちゃん・おばあちゃん用ボタン */}
          <TouchableOpacity
            style={[styles.squareButton, styles.elderlyButton]}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            {/* 変更: 正方形に収まるように改行を追加 */}
            <Text style={styles.buttonText}>👵👴{"\n"}おじいちゃん{"\n"}おばあちゃん</Text>
          </TouchableOpacity>

          {/* 家族用ボタン */}
          <TouchableOpacity
            style={[styles.squareButton, styles.familyButton]}
            onPress={() => navigation.navigate("FamilyHome")}
            activeOpacity={0.8}
          >
            {/* 変更: 正方形に収まるように改行を追加 */}
            <Text style={styles.buttonText}>👨‍👩‍👧{"\n"}ご家族の方</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logo: { fontSize: 40, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  message: { fontSize: 20, color: COLORS.textSecondary, marginBottom: 48 },

  // 新規: ボタンを横に並べるためのスタイル
  buttonContainer: {
    flexDirection: "row", // 要素を横並びにする
    justifyContent: "space-between", // 両端に配置して真ん中に隙間を作る
    width: "100%", 
  },
  
  // 変更: 以前の button を正方形（squareButton）に変更
  squareButton: {
    width: "47%", // 50%だと隙間がなくなるので、少し小さくして余白を確保
    aspectRatio: 1, // 縦横比を 1:1 にして完全な正方形にする
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    padding: 10, // 文字が端に寄らないように内側の余白を追加
  },
  
  elderlyButton: { backgroundColor: COLORS.warning, borderWidth: 2, borderColor: COLORS.warningBorder },
  familyButton: { backgroundColor: '#00fa9a' ,borderWidth: 2, borderColor: '#0000cd'},
  
  // 変更: 文字サイズを少し調整し、中央揃え（textAlign）にする
  buttonText: { fontSize: 18, fontWeight: "700", color: COLORS.text, textAlign: "center", lineHeight: 28 },
});