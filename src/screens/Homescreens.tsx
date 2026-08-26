import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { COLORS } from "../constants/colors";

// --- 型定義 ---
export interface Media {
  id: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
  type: "image" | "AIimage";
  tags: string[];
  deliveryCount: number;
  takenAt?: string;
  caption?: string;
}

export interface News {
  id: string;
  deliveredTo: string;
  type: "family" | "prevention";
  title: string;
  message: string;
  mediaUrl: string;
  isRead: boolean;
  reaction?: string;
  isAiGeneratedImage: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: "elderly" | "family";
  familyGroupId: string;
  location: string;
  notificationEnabled: boolean;
  photoUrl?: string;
  createdAt?: string;
}

export interface Weather {
  locationName: string;
  date: string;
  weatherText: string;
  temperatureMax: number;
  temperatureMin: number;
  humidityDaytime: number;
  humidityNight: number;
  rainProbability: number;
  uvIndex: number;
  windSpeed: number;
  warnings?: string[];
}

interface HomeScreenProps {
  currentUser?: User;
  weather?: Weather;
  newsList?: News[];
  onReaction?: (newsId: string, reaction: string) => void;
  onConfirmPrevention?: (newsId: string) => void;
}

export default function HomeScreen({
  currentUser,
  weather,
  newsList = [],
  onReaction,
  onConfirmPrevention,
}: HomeScreenProps) {
  // 各NEWSのリアクション・了解状態を管理
  const [reactions, setReactions] = useState<{ [id: string]: string }>({});
  const [confirmed, setConfirmed] = useState<{ [id: string]: boolean }>({});

  const handleToggleLike = (newsId: string) => {
    const currentReaction = reactions[newsId];
    const newReaction = currentReaction === "❤️" ? "" : "❤️";
    
    setReactions((prev) => ({ ...prev, [newsId]: newReaction }));
    if (onReaction) {
      onReaction(newsId, newReaction);
    }
  };

  const handleConfirm = (newsId: string) => {
    setConfirmed((prev) => ({ ...prev, [newsId]: true }));
    if (onConfirmPrevention) {
      onConfirmPrevention(newsId);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.date}>
          {weather?.date ? weather.date : "8月26日（水）"}
          {currentUser?.name ? ` ・ ${currentUser.name}さん` : ""}
        </Text>
      </View>

      {/* 気象警報アラート（存在時のみ表示） */}
      {weather?.warnings && weather.warnings.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠️ {weather.warnings.join("・")} が発表されています
          </Text>
        </View>
      )}

      {/* 天気サマリー */}
      {weather && (
        <View style={styles.weatherCard}>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherLocation}>{weather.locationName}</Text>
            <Text style={styles.weatherStatus}>{weather.weatherText}</Text>
          </View>
          <View style={styles.weatherDetails}>
            <Text style={styles.tempText}>
              <Text style={styles.tempMax}>{weather.temperatureMax}°C</Text> /{" "}
              <Text style={styles.tempMin}>{weather.temperatureMin}°C</Text>
            </Text>
            <Text style={styles.rainText}>
              降水確率 {weather.rainProbability}%
            </Text>
          </View>
        </View>
      )}

      {/* NEWS配信リスト */}
      {newsList.map((news) => {
        const isFamilyNews = news.type === "family";
        const isLiked = (reactions[news.id] || news.reaction) === "❤️";
        const isConfirmed = confirmed[news.id];

        return (
          <View key={news.id} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isFamilyNews ? "📸 今日のMAGONEWS" : "☀️ 今日のお知らせ"}
            </Text>

            <View style={isFamilyNews ? styles.card : styles.warningCard}>
              <Text
                style={
                  isFamilyNews ? styles.cardTitle : styles.warningTitle
                }
              >
                {news.title}
              </Text>

              {news.mediaUrl ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: news.mediaUrl }}
                    style={styles.image}
                  />
                  {news.isAiGeneratedImage && (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AIイラスト</Text>
                    </View>
                  )}
                </View>
              ) : null}

              <Text
                style={
                  isFamilyNews ? styles.message : styles.warningMessage
                }
              >
                {news.message}
              </Text>

              {/* カード種別ごとのアクションボタン */}
              {isFamilyNews ? (
                <TouchableOpacity
                  style={[
                    styles.likeButton,
                    isLiked && styles.likeButtonActive,
                  ]}
                  onPress={() => handleToggleLike(news.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.likeText}>
                    {isLiked ? "❤️ いいねぇ！" : "♡ いいねぇ"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.okButton,
                    isConfirmed && styles.okButtonActive,
                  ]}
                  onPress={() => handleConfirm(news.id)}
                  activeOpacity={0.8}
                  disabled={isConfirmed}
                >
                  <Text style={styles.okText}>
                    {isConfirmed ? "✓ 分かりました" : "分かった"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 20,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
  },

  date: {
    marginTop: 6,
    fontSize: 20,
    color: COLORS.textSecondary,
  },

  alertBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  alertText: {
    color: "#B91C1C",
    fontSize: 16,
    fontWeight: "700",
  },

  weatherCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },

  weatherMain: {
    flexDirection: "column",
  },

  weatherLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  weatherStatus: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },

  weatherDetails: {
    alignItems: "flex-end",
  },

  tempText: {
    fontSize: 18,
    fontWeight: "700",
  },

  tempMax: {
    color: "#EF4444",
  },

  tempMin: {
    color: "#3B82F6",
  },

  rainText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },

  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 260,
    marginBottom: 15,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  aiBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  aiBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  message: {
    fontSize: 22,
    lineHeight: 32,
    color: COLORS.text,
    marginBottom: 18,
  },

  likeButton: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  likeButtonActive: {
    backgroundColor: "#FFE7EC",
  },

  likeText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.like,
  },

  warningCard: {
    backgroundColor: COLORS.warning,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8D28A",
  },

  warningTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.warningText,
    marginBottom: 14,
  },

  warningMessage: {
    fontSize: 21,
    lineHeight: 32,
    color: COLORS.text,
    marginBottom: 20,
  },

  okButton: {
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  okButtonActive: {
    backgroundColor: "#9CA3AF",
  },

  okText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "700",
  },
});