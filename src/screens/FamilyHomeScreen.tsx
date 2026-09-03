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
  SafeAreaView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Share,
  Alert,
} from "react-native"; 
 
import { useNavigation } from "@react-navigation/native"; 
 
import { getAuth } from "@react-native-firebase/auth";
 
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  deleteDoc,
  onSnapshot,
} from "@react-native-firebase/firestore"; 
 
import { COLORS } from "../constants/colors"; 
import type { News } from "../types/News"; 
import type { User } from "../types/User"; 
import { getNews, saveNews, getMedia } from "../firebase/firestore"; 
 
import {
  createFamilyInvitation,
} from "../features/familyConnection/familyConnectionFunctions";
import { getAppCurrentUser } from "../features/auth/authFunctions";
import {
  requestNotificationPermission,
  sendLocalNotification,
} from "../services/notificationService";
import {
  generatePreventionNewsClient,
  generatePreventionNewsWithPhotoSelection,
  getPendingPreventionKeywords,
} from "../services/clientAiService";
import { getWeatherData } from "../services/weatherService";
 
const auth = getAuth(); 
const db = getFirestore(); 
 
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

  const [inviting, setInviting] = 
    useState(false); 
 
  useEffect(() => { 
    requestNotificationPermission();

    const unsubscribe = 
      navigation.addListener( 
        "focus", 
        () => fetchHistory() 
      ); 
 
    fetchHistory(); 

    // リアルタイムでおばあちゃんの「みたよ」を監視
    let initialLoad = true;
    const notifiedReadIds = new Set<string>();

    const q = query(
      collection(db, "news"),
      where("type", "==", "family")
    );

    const unsubscribeSnapshot = onSnapshot(
      q,
      (snapshot) => {
        if (initialLoad) {
          initialLoad = false;
          snapshot.docs.forEach((d) => {
            if (d.data().isRead) {
              notifiedReadIds.add(d.id);
            }
          });
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const newsId = change.doc.id;
            const data = change.doc.data();
            if (data.isRead === true) {
              // 既に通知済みのニュースなら重複スキップ
              if (notifiedReadIds.has(newsId)) {
                return;
              }
              notifiedReadIds.add(newsId);

              sendLocalNotification(
                "❤️ おばあちゃんがニュースを読みました！",
                `「${data.title || "今日の家族ニュース"}」に「みたよ」が届きました！`,
                { screen: "FamilyHome" }
              );
              fetchHistory();
            }
          }
        });
      },
      (error) => {
        console.warn("送信履歴監視エラー:", error);
      }
    );
 
    return () => {
      unsubscribe();
      unsubscribeSnapshot();
    }; 
  }, [navigation]); 
 
  const fetchHistory = async () => { 
    try { 
      setLoading(true); 
 
      const firebaseUser = getAppCurrentUser(); 
 
      if (!firebaseUser) { 
        setHistory([]); 
        setElderlyUser(null);
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
        setElderlyUser(null);
        return; 
      } 
 
      const myUser = { 
        id: myUserSnapshot.id, 
        ...myUserSnapshot.data(), 
      } as User; 
 
      if (myUser.role !== "family") { 
        setHistory([]); 
        setElderlyUser(null);
        return; 
      } 
 
      // -------------------------------------------------- 
      // 新しい家族連携方式
      // familyUidを使って高齢者を取得
      // -------------------------------------------------- 

      const usersRef = collection( 
        db, 
        "users" 
      ); 

      const myUserWithFamilyUid =
        myUser as User & {
          familyUid?: string;
        };

      let elderlySnapshot: any = null;

      // 1. 新方式: 高齢者側に familyUid として家族のUIDが保存されている
      const elderlyQuery = query(
        usersRef,
        where(
          "familyUid",
          "==",
          firebaseUser.uid
        ),
        where(
          "role",
          "==",
          "elderly"
        ),
        limit(1)
      );

      elderlySnapshot =
        await getDocs(
          elderlyQuery
        );

      // 2. 接続履歴 (familyConnections) から探す
      if (!elderlySnapshot || elderlySnapshot.empty) {
        const connectionsRef = collection(db, "familyConnections");
        const connQuery = query(
          connectionsRef,
          where("familyUid", "==", firebaseUser.uid),
          limit(1)
        );
        const connSnapshot = await getDocs(connQuery);
        if (!connSnapshot.empty) {
          const elderlyUid = connSnapshot.docs[0].data().elderlyUid;
          if (elderlyUid) {
            const elderlyDoc = await getDoc(doc(db, "users", elderlyUid));
            if (elderlyDoc.exists()) {
              elderlySnapshot = { empty: false, docs: [elderlyDoc] };
            }
          }
        }
      }

      // --------------------------------------------------
      // 既存のfamilyGroupId方式との互換
      // --------------------------------------------------

      if (
        (!elderlySnapshot ||
          elderlySnapshot.empty) &&
        myUser.familyGroupId
      ) {
        const elderlyQuery = query(
          usersRef,
          where(
            "familyGroupId",
            "==",
            myUser.familyGroupId
          ),
          where(
            "role",
            "==",
            "elderly"
          ),
          limit(1)
        );

        elderlySnapshot =
          await getDocs(
            elderlyQuery
          );
      }

      if (
        !elderlySnapshot ||
        elderlySnapshot.empty
      ) {
        setElderlyUser(null);
        setHistory([]);
        return;
      }

      const elderlyData = {
        id:
          elderlySnapshot.docs[0].id,
        ...elderlySnapshot
          .docs[0]
          .data(),
      } as User;

      setElderlyUser(
        elderlyData
      );

      // --------------------------------------------------
      // NEWS取得
      // --------------------------------------------------

      const newsList =
        await getNews();

      const familyNews = newsList 
        .filter( 
          (news) => 
            (news.type === "family" || news.type === "prevention") && 
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

  // --------------------------------------------------
  // 予防ニュースをAIで自動生成して高齢者へ配信
  // --------------------------------------------------
  const handleSendPreventionNews = async () => {
    if (!elderlyUser) {
      Alert.alert("エラー", "接続先の高齢者が見つかりません。先に招待を行ってください。");
      return;
    }

    try {
      setLoading(true);

      // 1. 過去の家族写真一覧を取得
      console.log("過去の家族写真を取得中...");
      const firebaseUser = getAppCurrentUser();
      const allMedia = await getMedia();
      const familyPhotos = allMedia.filter(
        (m) => !m.uploadedBy || (firebaseUser && m.uploadedBy === firebaseUser.uid) || (m.tags && m.tags.length > 0)
      );
      console.log(`写真候補数: ${familyPhotos.length}件`);

      // 2. 地域のリアルタイム気象データを取得
      const locationName = elderlyUser.location || "佐賀市";
      console.log(`${locationName} の気象データを取得中...`);
      let weather = null;
      try {
        weather = await getWeatherData(locationName);
        console.log("取得した気象データ:", weather);
      } catch (weatherErr) {
        console.warn("気象データ取得失敗（デフォルト値で継続）:", weatherErr);
      }

      // 3. 過去のニュース履歴を取得し、今日すでに配信した注意キーワードがあるかチェック
      console.log("重複配信チェックを開始...");
      const allNews = await getNews();
      const myElderlyNews = allNews.filter((n) => n.deliveredTo === elderlyUser.id);
      const pendingKeywords = getPendingPreventionKeywords(weather, myElderlyNews);

      console.log("今日未配信の予防キーワード:", pendingKeywords);

      // ★ すでに今日同じキーワードのニュースを発信済みの場合は発信しない！
      if (pendingKeywords.length === 0) {
        console.log("本日すでに同じ注意喚起を配信済みのためスキップ");
        Alert.alert(
          "配信スキップ（重複防止）",
          "本日の気象注意（予防ニュース）はすでに配信済みです。\n1日に同じ注意喚起が何度も届かないよう自動で発信を停止しました。"
        );
        return;
      }

      const primaryKeyword = pendingKeywords[0];
      console.log(`今回発信する予防キーワード: 【${primaryKeyword}】`);

      // 4. 写真選定 ➡️ 予防ニュース生成を一撃実行！
      console.log("Gemini AI による写真選定＆予防ニュース生成を開始...");
      const result = await generatePreventionNewsWithPhotoSelection(
        familyPhotos,
        weather,
        locationName,
        primaryKeyword
      );
      console.log("生成された予防ニュース結果:", result);

      const now = new Date().toISOString();
      const photoUrl = result.photo ? result.photo.url : "";

      // 4. Firestore の news コレクションに保存！
      await saveNews({
        deliveredTo: elderlyUser.id,
        type: "prevention",
        title: result.title,
        message: result.message,
        mediaUrl: photoUrl,
        isRead: false,
        isAiGeneratedImage: false,
        createdAt: now,
      });

      // 家族側にも完了通知を表示
      sendLocalNotification(
        "🎉 予防ニュースを届けました！",
        `見出し: 「${result.title}」`
      );

      const photoStatusMsg = result.photo
        ? `📷 テーマ「${result.theme}」に合う家族写真が選定されました！`
        : `📝 今回は写真なし（気象予防アドバイスのみ）で配信しました。`;

      Alert.alert(
        "予防ニュースを届けました！",
        `【テーマ】${result.theme}\n【見出し】「${result.title}」\n\n${photoStatusMsg}\n\n${elderlyUser.name || "おじいちゃん・おばあちゃん"}さんに予防ニュースを配信しました！`
      );

      fetchHistory();
    } catch (error) {
      console.error("予防ニュース送信エラー:", error);
      Alert.alert("エラー", "予防ニュースの送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  }; 

  // --------------------------------------------------
  // 家族招待リンクを作成
  // --------------------------------------------------

  const handleCreateInvitation =
    async () => {
      try {
        setInviting(true);

        const invitationUrl =
          await createFamilyInvitation();

        console.log(
          "作成した招待リンク:",
          invitationUrl
        );

        await Share.share({
          message:
            `MAGONEWSへの招待です。\n\nこのリンクを開いて家族とつながってください。\n\n${invitationUrl}`,
        });
      } catch (error) {
        console.error(
          "招待リンク作成エラー:",
          error
        );

        Alert.alert(
          "招待作成失敗",
          error instanceof Error
            ? error.message
            : "招待リンクを作成できませんでした。"
        );
      } finally {
        setInviting(false);
      }
    };

  const handleResetNews = () => {
    Alert.alert(
      "ニュースの削除",
      "送信済みのニュースデータをすべて削除しますか？\n（おじいちゃん・おばあちゃん側も未読状態に戻ります）",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const newsSnapshot = await getDocs(collection(db, "news"));
              const deletePromises = newsSnapshot.docs.map((d) =>
                deleteDoc(doc(db, "news", d.id))
              );
              await Promise.all(deletePromises);
              setHistory([]);
              Alert.alert("削除完了", "ニュースデータをすべて削除しました。");
            } catch (err) {
              console.error("ニュース削除エラー:", err);
              Alert.alert("エラー", "ニュースの削除に失敗しました。");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
          {elderlyUser.name}さんへのニュース 
        </Text> 
      )} 

      {/* --------------------------------------------------
          家族招待
          -------------------------------------------------- */}

      <View style={styles.inviteSection}>
        <TouchableOpacity
          style={[
            styles.inviteButton,
            inviting &&
              styles.buttonDisabled,
          ]}
          onPress={
            handleCreateInvitation
          }
          disabled={inviting}
          activeOpacity={0.8}
        >
          {inviting ? (
            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />
          ) : (
            <Text
              style={
                styles.inviteButtonText
              }
            >
              高齢者を招待する
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={
            styles.inviteDescription
          }
        >
          招待リンクを作成して、高齢者の方へ送ることができます。
        </Text>

        {/* 予防ニュース配信ボタン（デモ用） */}
        <TouchableOpacity
          style={styles.preventionButton}
          onPress={handleSendPreventionNews}
          activeOpacity={0.8}
        >
          <Text style={styles.preventionButtonText}>
            🌤️【デモ用】予防ニュースを届ける（AI生成）
          </Text>
        </TouchableOpacity>

        <Text style={styles.demoNote}>
          ※本番は毎朝AIが自動配信しますが、デモ用に今すぐ配信できます
        </Text>

        {/* デモ用ニュース削除ボタン */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetNews}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>🗑️ 送信履歴を全削除（デモ用リセット）</Text>
        </TouchableOpacity>
      </View>
 
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
              まだニュースを送っていません。 
              {"\n"} 
              最初のニュースを送ってみましょう！ 
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

  // --------------------------------------------------
  // 家族招待
  // --------------------------------------------------

  inviteSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },

  inviteButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "bold",
  },

  inviteDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  preventionButton: {
    marginTop: 12,
    backgroundColor: "#0284C7",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  preventionButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "bold",
  },

  demoNote: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  resetButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignSelf: "center",
  },

  resetButtonText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
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