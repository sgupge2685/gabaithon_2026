import { selectPhotos } from '../src/services/photoSelectService';
import { Media } from '../src/types/Media';

/**
 * AI① 写真選択AI（selectPhotos）の動作確認テスト
 * 
 * 逆順（最悪の並び順）のデータから、正しく優先順位通りに選ばれるかをテストします。
 */

// 5枚の写真データをわざと「完全な逆順（最下位 → 1位）」で用意
const dummyPhotos: Media[] = [
  {
    id: '写真E',
    url: 'https://example.com/E.jpg',
    uploadedBy: 'user_1',
    createdAt: '2026-08-20T10:00:00Z', // 古い
    deliveryCount: 3,                  // 3回配信済み（最下位）
    type: 'image',
    tags: []
  },
  {
    id: '写真D',
    url: 'https://example.com/D.jpg',
    uploadedBy: 'user_1',
    createdAt: '2026-08-20T10:00:00Z', // 古い
    deliveryCount: 0,                  // 未配信
    type: 'image',
    tags: []
  },
  {
    id: '写真C',
    url: 'https://example.com/C.jpg',
    uploadedBy: 'user_1',
    createdAt: '2026-08-25T10:00:00Z', // 一昨日
    deliveryCount: 0,                  // 未配信
    type: 'image',
    tags: []
  },
  {
    id: '写真B',
    url: 'https://example.com/B.jpg',
    uploadedBy: 'user_1',
    createdAt: '2026-08-27T10:00:00Z', // 今日
    deliveryCount: 1,                  // 1回配信済み
    type: 'image',
    tags: []
  },
  {
    id: '写真A',
    url: 'https://example.com/A.jpg',
    uploadedBy: 'user_1',
    createdAt: '2026-08-27T10:00:00Z', // 今日
    deliveryCount: 0,                  // 未配信（堂々の1位！）
    type: 'image',
    tags: []
  }
];

console.log('========================================');
console.log('🧪 AI① 写真選択AI 動作テスト開始');
console.log('========================================\n');

console.log('【1. 入力データ（わざと逆順に渡す）】');
dummyPhotos.forEach((p, i) => {
  console.log(`  ${i + 1}番目: ${p.id} (投稿日: ${p.createdAt.slice(0, 10)}, 配信回数: ${p.deliveryCount}回)`);
});

console.log('\n----------------------------------------');
console.log('【2. 1枚だけ選ぶテスト（通常の毎朝配信）】');
const result1 = selectPhotos(dummyPhotos, 1);
console.log(`  選ばれた写真: 🥇 ${result1[0].id}`);
if (result1[0].id === '写真A') {
  console.log('  👉 判定: 【合格】一番新しくて未配信の写真Aが正しく選ばれました！');
} else {
  console.log('  👉 判定: 【失敗】');
}

console.log('\n----------------------------------------');
console.log('【3. 3枚選ぶテスト（複数枚配信の将来対応）】');
const result3 = selectPhotos(dummyPhotos, 3);
console.log(`  1位: 🥇 ${result3[0]?.id}`);
console.log(`  2位: 🥈 ${result3[1]?.id}`);
console.log(`  3位: 🥉 ${result3[2]?.id}`);

if (result3[0]?.id === '写真A' && result3[1]?.id === '写真B' && result3[2]?.id === '写真C') {
  console.log('  👉 判定: 【合格】優先順位（A → B → C）通りに正しく選ばれました！');
} else {
  console.log('  👉 判定: 【失敗】');
}

console.log('\n========================================');
console.log('🎉 すべてのテストが完了しました');
console.log('========================================');
