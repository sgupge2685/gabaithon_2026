export interface User {
  id: string;                         // ユーザー固有ID（Firebase UID）
  name: string;                       // 表示名（例：「おじいちゃん」「たろう」）
  role: 'elderly' | 'family';         // ロール（高齢者側 or 家族側）
  familyGroupId: string;              // 所属する家族グループID
  location: string;                   // お住まいの地域（例: "東京都" など。AIが天気を調べるために必須）
  notificationEnabled: boolean;       // プッシュ通知設定（true / false）
  photoUrl?: string;                  // プロフィールアイコン画像のURL（未設定もあるため?で省略可）
  createdAt?: string;                 // アカウント作成日時（省略可）
}
