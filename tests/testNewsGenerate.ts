import { generateNewsMessage } from '../src/services/newsGenerateService';
import { Media } from '../src/types/Media';

/**
 * AI② NEWS生成AI（タイトル＋本文 同時生成テスト）
 */
async function runTest() {
  console.log('========================================');
  console.log('🧪 AI② NEWS生成AI（タイトル＋本文）テスト開始');
  console.log('========================================\n');

  // --------------------------------------------------
  // テスト1：家族のコメントがある場合
  // --------------------------------------------------
  const photoWithCaption: Media = {
    id: 'photo_01',
    url: 'https://example.com/park.jpg',
    uploadedBy: 'user_1',
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    type: 'image',
    tags: ['公園', 'ブランコ', '子供', '笑顔'],
    caption: '今日は公園に行ってきたよ！すごく楽しそうだった！'
  };

  console.log('【テスト1：家族のコメントがある場合】');
  console.log(`📸 写真のタグ: [ ${photoWithCaption.tags.join(', ')} ]`);
  console.log(`💬 家族のコメント: 「${photoWithCaption.caption}」`);
  console.log('⏳ Gemini 3.6 でタイトルを生成中...');

  const result1 = await generateNewsMessage(photoWithCaption);

  console.log(`📰 生成されたタイトル: 「${result1.title}」`);
  console.log(`💬 実際の本文: 「${result1.message}」\n`);

  // --------------------------------------------------
  // テスト2：コメントがない場合①（麦茶・夏のタグ）
  // --------------------------------------------------
  const photoTea: Media = {
    id: 'photo_02',
    url: 'https://example.com/tea.jpg',
    uploadedBy: 'user_1',
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    type: 'image',
    tags: ['麦茶', '夏', '冷たい飲み物', '水分補給', 'テーブル'],
  };

  console.log('【テスト2：コメントなし（麦茶・夏のタグから自動生成）】');
  console.log(`📸 写真のタグ: [ ${photoTea.tags.join(', ')} ]`);
  console.log('⏳ Gemini 3.6 でタイトルと本文を生成中...');

  const result2 = await generateNewsMessage(photoTea);

  console.log(`📰 生成されたタイトル: 「${result2.title}」`);
  console.log(`💬 実際の本文: 「${result2.message}」\n`);

  // --------------------------------------------------
  // テスト3：コメントがない場合②（公園・ブランコのタグ）
  // --------------------------------------------------
  const photoPark: Media = {
    id: 'photo_03',
    url: 'https://example.com/park2.jpg',
    uploadedBy: 'user_1',
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    type: 'image',
    tags: ['公園', 'ブランコ', '子供', '笑顔', '外出'],
  };

  console.log('【テスト3：コメントなし（公園・ブランコのタグから自動生成）】');
  console.log(`📸 写真のタグ: [ ${photoPark.tags.join(', ')} ]`);
  console.log('⏳ Gemini 3.6 でタイトルと本文を生成中...');

  const result3 = await generateNewsMessage(photoPark);

  console.log(`📰 生成されたタイトル: 「${result3.title}」`);
  console.log(`💬 実際の本文: 「${result3.message}」\n`);

  console.log('========================================');
  console.log('🏁 すべてのテストが終了しました');
  console.log('========================================');
}

runTest();
