import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  sendVerificationCode,
  verifyVerificationCode,
} from "../features/auth/phoneAuthFunctions";

import {
  saveUserProfile,
} from "../features/auth/authFunctions";

import { COLORS } from "../constants/colors";

type UserRole = "family" | "elderly";

interface LoginScreenProps {
  navigation: any;
  route: {
    params?: {
      role?: UserRole;
    };
  };
}

export default function LoginScreen({
  navigation,
  route,
}: LoginScreenProps) {
  // ============================================================
  // 選択された役割
  // ============================================================

  const role: UserRole =
    route?.params?.role ?? "family";

  // ============================================================
  // State
  // ============================================================

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [verificationCode, setVerificationCode] =
    useState("");

  const [confirmation, setConfirmation] =
    useState<any>(null);

  const [step, setStep] = useState<
    "phone" | "verification"
  >("phone");

  const [loading, setLoading] =
    useState(false);

  // ============================================================
  // 電話番号を日本の国際形式へ変換
  // ============================================================

  const normalizePhoneNumber = (
    phone: string
  ): string => {
    const cleaned =
      phone.replace(/[-\s]/g, "");

    // 09012345678
    // ↓
    // +819012345678

    if (cleaned.startsWith("0")) {
      return `+81${cleaned.substring(1)}`;
    }

    // すでに +81 などの場合
    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    return cleaned;
  };

  // ============================================================
  // SMS認証コード送信
  // ============================================================

  const handleSendVerificationCode =
    async () => {
      Keyboard.dismiss();

      const normalizedPhone =
        normalizePhoneNumber(
          phoneNumber
        );

      if (!normalizedPhone) {
        Alert.alert(
          "入力エラー",
          "電話番号を入力してください。"
        );

        return;
      }

      try {
        setLoading(true);

        const result =
          await sendVerificationCode(
            normalizedPhone
          );

        // SMS認証情報を保存
        setConfirmation(result);

        // 認証コード入力画面へ
        setStep("verification");

        Alert.alert(
          "確認コードを送信しました",
          "SMSで届いた6桁の確認コードを入力してください。"
        );
      } catch (error) {
        console.error(
          "SMS送信エラー:",
          error
        );

        Alert.alert(
          "SMS送信失敗",
          error instanceof Error
            ? error.message
            : "確認コードの送信に失敗しました。"
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // 認証コード確認
  // ============================================================

  const handleVerifyCode =
    async () => {
      Keyboard.dismiss();

      if (!confirmation) {
        Alert.alert(
          "エラー",
          "認証情報がありません。もう一度電話番号を入力してください。"
        );

        setStep("phone");

        return;
      }

      if (
        verificationCode.trim().length !==
        6
      ) {
        Alert.alert(
          "入力エラー",
          "6桁の確認コードを入力してください。"
        );

        return;
      }

      try {
        setLoading(true);

        // ======================================================
        // Firebase Authentication
        // ======================================================

        const user =
          await verifyVerificationCode(
            confirmation,
            verificationCode.trim()
          );

        console.log(
          "電話番号認証成功"
        );

        console.log(
          "Firebase UID:",
          user.uid
        );

        console.log(
          "電話番号:",
          user.phoneNumber
        );

        // ======================================================
        // Firestore users/{uid} にユーザー情報保存
        // ======================================================

        await saveUserProfile(
          role
        );

        console.log(
          "ユーザープロフィール保存成功"
        );

        // ======================================================
        // 役割に応じて画面遷移
        // ======================================================

        if (role === "family") {
          navigation.replace(
            "FamilyHome"
          );
        } else {
          navigation.replace(
            "Home"
          );
        }
      } catch (error) {
        console.error(
          "電話番号認証エラー:",
          error
        );

        Alert.alert(
          "認証失敗",
          error instanceof Error
            ? error.message
            : "確認コードが正しくないか、認証に失敗しました。"
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // 電話番号入力画面
  // ============================================================

  if (step === "phone") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            MAGONEWS
          </Text>

          <Text style={styles.subtitle}>
            {role === "family"
              ? "家族ログイン"
              : "高齢者ログイン"}
          </Text>

          <Text style={styles.description}>
            電話番号を入力してログインしてください。
          </Text>

          <Text style={styles.label}>
            電話番号
          </Text>

          <TextInput
            style={styles.input}
            placeholder="例: 09012345678"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={phoneNumber}
            onChangeText={
              setPhoneNumber
            }
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!loading}
          />

          <Text style={styles.note}>
            SMSで6桁の確認コードを送信します。
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              loading &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleSendVerificationCode
            }
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator
                color={
                  COLORS.white
                }
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                SMSを送信する
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            disabled={loading}
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              戻る
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ============================================================
  // 認証コード入力画面
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          MAGONEWS
        </Text>

        <Text style={styles.subtitle}>
          SMS認証
        </Text>

        <Text style={styles.description}>
          {phoneNumber}
          {"\n"}
          に届いた6桁の確認コードを入力してください。
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.codeInput,
          ]}
          placeholder="123456"
          placeholderTextColor={
            COLORS.textSecondary
          }
          value={verificationCode}
          onChangeText={
            setVerificationCode
          }
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading &&
              styles.buttonDisabled,
          ]}
          onPress={
            handleVerifyCode
          }
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator
              color={
                COLORS.white
              }
            />
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              認証してログイン
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() => {
            setStep("phone");
            setConfirmation(
              null
            );
            setVerificationCode(
              ""
            );
          }}
          disabled={loading}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            電話番号の入力に戻る
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// Style
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    justifyContent: "center",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },

  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },

  input: {
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.disabled,
    borderRadius: 12,
    height: 58,
    paddingHorizontal: 16,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 12,
  },

  codeInput: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 26,
  },

  note: {
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginBottom: 20,
  },

  button: {
    backgroundColor:
      COLORS.primary,
    borderRadius: 12,
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
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
    marginTop: 20,
    alignItems: "center",
  },

  backButtonText: {
    color:
      COLORS.textSecondary,
    fontSize: 16,
  },
});