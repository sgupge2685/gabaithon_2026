export interface Media {
  id: string;                         // 写真の固有ID
  url: string;                        // 写真のURL
  uploadedBy: string;                 // 投稿者のUID
  createdAt: string;                  // 投稿日時
  type: 'image' | 'AIimage';          // メディア種別（通常画像 or AI生成画像）
  tags: string[];                     // タグ（AI④ 画像選択で使用）
  deliveryCount: number;              // 配信回数（AI① 重複回避で使用）
  
  // 「?」は省略可能（データがなくてもエラーにならない）という意味
  takenAt?: string;                   // 撮影日時（AI① 最新優先で使用。スクショ等で撮影日時が取得できない場合もあるため?で省略可）
  caption?: string;                   // 家族のコメント（コメントを書かずに写真だけ投稿する場合もあるため?で省略可）
}
