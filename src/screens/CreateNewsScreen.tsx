import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

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
} from "@react-native-firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import app from "../firebase/firebaseConfig";
import { COLORS } from "../constants/colors";
import { saveMedia, saveMediaWithId, saveNews } from "../firebase/firestore";
import type { User } from "../types/User";
import { getAppCurrentUser } from "../features/auth/authFunctions";
import {
  generatePhotoTagsClient,
  generateNewsContentClient,
} from "../services/clientAiService";
import { sendLocalNotification } from "../services/notificationService";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage(app);

export default function CreateNewsScreen({ navigation }: any) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [elderlyUser, setElderlyUser] = useState<User | null>(null);

  const [imageUri, setImageUri] = useState("");
  const [caption, setCaption] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // --------------------------------------------------
  // 家族ユーザーとペアの高齢者を取得
  // --------------------------------------------------
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const firebaseUser = getAppCurrentUser();

        if (!firebaseUser) {
          Alert.alert("エラー", "ログイン中のユーザーが見つかりません。");
          return;
        }

        const myUserRef = doc(db, "users", firebaseUser.uid);
        const myUserSnapshot = await getDoc(myUserRef);

        if (!myUserSnapshot.exists()) {
          Alert.alert("エラー", "ユーザー情報が見つかりません。");
          return;
        }

        const myUser = {
          id: myUserSnapshot.id,
          ...myUserSnapshot.data(),
        } as User;

        setCurrentUser(myUser);

        if (myUser.role !== "family") {
          Alert.alert("エラー", "この画面は家族側のみ利用できます。", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }

        const usersRef = collection(db, "users");
        let elderlySnapshot: any = null;

        // 1. 新方式: 高齢者側に familyUid として家族のUIDが保存されている
        const elderlyQueryByFamilyUid = query(
          usersRef,
          where("familyUid", "==", firebaseUser.uid),
          where("role", "==", "elderly"),
          limit(1)
        );
        elderlySnapshot = await getDocs(elderlyQueryByFamilyUid);

        // 2. 旧方式: familyGroupId での検索
        if ((!elderlySnapshot || elderlySnapshot.empty) && myUser.familyGroupId) {
          const elderlyQueryByGroupId = query(
            usersRef,
            where("familyGroupId", "==", myUser.familyGroupId),
            where("role", "==", "elderly"),
            limit(1)
          );
          elderlySnapshot = await getDocs(elderlyQueryByGroupId);
        }

        // 3. 接続履歴 (familyConnections) から探す
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

        if (!elderlySnapshot || elderlySnapshot.empty) {
          Alert.alert(
            "家族未接続",
            "先に高齢者の方と接続してください。",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
          return;
        }

        const elderlyData = {
          id: elderlySnapshot.docs[0].id,
          ...elderlySnapshot.docs[0].data(),
        } as User;

        setElderlyUser(elderlyData);
      } catch (error) {
        console.error("ユーザー取得エラー:", error);
        Alert.alert("エラー", "ユーザー情報を取得できませんでした。");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [navigation]);

  // --------------------------------------------------
  // 写真を選択
  // --------------------------------------------------
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "写真へのアクセスが必要です",
          "端末の設定から写真へのアクセスを許可してください。"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("写真選択エラー:", error);
      Alert.alert("エラー", "写真を選択できませんでした。");
    }
  };

  // --------------------------------------------------
  // 画像をStorageへアップロード
  // --------------------------------------------------
  const uploadImage = async (customFileName?: string): Promise<string> => {
    if (!imageUri) return "";

    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("画像の読み込みに失敗しました"));
      xhr.responseType = "blob";
      xhr.open("GET", imageUri, true);
      xhr.send(null);
    });

    const fileName =
      customFileName ||
      `news/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

    const imageRef = ref(storage, fileName);

    await uploadBytes(imageRef, blob);

    // @ts-ignore
    blob.close?.();

    return await getDownloadURL(imageRef);
  };

  // --------------------------------------------------
  // NEWS送信
  // --------------------------------------------------
  const handleSend = async () => {
    if (!currentUser) {
      Alert.alert("エラー", "ユーザー情報がありません。");
      return;
    }

    if (!elderlyUser) {
      Alert.alert("送信できません", "送信先の高齢者が見つかりません。");
      return;
    }

    if (!imageUri) {
      Alert.alert("写真を選択してください", "ニュースに載せる写真を選んでください。");
      return;
    }

    try {
      setSending(true);

      // ① 共通の mediaId を発行
      const mediaId = `media_${Date.now()}`;
      const fileName = `news/${mediaId}.jpg`;

      // ② Storage へ画像をアップロード
      const mediaUrl = await uploadImage(fileName);

      // ③ Gemini AI で写真のタグを自動生成（AI①）
      console.log("Gemini AI による写真タグ付けを開始...");
      const tags = await generatePhotoTagsClient(imageUri);
      console.log("生成されたタグ:", tags);

      // ④ Gemini AI でおばあちゃん向けニュース見出し＆本文を自動生成（AI②）
      console.log("Gemini AI によるニュース生成を開始...");
      const newsContent = await generateNewsContentClient(tags, caption);
      console.log("生成されたニュース:", newsContent);

      const now = new Date().toISOString();

      // ⑤ Firestore の media コレクションに AIタグ付きで保存！
      await saveMediaWithId(mediaId, {
        url: mediaUrl,
        uploadedBy: currentUser.id,
        createdAt: now,
        type: "image",
        tags: tags,
        deliveryCount: 1,
        takenAt: now,
        caption: caption.trim(),
      });

      // ⑥ Firestore の news コレクションに AI見出し＆記事を保存しておばあちゃんへ配信！
      await saveNews({
        deliveredTo: elderlyUser.id,
        type: "family",
        title: newsContent.title,
        message: newsContent.message,
        mediaUrl: mediaUrl,
        isRead: false,
        isAiGeneratedImage: false,
        createdAt: now,
      });

      // 送信完了のプッシュ通知バナーを表示
      sendLocalNotification(
        "🎉 ニュースを届けました！",
        `見出し: 「${newsContent.title}」`
      );

      Alert.alert(
        "ニュースを届けました！",
        `見出し: 「${newsContent.title}」\n${elderlyUser.name || "おじいちゃん・おばあちゃん"}さんに無事届きました！`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );

      setImageUri("");
      setCaption("");
    } catch (error) {
      console.error("NEWS送信エラー:", error);
      Alert.alert("送信に失敗しました", "通信環境を確認してもう一度お試しください。");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>準備中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ヘッダー部（戻るボタン ＆ 送信先表示） */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={sending}
            >
              <Text style={styles.backButtonText}>← 戻る</Text>
            </TouchableOpacity>

            {elderlyUser && (
              <Text style={styles.destinationText}>
                宛先：{elderlyUser.name || "おじいちゃん・おばあちゃん"}
              </Text>
            )}
          </View>

          {/* 写真選択ボタン & プレビュー */}
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickImage}
            disabled={sending}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.imagePickerText}>ニュースに載せる写真を選ぶ</Text>
            )}
          </TouchableOpacity>

          {/* コメント入力 */}
          <TextInput
            style={styles.textInput}
            placeholder="コメントを入力（💡何も書かなければAIが考えます!）"
            placeholderTextColor={COLORS.textSecondary}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
            maxLength={200}
            editable={!sending}
          />

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.disabledButton]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>AIがニュースを作成中...</Text>
              </View>
            ) : (
              <Text style={styles.sendButtonText}>ニュースを届ける</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  destinationText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  imagePicker: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.disabled,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  textInput: {
    minHeight: 100,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 16,
  },
  sendButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
});