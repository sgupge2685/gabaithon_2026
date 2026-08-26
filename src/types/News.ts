export interface News {
  id: string;                         // NEWSの固有ID
  deliveredTo: string;                // 配信先（高齢者）のユーザーID（uploadedByと対になる命名）
  type: 'family' | 'prevention';      // NEWS種別（家族写真NEWS or 予防情報NEWS）
  title: string;                      // 画面に表示するタイトル（例：「今日の家族NEWS」「水分補給のお願い」）
  message: string;                    // メッセージ本文（家族コメント最優先、なければAI自動生成）
  mediaUrl: string;                   // 表示する家族写真、またはAIイラストのURL
  isRead: boolean;                    // 高齢者が読んだかどうかの既読判定（見守り用）
  reaction?: string;                  // 高齢者からのリアクション（例: "👍" など。未リアクションもあるため?で省略可）
  isAiGeneratedImage: boolean;        // 画像がAI生成イラスト（AI⑤）かどうか
  createdAt: string;                  // 配信日時
}
