import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";

import { auth } from "../../firebase/firebaseAuth";
import db from "../../firebase/firestore";

// ============================================================
// 通知表示の設定
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================================
// Expo Project ID取得
// ============================================================

const getExpoProjectId = (): string => {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      "Expo Project IDが取得できません。app.jsonのEAS設定を確認してください。"
    );
  }

  return projectId;
};

// ============================================================
// 通知許可取得
// ============================================================

/**
 * 通知の使用許可を取得する
 *
 * @returns 通知が許可されていればtrue
 */
export const requestNotificationPermission =
  async (): Promise<boolean> => {
    if (!Device.isDevice) {
      throw new Error(
        "プッシュ通知は実機で確認してください。"
      );
    }

    try {
      const {
        status: existingStatus,
      } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const {
          status,
        } =
          await Notifications.requestPermissionsAsync();

        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log(
          "通知の許可がありません"
        );

        return false;
      }

      console.log(
        "通知の許可を取得しました"
      );

      return true;
    } catch (error) {
      console.error(
        "通知許可取得エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// Android通知チャンネル設定
// ============================================================

/**
 * Android用通知チャンネルを設定する
 */
export const setupAndroidNotificationChannel =
  async (): Promise<void> => {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "MAGONEWS通知",
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [
            0,
            250,
            250,
            250,
          ],
          sound: "default",
        }
      );

      console.log(
        "Android通知チャンネルを設定しました"
      );
    } catch (error) {
      console.error(
        "Android通知チャンネル設定エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// Expo Push Token取得
// ============================================================

/**
 * Expo Push Tokenを取得する
 *
 * @returns Expo Push Token
 */
export const getExpoPushToken =
  async (): Promise<string> => {
    if (!Device.isDevice) {
      throw new Error(
        "Expo Push Tokenは実機で取得してください。"
      );
    }

    try {
      const projectId =
        getExpoProjectId();

      const token =
        await Notifications.getExpoPushTokenAsync({
          projectId,
        });

      console.log(
        "Expo Push Token:",
        token.data
      );

      return token.data;
    } catch (error) {
      console.error(
        "Expo Push Token取得エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// Expo Push TokenをFirestoreへ保存
// ============================================================

/**
 * 現在ログインしているユーザーの
 * Firestore users/{uid} にExpo Push Tokenを保存する
 *
 * 保存先:
 * users/{uid}
 *
 * フィールド:
 * expoPushToken
 *
 * @param pushToken Expo Push Token
 */
export const saveExpoPushToken =
  async (
    pushToken: string
  ): Promise<void> => {
    if (!pushToken) {
      throw new Error(
        "Expo Push Tokenがありません。"
      );
    }

    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        "ログインしていないためPush Tokenを保存できません。"
      );
    }

    try {
      const userRef =
        doc(
          db,
          "users",
          user.uid
        );

      await setDoc(
        userRef,
        {
          expoPushToken: pushToken,
        },
        {
          merge: true,
        }
      );

      console.log(
        "Expo Push TokenをFirestoreに保存しました:",
        user.uid
      );
    } catch (error) {
      console.error(
        "Expo Push TokenのFirestore保存エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// 通知初期化
// ============================================================

/**
 * 通知機能を初期化する
 *
 * 1. Android通知チャンネル設定
 * 2. 通知許可取得
 * 3. Expo Push Token取得
 * 4. FirestoreへToken保存
 *
 * @returns Expo Push Token
 */
export const initializeNotifications =
  async (): Promise<string | null> => {
    try {
      // Android通知チャンネル設定
      await setupAndroidNotificationChannel();

      // 通知許可取得
      const hasPermission =
        await requestNotificationPermission();

      if (!hasPermission) {
        return null;
      }

      // Expo Push Token取得
      const token =
        await getExpoPushToken();

      // Firestoreへ保存
      await saveExpoPushToken(
        token
      );

      console.log(
        "通知初期化完了"
      );

      return token;
    } catch (error) {
      console.error(
        "通知初期化エラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// 通知受信Listener
// ============================================================

/**
 * アプリ起動中に通知を受信したときのListener
 */
export const addNotificationReceivedListener =
  (
    callback: (
      notification: Notifications.Notification
    ) => void
  ) => {
    return Notifications.addNotificationReceivedListener(
      callback
    );
  };

// ============================================================
// 通知タップListener
// ============================================================

/**
 * 通知をタップしたときのListener
 */
export const addNotificationResponseListener =
  (
    callback: (
      response: Notifications.NotificationResponse
    ) => void
  ) => {
    return Notifications.addNotificationResponseReceivedListener(
      callback
    );
  };

// ============================================================
// ローカル通知テスト
// ============================================================

/**
 * 端末内でテスト通知を発生させる
 *
 * ※リモート通知ではない
 */
export const sendLocalTestNotification =
  async (): Promise<void> => {
    try {
      const hasPermission =
        await requestNotificationPermission();

      if (!hasPermission) {
        throw new Error(
          "通知が許可されていません。"
        );
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "MAGONEWS",
          body: "今日の家族NEWSが届きました！",
          data: {
            type: "news",
            newsId: "test-news-id",
          },
          sound: "default",
        },
        trigger: null,
      });

      console.log(
        "ローカル通知を発生させました"
      );
    } catch (error) {
      console.error(
        "ローカル通知テストエラー:",
        error
      );

      throw error;
    }
  };

// ============================================================
// 通知設定確認
// ============================================================

/**
 * 現在の通知許可状態を取得する
 */
export const getNotificationPermissionStatus =
  async (): Promise<Notifications.PermissionStatus> => {
    const {
      status,
    } =
      await Notifications.getPermissionsAsync();

    console.log(
      "現在の通知許可状態:",
      status
    );

    return status;
  };