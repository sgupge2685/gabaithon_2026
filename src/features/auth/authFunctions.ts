import { signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "../../firebase/firebaseAuth";
import db from "../../firebase/firestore";

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
 */
export const saveUserProfile = async (
  role: UserRole
): Promise<void> => {
  const user =
    auth.currentUser;

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
  return auth.currentUser;
};

// ============================================================
// ログイン状態確認
// ============================================================

/**
 * 現在ログインしているか確認する
 */
export const isLoggedIn = (): boolean => {
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
    await signOut(auth);

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