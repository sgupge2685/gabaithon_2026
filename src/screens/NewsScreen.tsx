import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  View,
  TouchableOpacity, // 追加: ボタン用の部品
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAuth } from "firebase/auth";

import NewspaperCard from "../components/NewspaperCard";
import type { News } from "../types/News";
import { COLORS } from "../constants/colors";
import {
  getNews,
  updateNews,
} from "../firebase/firestore";
import app from "../firebase/firebaseConfig";
import { getAppCurrentUser } from "../features/auth/authFunctions";

const auth = getAuth(app);

const getTime = (dateInput: any) => {
  if (!dateInput) return 0;

  if (
    typeof dateInput.toDate === "function"
  ) {
    return dateInput.toDate().getTime();
  }

  return new Date(dateInput).getTime();
};

// 変更: navigation を受け取るようにする
export default function NewsScreen({ navigation }: any) {
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayNews = async () => {
      try {
        setLoading(true);

        const firebaseUser = getAppCurrentUser();

        if (!firebaseUser) {
          setNews(null);
          return;
        }

        const newsList = await getNews();

        // 自分宛てのNEWSのみ
        const myNews = newsList.filter(
          (item: News) =>
            item.deliveredTo === firebaseUser.uid
        );

        const sortedNews = myNews.sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );

        const unreadNews = sortedNews.find(
          (item) => item.isRead === false
        );

        if (unreadNews) {
          setNews(unreadNews);
        } else if (sortedNews.length > 0) {
          setNews(sortedNews[0]);
        } else {
          setNews(null);
        }
      } catch (error) {
        console.error(
          "今日のニュース取得エラー:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTodayNews();
  }, []);

  const handleReaction = async () => {
    if (!news || !news.id) return;

    // Optimistic UI
    setNews((prev) =>
      prev
        ? {
            ...prev,
            isRead: true,
            reaction: "👍",
          }
        : null
    );

    try {
      await updateNews(news.id, {
        isRead: true,
        reaction: "👍",
      });
    } catch (error) {
      console.error(
        "リアクションの保存に失敗しました:",
        error
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* 追加: 戻るボタン */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← ホームに戻る</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>
          MAGONEWS
        </Text>

        <Text style={styles.heading}>
          今日のニュース
        </Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              ニュースを読み込み中...
            </Text>
          </View>
        ) : news ? (
          <View>
            <Text style={styles.newsTitle}>{news.title}</Text>
            
            <NewspaperCard
              news={news}
              onReaction={handleReaction}
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>
            まだニュースが届いていません。
          </Text>
        )}
      </ScrollView>
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
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
    minHeight: "100%",
  },

  // 追加: 戻るボタンのスタイル
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 10,
  },

  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
  },

  newsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 30,
    paddingHorizontal: 16,
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});