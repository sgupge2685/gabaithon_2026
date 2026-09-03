import {
  getAuth,
  signOut,
} from "@react-native-firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

// ============================================================
// ユーザー情報
// ============================================================

export type UserRole =
  | "family"
  | "elderly";

// ============================================================
// Firestoreへユーザー情報を保存
// ============================================================

/**
 * Firebase Authenticationのユーザー情報を
 * Firestore users/{uid} に保存する
 *
 * @param role ユーザーの役割
 * @param passedUser 認証成功時に取得したユーザー情報
 */
export const saveUserProfile = async (
  role: UserRole,
  passedUser?: {
    uid: string;
    phoneNumber?: string | null;
  }
): Promise<void> => {
  const auth =
    getAuth();

  const db =
    getFirestore();

  const user =
    passedUser ?? auth.currentUser;

  if (!user) {
    throw new Error(
      "ログインしているユーザーが見つかりません。"
    );
  }

  try {
    const userRef = doc(
      db,
      "users",
      user.uid
    );

    await setDoc(
      userRef,
      {
        phoneNumber:
          user.phoneNumber ?? "",
        role,
        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    console.log(
      "ユーザー情報をFirestoreに保存しました:",
      user.uid
    );
  } catch (error) {
    console.error(
      "ユーザー情報保存エラー:",
      error
    );

    throw error;
  }
};

// ============================================================
// 現在のユーザー取得
// ============================================================

/**
 * 現在ログインしているFirebaseユーザーを取得する
 */
export const getCurrentUser = () => {
  const auth =
    getAuth();

  return auth.currentUser;
};

/**
 * 現在ログインしているFirebaseユーザーを取得する
 *
 * 既存画面との互換性のために用意
 */
export const getAppCurrentUser =
  getCurrentUser;

// ============================================================
// ログイン状態確認
// ============================================================

/**
 * 現在ログインしているか確認する
 */
export const isLoggedIn = (): boolean => {
  const auth =
    getAuth();

  return auth.currentUser !== null;
};

// ============================================================
// ログアウト
// ============================================================

/**
 * 現在のユーザーをログアウトする
 */
export const logout = async (): Promise<void> => {
  try {
    const auth =
      getAuth();

    await signOut(
      auth
    );

    console.log(
      "ログアウトしました"
    );
  } catch (error) {
    console.error(
      "ログアウトエラー:",
      error
    );

    throw error;
  }
};