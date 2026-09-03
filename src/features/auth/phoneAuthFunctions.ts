import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
} from "@react-native-firebase/auth";

const auth = getAuth();

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

  try {
    const confirmation =
      await signInWithPhoneNumber(
        auth,
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