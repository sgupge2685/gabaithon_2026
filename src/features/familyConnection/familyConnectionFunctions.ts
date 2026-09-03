import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";

import { getAuth } from "@react-native-firebase/auth";

import * as Linking from "expo-linking";

import type {
  FamilyInvitation,
  FamilyConnection,
} from "./types/FamilyConnection";

// ============================================================
// Firebase
// ============================================================

const auth = getAuth();
const db = getFirestore();

// ============================================================
// 設定
// ============================================================

const INVITATION_EXPIRE_HOURS = 24;

// ============================================================
// 招待Token生成
// ============================================================

/**
 * 招待用のランダムTokenを生成する
 */
const generateInvitationToken = (): string => {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 12);

  const timestampPart =
    Date.now().toString(36);

  return `${timestampPart}-${randomPart}`;
};

// ============================================================
// 現在のユーザーUID取得
// ============================================================

/**
 * 現在ログインしている家族ユーザーのUIDを取得する
 */
const getCurrentFamilyUid = (): string => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "ログインしているユーザーが見つかりません。"
    );
  }

  return user.uid;
};

// ============================================================
// 招待リンク作成
// ============================================================

/**
 * 家族側：
 * 高齢者を招待するための招待リンクを作成する
 *
 * 招待情報の保存先:
 * familyInvitations/{token}
 *
 * @returns 招待URL
 */
export const createFamilyInvitation =
  async (): Promise<string> => {
    try {
      const familyUid =
        getCurrentFamilyUid();

      const token =
        generateInvitationToken();

      const now = new Date();

      const expiresAt = new Date(
        now.getTime() +
          INVITATION_EXPIRE_HOURS *
            60 *
            60 *
            1000
      );

      const invitationRef =
        doc(
          db,
          "familyInvitations",
          token
        );

      await setDoc(
        invitationRef,
        {
          familyUid,
          token,
          createdAt:
            serverTimestamp(),
          expiresAt,
          used: false,
        }
      );

      console.log(
        "家族招待データを作成しました:",
        token
      );

      // --------------------------------------------------
      // MAGONEWSのカスタムURL
      // --------------------------------------------------

      const invitationUrl =
        Linking.createURL(
          `invite/${token}`,
          {
            scheme: "magonews",
          }
        );

      console.log(
        "招待リンク:",
        invitationUrl
      );

      return invitationUrl;
    } catch (error) {
      console.error(
        "家族招待リンク作成エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// 招待情報取得
// ============================================================

/**
 * 招待Tokenから招待情報を取得する
 *
 * @param token 招待Token
 */
export const getFamilyInvitation =
  async (
    token: string
  ): Promise<
    FamilyInvitation | null
  > => {
    if (!token) {
      return null;
    }

    try {
      const invitationRef =
        doc(
          db,
          "familyInvitations",
          token
        );

      const snapshot =
        await getDoc(
          invitationRef
        );

      if (!snapshot.exists) {
        return null;
      }

      const data =
        snapshot.data();

      if (!data) {
        return null;
      }

      return {
        id: snapshot.id,
        familyUid:
          data.familyUid,
        token:
          data.token,
        createdAt:
          data.createdAt?.toDate?.()
            ?.toISOString?.() ?? "",
        expiresAt:
          data.expiresAt?.toDate?.()
            ?.toISOString?.() ?? "",
        used:
          data.used ?? false,
      };
    } catch (error) {
      console.error(
        "招待情報取得エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// 招待承認・家族接続
// ============================================================

/**
 * 高齢者側：
 * 招待リンクのTokenを使って家族と接続する
 *
 * @param invitationToken 招待Token
 */
export const acceptFamilyInvitation =
  async (
    invitationToken: string
  ): Promise<void> => {
    if (!invitationToken) {
      throw new Error(
        "招待情報がありません。"
      );
    }

    try {
      // --------------------------------------------------
      // 高齢者側の現在UID
      // --------------------------------------------------

      const elderlyUser =
        auth.currentUser;

      if (!elderlyUser) {
        throw new Error(
          "ログインしている高齢者ユーザーが見つかりません。"
        );
      }

      const elderlyUid =
        elderlyUser.uid;

      // --------------------------------------------------
      // 招待情報取得
      // --------------------------------------------------

      const invitationRef =
        doc(
          db,
          "familyInvitations",
          invitationToken
        );

      const invitationSnapshot =
        await getDoc(
          invitationRef
        );

      if (
        !invitationSnapshot.exists
      ) {
        throw new Error(
          "招待リンクが見つかりません。"
        );
      }

      const invitationData =
        invitationSnapshot.data();

      if (!invitationData) {
        throw new Error(
          "招待情報を取得できませんでした。"
        );
      }

      // --------------------------------------------------
      // 有効期限確認
      // --------------------------------------------------

      const expiresAt =
        invitationData.expiresAt
          ?.toDate?.();

      if (
        expiresAt &&
        expiresAt.getTime() <
          Date.now()
      ) {
        throw new Error(
          "この招待リンクは期限切れです。"
        );
      }

      // --------------------------------------------------
      // 使用済み確認
      // --------------------------------------------------

      if (
        invitationData.used === true
      ) {
        throw new Error(
          "この招待リンクはすでに使用されています。"
        );
      }

      // --------------------------------------------------
      // 家族UID確認
      // --------------------------------------------------

      const familyUid =
        invitationData.familyUid;

      if (!familyUid) {
        throw new Error(
          "招待元の家族情報が見つかりません。"
        );
      }

      // --------------------------------------------------
      // 接続情報
      // --------------------------------------------------

      const connectionId =
        `${familyUid}_${elderlyUid}`;

      const connectionData:
        FamilyConnection = {
        familyUid,
        elderlyUid,
        createdAt:
          new Date().toISOString(),
      };

      // --------------------------------------------------
      // familyConnections保存
      // --------------------------------------------------

      await setDoc(
        doc(
          db,
          "familyConnections",
          connectionId
        ),
        connectionData,
        {
          merge: true,
        }
      );

      console.log(
        "家族接続情報を保存しました:",
        connectionId
      );

      // --------------------------------------------------
      // 高齢者users情報更新
      // --------------------------------------------------

      await setDoc(
        doc(
          db,
          "users",
          elderlyUid
        ),
        {
          familyUid,
          role: "elderly",
          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "高齢者ユーザー情報を更新しました:",
        elderlyUid
      );

      // --------------------------------------------------
      // 招待を使用済みにする
      // --------------------------------------------------

      await setDoc(
        invitationRef,
        {
          used: true,
          usedBy: elderlyUid,
          usedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        "家族との接続が完了しました:",
        familyUid,
        elderlyUid
      );
    } catch (error) {
      console.error(
        "家族接続エラー:",
        error
      );

      throw error;
    }
  };