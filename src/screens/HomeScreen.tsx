import React, { useEffect, useState } from "react";
import type { News } from "../types/News";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";

import { COLORS } from "../constants/colors";
import { getNews } from "../firebase/firestore";

export default function HomeScreen({ navigation }: any) {
  const [hasNewNews, setHasNewNews] = useState(false);
  const [loading, setLoading] = useState(true);

// 画面が表示されるたびに新着ニュースがあるかチェックする
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      checkNewNews();
    });
    checkNewNews();
    return unsubscribe;
  }, [navigation]);

  const checkNewNews = async () => {
    try {
      setLoading(true);
      const newsList = await getNews();
      
      // 未読(isReadがfalse)のニュースが1つでもあるかチェック
      const unreadExists = newsList.some((news: News) => news.isRead === false);
      setHasNewNews(unreadExists);
    } catch (error) {
      console.error("ニュースの確認に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <View style={styles.container}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.greeting}>こんにちは！</Text>

        {/* バックエンドの状態に合わせてメッセージを切り替え */}
        <View style={styles.messageContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.message}>
              {hasNewNews
                ? "今日の家族ニュースが届いています✨"
                : "今は新しいニュースはありません。\n過去の新聞を振り返ってみましょう！"}
            </Text>
          )}
        </View>

        {/* 1. 今日のニュースを見る */}
        <TouchableOpacity
          style={[styles.button, styles.newsButton]}
          onPress={() => navigation.navigate("News")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="今日の新聞を見る"
        >
          <Text style={styles.newsButtonText}>📰 今日のニュースを見る</Text>
        </TouchableOpacity>

        {/* 2. 過去のNEWSを見る (HistoryScreenへ) */}
        <TouchableOpacity
          style={[styles.button, styles.historyButton]}
          onPress={() => navigation.navigate("History")}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.historyButtonText}>📚 過去のNEWSを見る</Text>
        </TouchableOpacity>

        {/* 3. 家族を追加する (AddFamilyScreenへ) */}
        <TouchableOpacity
          style={[styles.button, styles.addFamilyButton]}
          onPress={() => navigation.navigate("AddFamily")}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.addFamilyButtonText}>👨‍👩‍👧‍👦 家族を追加する</Text>
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
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 24,
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  messageContainer: {
    minHeight: 60,
    justifyContent: "center",
    marginBottom: 40,
  },

  message: {
    fontSize: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 30,
  },

  // ボタン共通スタイル
  button: {
    width: "100%",
    minHeight: 70, // 元の80から少しだけスリムにして3つ並べやすく
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16, // ボタン同士の間隔
  },

  // 今日のニュースボタン
  newsButton: {
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  newsButtonText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.white,
  },

  // 履歴ボタン
  historyButton: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  historyButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // 家族追加ボタン
  addFamilyButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
  },
  addFamilyButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});