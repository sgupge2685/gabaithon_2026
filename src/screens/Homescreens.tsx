import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import { COLORS } from "../constants/colors";

export default function HomeScreen() {
  const [liked, setLiked] = React.useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.logo}>MAGONEWS</Text>
        <Text style={styles.date}>8月26日（水）</Text>
      </View>

      {/* 今日のNEWS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📸 今日のMAGONEWS
        </Text>

        {/* 写真 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            孫から写真が届きました
          </Text>

          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
            }}
            style={styles.image}
          />

          <Text style={styles.message}>
            「みんなでかき氷を食べたよ！」
          </Text>

          {/* LINE風リアクション */}
          <TouchableOpacity
            style={[
              styles.likeButton,
              liked && styles.likeButtonActive,
            ]}
            onPress={() => setLiked(!liked)}
            activeOpacity={0.8}
          >
            <Text style={styles.likeText}>
              {liked ? "❤️ いいねぇ！" : "♡ いいねぇ"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 今日の予防情報 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          ☀️ 今日のお知らせ
        </Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            今日は暑いですね
          </Text>

          <Text style={styles.warningMessage}>
            ○○ちゃんも冷たい飲み物を
            飲んでいるみたいです。
            {"\n\n"}
            あなたも飲み物を
            飲みませんか？
          </Text>

          <TouchableOpacity
            style={styles.okButton}
            activeOpacity={0.8}
          >
            <Text style={styles.okText}>
              分かった
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 25,
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

  image: {
    width: "100%",
    height: 260,
    borderRadius: 14,
    marginBottom: 15,
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

  okText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "700",
  },
});