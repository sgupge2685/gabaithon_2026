import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import * as Linking from "expo-linking";

import db from "../../firebase/firestore";

import type {
  FamilyInvitation,
  FamilyConnection,
} from "./types/FamilyConnection";

// ============================================================
// 設定
// ============================================================

/**
 * 招待リンクの有効時間
 * 現在は24時間
 */
const INVITATION_EXPIRE_HOURS = 24;

// ============================================================
// 招待Token生成
// ============================================================

/**
 * ランダムな招待Tokenを生成する
 *
 * 例:
 * abc123xyz-8f3k2m1a
 */
const generateInvitationToken = (): string => {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 12);

  const timestampPart = Date.now().toString(36);

  return `${timestampPart}-${randomPart}`;
};

// ============================================================
// 家族招待リンク作成
// ============================================================

/**
 * 家族側：
 * 高齢者を招待するための招待リンクを作成する
 *
 * @param familyUid 招待する家族側ユーザーのUID
 * @returns 招待リンク
 */
export const createFamilyInvitation = async (
  familyUid: string
): Promise<string> => {
  if (!familyUid) {
    throw new Error(
      "家族側ユーザーのUIDが取得できません。"
    );
  }

  try {
    // 招待Tokenを生成
    const token = generateInvitationToken();

    // 現在時刻
    const now = new Date();

    // 24時間後を有効期限にする
    const expiresAt = new Date(
      now.getTime() +
        INVITATION_EXPIRE_HOURS * 60 * 60 * 1000
    );

    // Firestoreに保存するデータ
    const invitationData = {
      familyUid,
      token,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false,
    };

    // ========================================================
    // TokenをFirestoreのDocument IDとして使用
    // ========================================================

    const invitationRef = doc(
      db,
      "familyInvitations",
      token
    );

    await setDoc(
      invitationRef,
      invitationData
    );

    console.log(
      "家族招待データを作成しました:",
      token
    );

    // ========================================================
    // 招待リンクを生成
    // ========================================================

    /**
     * 例:
     * magonews://invite/abc123xyz
     */
    const invitationUrl =
      Linking.createURL(
        `invite/${token}`
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
 * @param token 招待リンクに含まれているToken
 * @returns 招待情報。存在しない場合はnull
 */
export const getFamilyInvitation = async (
  token: string
): Promise<FamilyInvitation | null> => {
  if (!token) {
    return null;
  }

  try {
    // Token自体をDocument IDとして使用
    const invitationRef = doc(
      db,
      "familyInvitations",
      token
    );

    const snapshot =
      await getDoc(invitationRef);

    if (!snapshot.exists()) {
      console.log(
        "招待情報が見つかりません:",
        token
      );

      return null;
    }

    const data =
      snapshot.data();

    const invitation: FamilyInvitation = {
      id: snapshot.id,
      familyUid: data.familyUid,
      token: data.token,
      createdAt:
        data.createdAt
          ?.toDate?.()
          ?.toISOString() ?? "",
      expiresAt:
        data.expiresAt
          ?.toDate?.()
          ?.toISOString() ?? "",
      used:
        data.used ?? false,
    };

    console.log(
      "招待情報を取得しました:",
      invitation
    );

    return invitation;
  } catch (error) {
    console.error(
      "招待情報取得エラー:",
      error
    );

    throw error;
  }
};

// ============================================================
// 家族との接続
// ============================================================

/**
 * 高齢者側：
 * 招待を承認して家族と接続する
 *
 * @param invitationToken 招待リンクから取得したToken
 * @param elderlyUid 高齢者側ユーザーのUID
 */
export const acceptFamilyInvitation = async (
  invitationToken: string,
  elderlyUid: string
): Promise<void> => {
  if (!invitationToken) {
    throw new Error(
      "招待情報がありません。"
    );
  }

  if (!elderlyUid) {
    throw new Error(
      "高齢者側ユーザーのUIDが取得できません。"
    );
  }

  try {
    // ========================================================
    // 招待情報を取得
    // ========================================================

    const invitationRef = doc(
      db,
      "familyInvitations",
      invitationToken
    );

    const invitationSnapshot =
      await getDoc(invitationRef);

    if (!invitationSnapshot.exists()) {
      throw new Error(
        "招待リンクが見つかりません。"
      );
    }

    const invitationData =
      invitationSnapshot.data();

    // ========================================================
    // 招待の有効性確認
    // ========================================================

    const now = new Date();

    const expiresAt =
      invitationData.expiresAt?.toDate?.();

    // 有効期限確認
    if (
      expiresAt &&
      expiresAt.getTime() < now.getTime()
    ) {
      throw new Error(
        "この招待リンクは期限切れです。"
      );
    }

    // 使用済み確認
    if (invitationData.used) {
      throw new Error(
        "この招待リンクはすでに使用されています。"
      );
    }

    // 招待元の家族UID
    const familyUid =
      invitationData.familyUid;

    if (!familyUid) {
      throw new Error(
        "招待元の家族情報が見つかりません。"
      );
    }

    // ========================================================
    // 接続データ作成
    // ========================================================

    const connectionData: FamilyConnection = {
      familyUid,
      elderlyUid,
      createdAt:
        now.toISOString(),
    };

    // ========================================================
    // familyConnectionsに保存
    // ========================================================

    const connectionId =
      `${familyUid}_${elderlyUid}`;

    await setDoc(
      doc(
        db,
        "familyConnections",
        connectionId
      ),
      connectionData
    );

    console.log(
      "家族接続情報を保存しました:",
      connectionId
    );

    // ========================================================
    // 高齢者ユーザーにfamilyUidを保存
    // ========================================================

    await setDoc(
      doc(
        db,
        "users",
        elderlyUid
      ),
      {
        familyUid,
      },
      {
        merge: true,
      }
    );

    console.log(
      "高齢者ユーザーにfamilyUidを保存しました:",
      elderlyUid
    );

    // ========================================================
    // 招待を使用済みにする
    // ========================================================

    await setDoc(
      invitationRef,
      {
        used: true,
      },
      {
        merge: true,
      }
    );

    console.log(
      "招待リンクを使用済みにしました:",
      invitationToken
    );

    console.log(
      "家族との接続が完了しました:",
      familyUid
    );
  } catch (error) {
    console.error(
      "家族接続エラー:",
      error
    );

    throw error;
  }
};