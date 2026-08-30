import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from "react-native";
import { COLORS } from "../constants/colors";

// 送信履歴のダミーデータ
const historyData = [
  { id: "1", date: "8月30日", memo: "公園で水遊び！", isRead: true, imageUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400" },
  { id: "2", date: "8月29日", memo: "お絵かきしたよ", isRead: false, imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400" },
];

export default function FamilyHomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>送信履歴とみまもり</Text>

        {historyData.map((item) => (
          <View key={item.id} style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.cardBody}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.memo}>{item.memo}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {item.isRead ? "❤️ みたよ！（安心）" : "🤍 まだ見ていません"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 右下のフローティングボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateNews")}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  heading: { fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: 20, marginTop: 10 },
  card: { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 16, padding: 12, elevation: 2 },
  image: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.background },
  cardBody: { flex: 1, marginLeft: 16, justifyContent: "center" },
  date: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  memo: { fontSize: 18, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  statusBadge: { backgroundColor: COLORS.likeLight, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: COLORS.like, fontWeight: "700", fontSize: 13 },
  fab: { position: "absolute", bottom: 30, right: 24, width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", elevation: 5 },
  fabText: { fontSize: 36, color: COLORS.white, fontWeight: "600", marginTop: -4 },
});