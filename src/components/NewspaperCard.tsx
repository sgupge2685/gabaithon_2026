import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
} from "react-native";

import { News } from "../types/News";
import { COLORS } from "../constants/colors";

import ReactionButton from "./ReactionButton";

interface NewspaperCardProps {
  news: News;
  onReaction: (newsId: string) => void;
}

export default function NewspaperCard({
  news,
  onReaction,
}: NewspaperCardProps) {

  const isFamilyNews = news.type === "family";

  return (
    <View style={styles.card}>

      {/* 写真 */}
      {news.mediaUrl && (
        <View style={styles.imageContainer}>

          <Image
            source={{ uri: news.mediaUrl }}
            style={styles.image}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel={news.title}
          />

          {/* AI生成画像の場合 */}
          {news.isAiGeneratedImage && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                イラスト
              </Text>
            </View>
          )}

        </View>
      )}

      {/* 文章 */}
      <View style={styles.body}>

        <Text style={styles.category}>
          {isFamilyNews
            ? "家族ニュース"
            : "くらしの予防ニュース"}
        </Text>

        <Text style={styles.title}>
          {news.title}
        </Text>

        <Text style={styles.message}>
          {news.message}
        </Text>

        {/* みたよボタン */}
        <ReactionButton
          isRead={news.isRead}
          reaction={news.reaction}
          onPress={() => onReaction(news.id)}
        />

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,

    borderRadius: 24,

    marginBottom: 28,

    overflow: "hidden",

    borderWidth: 1,
    borderColor: COLORS.background,

    elevation: 3,
  },

  imageContainer: {
    width: "100%",
    height: 280,

    position: "relative",

    backgroundColor: COLORS.background,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  badge: {
    position: "absolute",

    top: 12,
    left: 12,

    backgroundColor: COLORS.text,

    paddingHorizontal: 12,
    paddingVertical: 5,

    borderRadius: 12,
  },

  badgeText: {
    color: COLORS.white,

    fontSize: 13,
    fontWeight: "600",
  },

  body: {
    padding: 22,
  },

  category: {
    fontSize: 16,
    fontWeight: "700",

    color: COLORS.primary,

    marginBottom: 8,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",

    color: COLORS.text,

    lineHeight: 32,

    marginBottom: 10,
  },

  message: {
    fontSize: 19,

    lineHeight: 31,

    color: COLORS.text,

    marginBottom: 24,
  },
});