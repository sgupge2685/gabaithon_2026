import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

import app from "../firebase/firebaseConfig";
import { COLORS } from "../constants/colors";
import type { User } from "../types/User";

const auth = getAuth(app);
const db = getFirestore(app);

// --------------------------------------------------
// 家族グループID（接続コード）をランダム生成
// 誤認しやすい I, O, 0, 1 は除外
// --------------------------------------------------
const generateFamilyGroupId = (): string => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

// --------------------------------------------------
// AddFamilyScreen
// --------------------------------------------------
export default function AddFamilyScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [familyCode, setFamilyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // --------------------------------------------------
  // 現在のユーザー情報を取得
  // 高齢者側（role === "elderly"）で未採番の場合のみIDを自動生成
  // --------------------------------------------------
  useEffect(() => {
    const loadUser = async () => {
      try {
        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
          Alert.alert("エラー", "ログイン中のユーザーが見つかりません。");
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          Alert.alert("エラー", "ユーザー情報が見つかりません。");
          return;
        }

        const userData = {
          id: snapshot.id,
          ...snapshot.data(),
        } as User;

        // 高齢者側のユーザーで、まだ固有のグループIDを持っていない場合は自動生成して保存
        if (userData.role === "elderly" && !userData.familyGroupId) {
          const newFamilyGroupId = generateFamilyGroupId();

          await updateDoc(userRef, {
            familyGroupId: newFamilyGroupId,
          });

          userData.familyGroupId = newFamilyGroupId;
        }

        setCurrentUser(userData);
      } catch (error) {
        console.error("ユーザー情報の取得に失敗しました:", error);
        Alert.alert("エラー", "ユーザー情報を取得できませんでした。");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // --------------------------------------------------
  // 家族側：高齢者から教えてもらったコードを入力して接続
  // --------------------------------------------------
  const handleConnect = async () => {
    Keyboard.dismiss();

    const code = familyCode.trim().toUpperCase();

    if (!code) {
      Alert.alert("入力してください", "家族グループIDを入力してください。");
      return;
    }

    if (code.length !== 6) {
      Alert.alert("入力エラー", "家族グループIDは6文字です。");
      return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !currentUser) {
      Alert.alert("エラー", "ログイン中のユーザーが見つかりません。");
      return;
    }

    // 既に所属しているIDと同じ場合のチェック
    if (currentUser.familyGroupId === code) {
      Alert.alert("案内", "すでにこの家族グループに接続されています。");
      return;
    }

    try {
      setConnecting(true);

      // 高齢者側（role: "elderly"）が発行したコードが存在するか検証
      const usersRef = collection(db, "users");
      const elderlyQuery = query(
        usersRef,
        where("familyGroupId", "==", code),
        where("role", "==", "elderly"),
        limit(1)
      );

      const elderlySnapshot = await getDocs(elderlyQuery);

      if (elderlySnapshot.empty) {
        Alert.alert(
          "高齢者の方が見つかりません",
          "入力したコードを確認してください。高齢者側の画面に表示されている6文字と一致している必要があります。"
        );
        return;
      }

      // 家族側のドキュメントに同じ familyGroupId を登録
      const myUserRef = doc(db, "users", firebaseUser.uid);
      await updateDoc(myUserRef, {
        familyGroupId: code,
      });

      // ローカルStateの更新
      setCurrentUser((prev) => (prev ? { ...prev, familyGroupId: code } : null));
      setFamilyCode("");

      Alert.alert("接続完了", "高齢者の方と家族グループとしてつながりました！");
    } catch (error) {
      console.error("家族との接続に失敗しました:", error);
      Alert.alert("接続に失敗しました", "もう一度お試しください。");
    } finally {
      setConnecting(false);
    }
  };

  // --------------------------------------------------
  // ローディング
  // --------------------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // --------------------------------------------------
  // ユーザー情報がない
  // --------------------------------------------------
  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          ユーザー情報を取得できませんでした。
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // 画面描画
  // --------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.title}>家族とつながる</Text>

        <Text style={styles.roleText}>
          {currentUser.role === "elderly" ? "高齢者側" : "家族側"}
        </Text>

        {/* ==================================================
            高齢者側：自分の接続コードを表示する
            ================================================== */}
        {currentUser.role === "elderly" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>あなたの接続コード</Text>

            <Text style={styles.description}>
              この6文字のコードをご家族に教えてください。
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{currentUser.familyGroupId}</Text>
            </View>

            <Text style={styles.helperText}>
              ご家族がスマホでこのコードを入力すると、{"\n"}
              あなた宛てにニュースが届くようになります。
            </Text>
          </View>
        )}

        {/* ==================================================
            家族側：高齢者のコードを入力して接続する
            ================================================== */}
        {currentUser.role === "family" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>接続コードを入力</Text>

            <Text style={styles.description}>
              高齢者の方のアプリ画面に表示されている{"\n"}
              「6文字の接続コード」を入力してください。
            </Text>

            <TextInput
              style={styles.input}
              placeholder="例：A7K29P"
              placeholderTextColor={COLORS.textSecondary}
              value={familyCode}
              onChangeText={setFamilyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!connecting}
            />

            <TouchableOpacity
              style={[
                styles.button,
                connecting && styles.buttonDisabled,
              ]}
              onPress={handleConnect}
              disabled={connecting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="家族とつながる"
            >
              {connecting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>家族とつながる</Text>
              )}
            </TouchableOpacity>

            {currentUser.familyGroupId ? (
              <View style={styles.connectedStatusBox}>
                <Text style={styles.connectedStatusText}>
                  現在の接続中グループID:{" "}
                  <Text style={styles.connectedStatusCode}>
                    {currentUser.familyGroupId}
                  </Text>
                </Text>
              </View>
            ) : null}

            <Text style={styles.helperText}>
              お父さん、お母さん、お子さんなど、複数のご家族全員が同じコードを入力してつながることができます。
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

// --------------------------------------------------
// Styles
// --------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  roleText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
  },
  section: {
    alignItems: "center",
    width: "100%",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  codeBox: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 20,
  },
  codeText: {
    fontSize: 34,
    fontWeight: "bold",
    color: COLORS.primary,
    letterSpacing: 6,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 60,
    width: "100%",
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 4,
    color: COLORS.text,
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 60,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  connectedStatusBox: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.disabled,
  },
  connectedStatusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  connectedStatusCode: {
    fontWeight: "bold",
    color: COLORS.text,
  },
  helperText: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});