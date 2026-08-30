import { Media } from '../types/Media';

/**
 * AI① 写真選択AI
 * 家族の写真ライブラリから、優先度の高い写真を指定した枚数（デフォルト1枚）選ぶ
 * 
 * 優先順位:
 *   1. 新しい写真（投稿日付が新しいものを最優先）
 *   2. 未配信の写真（deliveryCount が 0）
 *   3. 重要度（※未実装・今後検討）
 *   4. 画面での見やすさ（※未実装・今後検討）
 *   5. 過去の重複回避（配信回数が少ないものを優先）
 * 
 * @param photos 家族が投稿した全写真の配列
 * @param count 選びたい枚数（省略時は 1枚）
 * @returns 選ばれた写真の配列
 */
export function selectPhotos(photos: Media[], count: number = 1): Media[] {
  // 写真が1枚もなければ、空の配列 [] を返す
  if (photos.length === 0) {
    return [];
  }

  // 優先順位に従って並び替える
  const sorted = [...photos].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();

    // 日付部分（年月日）を比較
    const dateA = new Date(a.createdAt).toDateString();
    const dateB = new Date(b.createdAt).toDateString();

    if (dateA !== dateB) {
      // ① 日付が違うなら、新しい写真の勝ち！
      return timeA > timeB ? -1 : 1;

    } else if ((a.deliveryCount === 0) !== (b.deliveryCount === 0)) {
      // ② 同じ日付で、片方だけ「未配信（0回）」なら、未配信の勝ち！
      return a.deliveryCount === 0 ? -1 : 1;

    } else if (a.deliveryCount !== b.deliveryCount) {
      // ⑤ どちらも配信済みなら、「配信回数が少ない方」の勝ち！（重複回避）
      return a.deliveryCount < b.deliveryCount ? -1 : 1;

    } else {
      // すべて同じなら、細かい時間が新しい方の勝ち！
      return timeA > timeB ? -1 : 1;
    }
  });

  // 上位から指定された枚数を切り取って返す
  return sorted.slice(0, count);
}
