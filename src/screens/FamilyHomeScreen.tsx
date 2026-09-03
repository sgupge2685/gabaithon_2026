import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";

import { getAuth } from "firebase/auth";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

import { COLORS } from "../constants/colors";
import type { News } from "../types/News";
import type { User } from "../types/User";
import { getNews } from "../firebase/firestore";
import app from "../firebase/firebaseConfig";

const auth = getAuth(app);
const db = getFirestore(app);

const formatDate = (dateInput: any) => {
  if (!dateInput) return "";

  const date =
    typeof dateInput.toDate === "function"
      ? dateInput.toDate()
      : new Date(dateInput);

  return `${date.getMonth() + 1}月${date.getDate()}日 ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const getTime = (dateInput: any) => {
  if (!dateInput) return 0;

  if (
    typeof dateInput.toDate === "function"
  ) {
    return dateInput.toDate().getTime();
  }

  return new Date(dateInput).getTime();
};

export default function FamilyHomeScreen() {
  const navigation = useNavigation<any>();

  const [history, setHistory] = useState<News[]>(
    []
  );

  const [elderlyUser, setElderlyUser] =
    useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe =
      navigation.addListener(
        "focus",
        () => fetchHistory()
      );

    fetchHistory();

    return unsubscribe;
  }, [navigation]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        setHistory([]);
        return;
      }

      // --------------------------------------------------
      // 自分のUserを取得
      // --------------------------------------------------

      const myUserRef = doc(
        db,
        "users",
        firebaseUser.uid
      );

      const myUserSnapshot =
        await getDoc(myUserRef);

      if (!myUserSnapshot.exists()) {
        setHistory([]);
        return;
      }

      const myUser = {
        id: myUserSnapshot.id,
        ...myUserSnapshot.data(),
      } as User;

      if (myUser.role !== "family") {
        setHistory([]);
        return;
      }

      if (!myUser.familyGroupId) {
        setHistory([]);
        return;
      }

      // --------------------------------------------------
      // 同じfamilyGroupIdの高齢者を取得
      // --------------------------------------------------

      const usersRef = collection(
        db,
        "users"
      );

      const elderlyQuery = query(
        usersRef,
        where(
          "familyGroupId",
          "==",
          myUser.familyGroupId
        ),
        where("role", "==", "elderly"),
        limit(1)
      );

      const elderlySnapshot =
        await getDocs(elderlyQuery);

      if (elderlySnapshot.empty) {
        setElderlyUser(null);
        setHistory([]);
        return;
      }

      const elderlyData = {
        id: elderlySnapshot.docs[0].id,
        ...elderlySnapshot.docs[0].data(),
      } as User;

      setElderlyUser(elderlyData);

      // --------------------------------------------------
      // NEWS取得
      // --------------------------------------------------

      const newsList = await getNews();

      const familyNews = newsList
        .filter(
          (news) =>
            news.type === "family" &&
            news.deliveredTo === elderlyData.id
        )
        .sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );

      setHistory(familyNews);
    } catch (error) {
      console.error(
        "送信履歴の取得に失敗しました:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({
    item,
  }: {
    item: News;
  }) => (
    <View style={styles.card}>
      {item.mediaUrl ? (
        <Image
          source={{ uri: item.mediaUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImage}>
          <Text>写真なし</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.dateText}>
          {formatDate(item.createdAt)} 送信
        </Text>

        <Text
          style={styles.message}
          numberOfLines={2}
        >
          {item.message}
        </Text>

        <View style={styles.statusContainer}>
          {item.isRead ? (
            <View style={styles.readBadge}>
              <Text style={styles.readText}>
                ❤️ みたよ！（安心）
              </Text>
            </View>
          ) : (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                まだ見ていません
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>
        送信履歴
      </Text>

      {elderlyUser && (
        <Text style={styles.targetText}>
          {elderlyUser.name}さんへのNEWS
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              まだNEWSを送っていません。
              {"\n"}
              最初のNEWSを送ってみましょう！
            </Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate(
            "CreateNews"
          )
        }
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>
          ＋
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 4,
  },

  targetText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    height: 120,
    elevation: 2,
  },

  image: {
    width: 120,
    height: "100%",
  },

  noImage: {
    width: 120,
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },

  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  message: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  statusContainer: {
    marginTop: 8,
    alignItems: "flex-start",
  },

  readBadge: {
    backgroundColor: COLORS.likeLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  readText: {
    fontSize: 12,
    color: COLORS.like,
    fontWeight: "bold",
  },

  unreadBadge: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  unreadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: "bold",
    marginTop: -4,
  },
});