// ============================================================
// Expo Push Notification Service
// ============================================================
//
// 現在は動作確認用としてアプリから直接Expo Push APIを呼び出します。
// 本番ではFirebase Functionsなどのサーバー側へ移します。
// ============================================================

const EXPO_PUSH_API_URL =
  "https://exp.host/--/api/v2/push/send";

// ============================================================
// 型
// ============================================================

export interface PushNotificationData {
  type?: string;
  newsId?: string;
  [key: string]: unknown;
}

export interface PushNotificationMessage {
  to: string;
  title: string;
  body: string;
  data?: PushNotificationData;
}

// ============================================================
// Expo Push APIへ通知送信
// ============================================================

/**
 * Expo Push Token宛にリモート通知を送信する
 *
 * @param message 通知内容
 * @returns Expo Push Ticket
 */
export const sendExpoPushNotification =
  async (
    message: PushNotificationMessage
  ) => {
    if (!message.to) {
      throw new Error(
        "Expo Push Tokenが指定されていません。"
      );
    }

    try {
      const response =
        await fetch(
          EXPO_PUSH_API_URL,
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
              "Accept-encoding":
                "gzip, deflate",
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              to: message.to,
              title: message.title,
              body: message.body,
              data: message.data ?? {},
              sound: "default",
            }),
          }
        );

      const result =
        await response.json();

      console.log(
        "Expo Push APIレスポンス:",
        result
      );

      if (!response.ok) {
        throw new Error(
          `Expo Push APIエラー: ${response.status}`
        );
      }

      if (
        result?.data?.status ===
        "error"
      ) {
        throw new Error(
          result.data.message ??
            "Expo Push通知の送信に失敗しました。"
        );
      }

      console.log(
        "リモート通知送信成功"
      );

      return result;
    } catch (error) {
      console.error(
        "リモート通知送信エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// MAGONEWS用通知
// ============================================================

/**
 * MAGONEWSのNEWS通知を送信する
 *
 * @param expoPushToken 送信先のExpo Push Token
 * @param newsId NEWS ID
 */
export const sendNewsPushNotification =
  async (
    expoPushToken: string,
    newsId: string
  ) => {
    return sendExpoPushNotification({
      to: expoPushToken,
      title: "MAGONEWS",
      body: "今日の家族NEWSが届きました！",
      data: {
        type: "news",
        newsId,
      },
    });
  };