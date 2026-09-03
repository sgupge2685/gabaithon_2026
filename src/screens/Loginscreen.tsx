import React, { useState } from "react";
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

import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import app from "../firebase/firebaseConfig";
import { COLORS } from "../constants/colors";

const auth = getAuth(app);
const db = getFirestore(app);

// 電話番号のハイフン・空白を除去して正規化
const normalizePhoneNumber = (phone: string) => {
  return phone.replace(/[-\s]/g, "");
};

export default function FamilyPhoneLoginScreen({ navigation }: any) {
  const [familyPhone, setFamilyPhone] = useState("");
  const [elderlyPhone, setElderlyPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  // ステップ管理: "input" (番号入力) -> "verify" (確認コード入力)
  const [step, setStep] = useState<"input" | "verify">("input");
  const [targetElderly, setTargetElderly] = useState<{ id: string; familyGroupId: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // ステップ1: 高齢者の電話番号存在確認 & SMS送信（デモ）
  // --------------------------------------------------
  const handleRequestVerification = async () => {
    Keyboard.dismiss();

    const cleanFamilyPhone = normalizePhoneNumber(familyPhone);
    const cleanElderlyPhone = normalizePhoneNumber(elderlyPhone);

    if (!cleanFamilyPhone || !cleanElderlyPhone) {
      Alert.alert("入力エラー", "家族と高齢者の両方の電話番号を入力してください。");
      return;
    }

    if (cleanFamilyPhone === cleanElderlyPhone) {
      Alert.alert("入力エラー", "ご家族と高齢者で異なる電話番号を入力してください。");
      return;
    }

    try {
      setLoading(true);

      // 高齢者の登録状況を電話番号で検索
      const usersRef = collection(db, "users");
      const elderlyQuery = query(
        usersRef,
        where("phoneNumber", "==", cleanElderlyPhone),
        where("role", "==", "elderly"),
        limit(1)
      );

      const querySnapshot = await getDocs(elderlyQuery);

      if (querySnapshot.empty) {
        Alert.alert(
          "高齢者が見つかりません",
          "指定された電話番号で登録された高齢者アカウントが見つかりません。先に高齢者側の初期登録を完了してください。"
        );
        return;
      }

      const elderlyDoc = querySnapshot.docs[0];
      const elderlyData = elderlyDoc.data();

      if (!elderlyData.familyGroupId) {
        Alert.alert(
          "未設定エラー",
          "高齢者側に家族グループIDがまだ発行されていません。高齢者端末で一度アプリを起動してください。"
        );
        return;
      }

      setTargetElderly({
        id: elderlyDoc.id,
        familyGroupId: elderlyData.familyGroupId,
      });

      // デモ用確認コードの案内
      Alert.alert("確認コード送信", "デモ用確認コード【123456】を入力してください。");
      setStep("verify");
    } catch (error) {
      console.error("検索エラー:", error);
      Alert.alert("エラー", "通信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // ステップ2: コード検証 & 家族アカウントへのID紐付け
  // --------------------------------------------------
  const handleVerifyAndLogin = async () => {
    Keyboard.dismiss();

    if (verificationCode.trim() !== "123456") {
      Alert.alert("認証エラー", "確認コードが正しくありません。（デモ用コード: 123456）");
      return;
    }

    if (!targetElderly) {
      Alert.alert("エラー", "連携先の高齢者情報が失われました。最初からやり直してください。");
      setStep("input");
      return;
    }

    try {
      setLoading(true);

      // デモ認証（Firebase 匿名認証で一時UIDを確保）
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;
      const cleanFamilyPhone = normalizePhoneNumber(familyPhone);

      // 家族ドキュメントに高齢者の familyGroupId を紐付けて保存
      const myUserRef = doc(db, "users", uid);
      await setDoc(
        myUserRef,
        {
          phoneNumber: cleanFamilyPhone,
          role: "family",
          familyGroupId: targetElderly.familyGroupId,
          connectedElderlyId: targetElderly.id,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        "ログイン完了",
        `高齢者と家族グループ（ID: ${targetElderly.familyGroupId}）として接続しました！`,
        [
          {
            text: "次へ",
            onPress: () => {
              if (navigation) {
                navigation.navigate("FamilyHome");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("ログイン連携エラー:", error);
      Alert.alert("エラー", "ログインおよび接続処理に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>家族ログイン</Text>
        <Text style={styles.subtitle}>電話番号でログインして高齢者とつながります</Text>

        {step === "input" ? (
          <View style={styles.formSection}>
            <Text style={styles.label}>あなたの電話番号（家族）</Text>
            <TextInput
              style={styles.input}
              placeholder="例: 09012345678"
              placeholderTextColor={COLORS.textSecondary}
              value={familyPhone}
              onChangeText={setFamilyPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <Text style={styles.label}>おじいちゃん・おばあちゃんの電話番号</Text>
            <TextInput
              style={styles.input}
              placeholder="例: 08098765432"
              placeholderTextColor={COLORS.textSecondary}
              value={elderlyPhone}
              onChangeText={setElderlyPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestVerification}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>確認コードを受け取る</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formSection}>
            <Text style={styles.label}>確認コード（デモコード: 123456）</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="123456"
              placeholderTextColor={COLORS.textSecondary}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyAndLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>ログインして接続する</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep("input")}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>電話番号の入力に戻る</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 36,
  },
  formSection: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 20,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
});