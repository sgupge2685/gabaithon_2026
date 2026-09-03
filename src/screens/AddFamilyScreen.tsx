import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";

import { SafeAreaView as SafeAreaViewContext } from "react-native-safe-area-context";

import {
  getAuth,
} from "@react-native-firebase/auth";
import { auth as webAuth } from "../firebase/firebaseAuth";

import {
  acceptFamilyInvitation,
} from "../features/familyConnection/familyConnectionFunctions";

import { COLORS } from "../constants/colors";

const auth = getAuth();

// --------------------------------------------------
// AddFamilyScreen
// --------------------------------------------------

export default function AddFamilyScreen({
  navigation,
  route,
}: any) {
  const [invitationToken, setInvitationToken] =
    useState<string | null>(null);

  const [manualToken, setManualToken] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [connecting, setConnecting] =
    useState(false);

  // --------------------------------------------------
  // Deep Linkから招待Tokenを取得
  // --------------------------------------------------

  useEffect(() => {
    try {
      const token =
        route?.params?.token;

      if (token) {
        setInvitationToken(
          token
        );
      }
    } catch (error) {
      console.error(
        "招待Tokenの取得に失敗しました:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [route]);

  // --------------------------------------------------
  // 家族との接続
  // --------------------------------------------------

  const handleConnect =
    async (tokenToUse?: string) => {
      const rawToken = (tokenToUse ?? manualToken ?? invitationToken ?? "").trim();
      // URLがそのまま貼られた場合でもトークンを抽出
      const effectiveToken = rawToken.includes("invite/")
        ? rawToken.split("invite/")[1].split("?")[0].replace(/\/$/, "")
        : rawToken;

      if (!effectiveToken) {
        Alert.alert(
          "招待コードがありません",
          "招待コードまたはリンクを入力してください。"
        );

        return;
      }

      const firebaseUser =
        auth.currentUser ?? webAuth.currentUser;

      if (!firebaseUser) {
        Alert.alert(
          "ログインしてください",
          "先に電話番号認証を完了してください。",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate(
                  "Login",
                  {
                    role: "elderly",
                  }
                ),
            },
          ]
        );

        return;
      }

      try {
        setConnecting(true);

        await acceptFamilyInvitation(
          effectiveToken
        );

        Alert.alert(
          "接続完了",
          "ご家族との連携が完了しました！",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.replace(
                  "Home"
                ),
            },
          ]
        );
      } catch (error) {
        console.error(
          "家族との接続に失敗しました:",
          error
        );

        Alert.alert(
          "接続に失敗しました",
          error instanceof Error
            ? error.message
            : "招待リンクの処理に失敗しました。"
        );
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
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          招待情報を確認しています...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // 招待リンクなし
  // --------------------------------------------------

  if (!invitationToken) {
    return (
      <SafeAreaViewContext
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            家族とつながる
          </Text>

          <Text
            style={
              styles.description
            }
          >
            ご家族から送られた招待コード（またはリンク）を入力して接続してください。
          </Text>

          {/* 招待コードの直接入力欄 */}
          <TextInput
            style={styles.input}
            placeholder="招待コードまたはURLを貼り付け"
            placeholderTextColor={COLORS.textSecondary}
            value={manualToken}
            onChangeText={setManualToken}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (!manualToken.trim() || connecting) &&
                styles.buttonDisabled,
            ]}
            onPress={() =>
              handleConnect(manualToken)
            }
            disabled={
              !manualToken.trim() || connecting
            }
            activeOpacity={0.8}
          >
            {connecting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                このコードで接続する
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              戻る
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaViewContext>
    );
  }

  // --------------------------------------------------
  // 招待確認画面
  // --------------------------------------------------

  return (
    <SafeAreaViewContext
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          家族からの招待
        </Text>

        <Text
          style={
            styles.description
          }
        >
          ご家族からMAGONEWSへの招待が届いています。
          {"\n\n"}
          この招待を承認すると、ご家族とつながります。
        </Text>

        <View
          style={styles.tokenBox}
        >
          <Text
            style={
              styles.tokenLabel
            }
          >
            招待Token
          </Text>

          <Text
            style={
              styles.tokenText
            }
          >
            {invitationToken}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            connecting &&
              styles.buttonDisabled,
          ]}
          onPress={() =>
            handleConnect()
          }
          disabled={connecting}
          activeOpacity={0.8}
        >
          {connecting ? (
            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              家族とつながる
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
          disabled={connecting}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            戻る
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaViewContext>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent:
      "center",
    alignItems: "center",
    backgroundColor:
      COLORS.background,
    padding: 24,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color:
      COLORS.textSecondary,
  },

  content: {
    flex: 1,
    justifyContent:
      "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },

  description: {
    fontSize: 16,
    lineHeight: 25,
    color:
      COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 28,
  },

  infoBox: {
    width: "100%",
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor:
      COLORS.disabled,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },

  infoText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 25,
    textAlign: "center",
  },

  input: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },

  tokenBox: {
    width: "100%",
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor:
      COLORS.primary,
    padding: 18,
    marginBottom: 24,
  },

  tokenLabel: {
    fontSize: 13,
    color:
      COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },

  tokenText: {
    fontSize: 15,
    color:
      COLORS.primary,
    fontWeight: "bold",
    textAlign: "center",
  },

  button: {
    width: "100%",
    height: 58,
    backgroundColor:
      COLORS.primary,
    borderRadius: 12,
    justifyContent:
      "center",
    alignItems: "center",
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