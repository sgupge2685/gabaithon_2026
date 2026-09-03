import * as Notifications from "expo-notifications";

// アプリ起動中でも通知バナーを表示する設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPresentAlert: true,
  }),
});

/**
 * 通知の初期権限リクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (error) {
    console.warn("通知権限取得エラー:", error);
    return false;
  }
}

let lastNotificationKey = "";
let lastNotificationTime = 0;

/**
 * ローカルプッシュ通知を画面上部に即座に表示する（重複防止ガード付き）
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  const now = Date.now();
  const key = `${title}:::${body}`;

  // 1.5秒以内の同一内容の通知は重複とみなしてスキップ！
  if (key === lastNotificationKey && now - lastNotificationTime < 1500) {
    console.log("重複通知をスキップしました:", title);
    return;
  }
  lastNotificationKey = key;
  lastNotificationTime = now;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // 即時表示
    });
  } catch (error) {
    console.error("通知表示エラー:", error);
  }
}

/**
 * ユーザーが通知バナーをタップした時のリスナーを設定する
 */
export function setupNotificationResponseListener(
  onNavigate: (screen: string, params?: any) => void
): () => void {
  const subscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { screen?: string; params?: any }
        | undefined;
      if (data?.screen) {
        console.log("通知タップ検知 ➡️ 画面遷移:", data.screen);
        onNavigate(String(data.screen), data.params);
      }
    });

  return () => subscription.remove();
}
