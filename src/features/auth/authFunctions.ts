import { signOut as signOutWeb } from "firebase/auth";
import { getAuth as getNativeAuth, signOut as signOutNative } from "@react-native-firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth as webAuth } from "../../firebase/firebaseAuth";
import db from "../../firebase/firestore";

// ============================================================
// ユーザー情報
// ============================================================

export type UserRole =
  | "family"
  | "elderly";

// ============================================================
// 現在のユーザー取得（Native/Web両対応）
// ============================================================

export const getAppCurrentUser = () => {
  try {
    const nativeAuth = getNativeAuth();
    if (nativeAuth?.currentUser) {
      return nativeAuth.currentUser;
    }
  } catch (e) {}

  try {
    if (webAuth?.currentUser) {
      return webAuth.currentUser;
    }
  } catch (e) {}

  return null;
};

// ============================================================
// Firestoreへユーザー情報を保存
// ============================================================

/**
 * Firebase Authenticationのユーザー情報を
 * Firestore users/{uid} に保存する
 *
 * @param role ユーザーの役割
 * @param explicitUser ログイン直後に取得したUserオブジェクト（任意）
 */
export const saveUserProfile = async (
  role: UserRole,
  explicitUser?: any
): Promise<void> => {
  const user = explicitUser ?? getAppCurrentUser();

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
  return getAppCurrentUser();
};

// ============================================================
// ログイン状態確認
// ============================================================

/**
 * 現在ログインしているか確認する
 */
export const isLoggedIn = (): boolean => {
  return getAppCurrentUser() !== null;
};

// ============================================================
// ログアウト
// ============================================================

/**
 * 現在のユーザーをログアウトする
 */
export const logout = async (): Promise<void> => {
  try {
    try {
      await signOutNative(getNativeAuth());
    } catch (e) {}
    try {
      await signOutWeb(webAuth);
    } catch (e) {}

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