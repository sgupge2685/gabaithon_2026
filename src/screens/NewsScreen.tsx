import React, { useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";

import NewspaperCard from "../components/NewspaperCard";
import { News } from "../types/News";
import { COLORS } from "../constants/colors";

// バックエンドからは「今日表示する1件」だけが降ってくる想定
const todayNews: News = {
  id: "n1",
  deliveredTo: "u1",
  type: "family", // ここが "prevention" になる日もある
  title: "公園で元気に遊びました！",
  message: "今日はすごく暑かったから、みんなで冷たいお水をかぶって遊んだよ！おじいちゃんたちも、お家で冷たいお茶をたくさん飲んで涼しく過ごしてね。",
  mediaUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800",
  isRead: false,
  isAiGeneratedImage: false,
  createdAt: "2026-08-30",
};

export default function NewsScreen() {
  const [news, setNews] = useState<News>(todayNews);

  const handleReaction = () => {
    setNews((prev) => ({ ...prev, isRead: true, reaction: "👍" }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.heading}>今日の新聞</Text>

        <NewspaperCard news={news} onReaction={handleReaction} />
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
});