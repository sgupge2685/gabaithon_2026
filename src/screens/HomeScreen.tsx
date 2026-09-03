import React, { useEffect, useState } from "react";
import type { News } from "../types/News";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAuth } from "@react-native-firebase/auth";

import { COLORS } from "../constants/colors";
import { getNews } from "../firebase/firestore";
import { getAppCurrentUser } from "../features/auth/authFunctions";

const auth = getAuth();

export default function HomeScreen({ navigation }: any) {
  const [hasNewNews, setHasNewNews] = useState(false);
  const [loading, setLoading] = useState(true);

  // 日付情報の取得（日めくりカレンダー表示用）
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = dayNames[today.getDay()];

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

      const firebaseUser = getAppCurrentUser();

      // ログイン中のユーザーがいない場合
      if (!firebaseUser) {
        setHasNewNews(false);
        return;
      }

      const newsList = await getNews();

      // 自分宛のNEWSの中に未読(isReadがfalse)のニュースが
      // 1つでもあるかチェック
      const unreadExists = newsList.some(
        (news: News) =>
          news.deliveredTo === firebaseUser.uid &&
          news.isRead === false
      );

      setHasNewNews(unreadExists);
    } catch (error) {
      console.error("ニュースの確認に失敗しました:", error);
      setHasNewNews(false);
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
                : "今は新しいニュースはありません。\n過去のニュースを振り返ってみましょう！"}
            </Text>
          )}
        </View>

        {/* 1. 今日のニュース（日めくりカレンダー型ボタン） */}
        <TouchableOpacity
          style={styles.calendarCard}
          onPress={() => navigation.navigate("News")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="今日のニュースを見る"
        >
          {/* カレンダー上部のリング・バインダー風ヘッダー */}
          <View style={styles.calendarHeaderToday}>
            <View style={styles.calendarRingLeft} />
            <View style={styles.calendarRingRight} />
            <Text style={styles.calendarHeaderTextToday}>TODAY'S NEWS</Text>
          </View>

          {/* カレンダー本文 */}
          <View style={styles.calendarBody}>
            <View style={styles.dateBlock}>
              <Text style={styles.monthText}>{month}月</Text>
              <Text style={styles.dateNumberText}>{date}</Text>
              <Text style={styles.dayText}>({dayOfWeek})</Text>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.mainActionText}>今日のニュース</Text>
                {hasNewNews && <View style={styles.unreadBadge} />}
              </View>

              <Text style={styles.subActionText}>
                {hasNewNews
                  ? "✨ 新しいニュースが届いています"
                  : "最新のニュースを読む"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. 過去のNEWS（アーカイブカレンダー型ボタン） */}
        <TouchableOpacity
          style={[styles.calendarCard, styles.historyCard]}
          onPress={() => navigation.navigate("History")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="過去のニュースを見る"
        >
          {/* カレンダー上部のヘッダー */}
          <View style={styles.calendarHeaderHistory}>
            <View style={styles.calendarRingLeft} />
            <View style={styles.calendarRingRight} />
            <Text style={styles.calendarHeaderTextHistory}>ARCHIVE</Text>
          </View>

          {/* カレンダー本文 */}
          <View style={styles.calendarBody}>
            <View style={styles.historyIconBlock}>
              <Text style={styles.historyCalendarIcon}>📅</Text>
              <Text style={styles.historySubBadge}>一覧</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.historyActionText}>過去のニュース</Text>
              <Text style={styles.subActionText}>
                これまでの思い出を振り返る
              </Text>
            </View>
          </View>
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
    paddingHorizontal: 20,
  },

  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },

  greeting: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },

  messageContainer: {
    minHeight: 56,
    justifyContent: "center",
    marginBottom: 28,
  },

  message: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },

  // カレンダーカード共通
  calendarCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  historyCard: {
    borderColor: COLORS.disabled,
    elevation: 1,
    shadowOpacity: 0.05,
  },

  // ヘッダー部（バインダー風デザイン）
  calendarHeaderToday: {
    height: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  calendarHeaderHistory: {
    height: 32,
    backgroundColor: COLORS.disabled,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  calendarHeaderTextToday: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  calendarHeaderTextHistory: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // カレンダー上部のリング穴装飾
  calendarRingLeft: {
    position: "absolute",
    left: 40,
    top: -4,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },

  calendarRingRight: {
    position: "absolute",
    right: 40,
    top: -4,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },

  // カレンダー内部コンテンツ
  calendarBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // 「今日」の日付ブロック
  dateBlock: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.disabled,
    marginRight: 16,
  },

  monthText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    lineHeight: 14,
  },

  dateNumberText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    lineHeight: 30,
  },

  dayText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    lineHeight: 13,
  },

  // 「過去」のアイコンブロック
  historyIconBlock: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.disabled,
    marginRight: 16,
  },

  historyCalendarIcon: {
    fontSize: 26,
    marginBottom: 2,
  },

  historySubBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  // カード右側のテキスト領域
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  mainActionText: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  historyActionText: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  subActionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // 未読バッジ（赤丸）
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    marginLeft: 8,
  },
});