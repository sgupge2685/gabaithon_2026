import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

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

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import app from "../firebase/firebaseConfig";
import { COLORS } from "../constants/colors";
import { saveMedia, saveNews } from "../firebase/firestore";
import type { User } from "../types/User";

const auth = getAuth(app);
const db = getFirestore(app);
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
        const firebaseUser = auth.currentUser;

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
          Alert.alert("エラー", "この画面は家族側のみ利用できます。");
          return;
        }

        if (!myUser.familyGroupId) {
          Alert.alert(
            "家族未接続",
            "先に高齢者の方と接続してください。"
          );
          return;
        }

        // 同じfamilyGroupIdを持つ高齢者を取得
        const usersRef = collection(db, "users");

        const elderlyQuery = query(
          usersRef,
          where("familyGroupId", "==", myUser.familyGroupId),
          where("role", "==", "elderly"),
          limit(1)
        );

        const elderlySnapshot = await getDocs(elderlyQuery);

        if (elderlySnapshot.empty) {
          Alert.alert(
            "高齢者が見つかりません",
            "先に高齢者の方と家族接続をしてください。"
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
        Alert.alert(
          "エラー",
          "ユーザー情報を取得できませんでした。"
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

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
          "設定から写真へのアクセスを許可してください。"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
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

  const uploadImage = async (): Promise<string> => {
    if (!imageUri) {
      return "";
    }

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const fileName = `news/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.jpg`;

    const imageRef = ref(storage, fileName);

    await uploadBytes(imageRef, blob);

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
      Alert.alert(
        "送信できません",
        "送信先の高齢者が見つかりません。"
      );
      return;
    }

    if (!imageUri) {
      Alert.alert("写真を選択してください");
      return;
    }

    if (!caption.trim()) {
      Alert.alert(
        "コメントを入力してください",
        "写真に一言メッセージを添えてください。"
      );
      return;
    }

    try {
      setSending(true);

      // ① Storageへ写真アップロード
      const mediaUrl = await uploadImage();

      // ② Media保存
      await saveMedia({
        url: mediaUrl,
        uploadedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        type: "image",
        tags: [],
        deliveryCount: 1,
        takenAt: new Date().toISOString(),
        caption: caption.trim(),
      });

      // ③ NEWS保存
      await saveNews({
        deliveredTo: elderlyUser.id,
        type: "family",
        title: "今日の家族NEWS",
        message: caption.trim(),
        mediaUrl,
        isRead: false,
        isAiGeneratedImage: false,
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "送信しました",
        `${elderlyUser.name}さんにNEWSを届けました。`,
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

      Alert.alert(
        "送信に失敗しました",
        "もう一度お試しください。"
      );
    } finally {
      setSending(false);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.loadingText}>
          準備中...
        </Text>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // 画面
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          家族NEWSを送る
        </Text>

        {elderlyUser && (
          <Text style={styles.destinationText}>
            送信先：{elderlyUser.name}
          </Text>
        )}

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
            <>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.imagePickerText}>
                写真を選ぶ
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>
          家族からのひとこと
        </Text>

        <TextInput
          style={styles.textInput}
          placeholder="今日はこんなことがありました！"
          placeholderTextColor={COLORS.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
          textAlignVertical="top"
          maxLength={200}
          editable={!sending}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            sending && styles.disabledButton,
          ]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />
          ) : (
            <Text style={styles.sendButtonText}>
              📰 NEWSを送る
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },

  destinationText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },

  imagePicker: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.disabled,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 24,
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  cameraIcon: {
    fontSize: 50,
    marginBottom: 12,
  },

  imagePickerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },

  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },

  textInput: {
    minHeight: 140,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    lineHeight: 28,
    color: COLORS.text,
    marginBottom: 24,
  },

  sendButton: {
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  sendButtonText: {
    fontSize: 21,
    fontWeight: "bold",
    color: COLORS.white,
  },
});