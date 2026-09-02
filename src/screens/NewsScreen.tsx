import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  View,
} from "react-native";

import { getAuth } from "firebase/auth";

import NewspaperCard from "../components/NewspaperCard";
import type { News } from "../types/News";
import { COLORS } from "../constants/colors";
import {
  getNews,
  updateNews,
} from "../firebase/firestore";
import app from "../firebase/firebaseConfig";

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

export default function NewsScreen() {
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayNews = async () => {
      try {
        setLoading(true);

        const firebaseUser = auth.currentUser;

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
        <Text style={styles.logo}>
          MAGONEWS
        </Text>

        <Text style={styles.heading}>
          今日の新聞
        </Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              新聞を印刷中...
            </Text>
          </View>
        ) : news ? (
          <NewspaperCard
            news={news}
            onReaction={handleReaction}
          />
        ) : (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>
              まだ新聞が届いていません。
            </Text>
          </View>
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
    marginBottom: 20,
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
    fontSize: 18,
    color: COLORS.textSecondary,
  },
});