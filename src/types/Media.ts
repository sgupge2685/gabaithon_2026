export interface Media {
  id: string;              // 写真の固有ID（例: "photo_123"）
  userId: string;          // 投稿した家族のユーザーID
  url: string;             // 写真の保存先URL（ネット上の画像リンク）
  type: 'image';           // メディア種別（画像のみ）
  caption?: string;        // 家族がつけた一言コメント（省略可）
  takenAt: string;         // 写真を撮影した日時
  uploadedAt: string;      // アプリにアップロードした日時
  tags: string[];          // AIが認識したタグ（例: ["麦茶", "夏", "孫"]）
  deliveryCount: number;   // これまでにNEWSとして配信された回数
}
