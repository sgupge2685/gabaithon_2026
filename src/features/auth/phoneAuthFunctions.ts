import {
  getAuth as getNativeAuth,
  signInWithPhoneNumber,
  signInAnonymously as signInAnonymouslyNative,
  type ConfirmationResult,
  type User,
} from "@react-native-firebase/auth";
import { signInAnonymously as signInAnonymouslyWeb } from "firebase/auth";
import { auth as webAuth } from "../../firebase/firebaseAuth";
import { Platform } from "react-native";

const nativeAuth = getNativeAuth();

// ============================================================
// SMS認証コード送信
// ============================================================

export const sendVerificationCode = async (
  phoneNumber: string
): Promise<ConfirmationResult> => {
  if (!phoneNumber) {
    throw new Error(
      "電話番号を入力してください。"
    );
  }

  // iOSシミュレータ環境（APNsやURL Schemeが不完全な環境）でのFirebase iOS SDKの
  // 内部アサーションクラッシュ（SIGTRAP）を防止するための開発用フォールバック
  if (__DEV__ && Platform.OS === "ios") {
    console.log(
      `[DEV] シミュレータ環境用: 電話番号 ${phoneNumber} へのSMS送信をモックします。認証コード「123456」でログインできます。`
    );

    return {
      verificationId: "dev-test-verification-id",
      confirm: async (verificationCode: string) => {
        if (verificationCode !== "123456") {
          throw new Error(
            "確認コードが正しくありません。（開発テスト用コード: 123456）"
          );
        }

        // Web SDK と ネイティブ SDK の両方にログインセッションを作成する
        let loggedInUser: any = null;

        try {
          const webCred = await signInAnonymouslyWeb(webAuth);
          loggedInUser = webCred.user;
          console.log("[DEV] Web Firebase Auth ログイン成功:", loggedInUser.uid);
        } catch (e) {
          console.warn("[DEV] Web Firebase Auth 匿名ログイン失敗:", e);
        }

        try {
          const nativeCred = await signInAnonymouslyNative(nativeAuth);
          loggedInUser = loggedInUser ?? nativeCred.user;
          console.log("[DEV] Native Firebase Auth ログイン成功:", nativeCred.user?.uid);
        } catch (e) {
          console.warn("[DEV] Native Firebase Auth 匿名ログイン失敗:", e);
        }

        if (!loggedInUser) {
          loggedInUser = {
            uid: "dev_user_" + phoneNumber.replace(/\+/g, ""),
            phoneNumber,
          };
        }

        return {
          user: loggedInUser,
        } as any;
      },
    } as unknown as ConfirmationResult;
  }

  try {
    const confirmation =
      await signInWithPhoneNumber(
        nativeAuth,
        phoneNumber
      );

    console.log(
      "SMS認証コードを送信しました"
    );

    return confirmation;
  } catch (error) {
    console.error(
      "SMS認証コード送信エラー:",
      error
    );

    throw error;
  }
};

// ============================================================
// SMS認証コード確認
// ============================================================

export const verifyVerificationCode =
  async (
    confirmation: ConfirmationResult,
    verificationCode: string
  ): Promise<User> => {
    if (!verificationCode) {
      throw new Error(
        "認証コードを入力してください。"
      );
    }

    try {
      const result =
        await confirmation.confirm(
          verificationCode
        );

      console.log(
        "電話番号認証に成功しました:",
        result.user.uid
      );

      return result.user;
    } catch (error) {
      console.error(
        "認証コード確認エラー:",
        error
      );

      throw error;
    }
  };