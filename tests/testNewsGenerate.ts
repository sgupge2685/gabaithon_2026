import { generateNewsMessage } from '../src/services/newsGenerateService';
import { Media } from '../src/types/Media';

/**
 * AI② NEWS生成AI（単体動作テスト）
 * 「タグから適切な紹介文が生成されるか」をテストします
 */
async function runTest() {
  console.log('========================================');
  console.log('🧪 AI② NEWS生成AI 単体動作テスト開始');
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
    tags: ['公園', 'ブランコ', '孫'],
    caption: '今日は公園に行ってきたよ！すごく楽しそうだった！'
  };

  console.log('【テスト1：家族のコメントがある場合（そのまま届くか）】');
  console.log(`📸 写真のタグ: [ ${photoWithCaption.tags.join(', ')} ]`);
  console.log(`💬 家族のコメント: 「${photoWithCaption.caption}」`);
  const result1 = await generateNewsMessage(photoWithCaption);
  console.log(`📤 出力結果: 「${result1}」\n`);

  // --------------------------------------------------
  // テスト2：コメントがない場合①（麦茶・水分補給のタグ）
  // --------------------------------------------------
  const photoTea: Media = {
    id: 'photo_02',
    url: 'https://example.com/tea.jpg',
    uploadedBy: 'user_1',
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    type: 'image',
    tags: ['麦茶', '夏', '冷たい飲み物', '水分補給'],
  };

  console.log('【テスト2：コメントなし（自動生成）】');
  console.log(`📸 写真のタグ: [ ${photoTea.tags.join(', ')} ]`);
  console.log('⏳ Gemini 3.6 で文章を生成中...');
  const result2 = await generateNewsMessage(photoTea);
  console.log(`📤 出力結果: 「${result2}」\n`);

  // --------------------------------------------------
  // テスト3：コメントがない場合②（公園・孫のタグ）
  // --------------------------------------------------
  const photoPark: Media = {
    id: 'photo_03',
    url: 'https://example.com/park2.jpg',
    uploadedBy: 'user_1',
    createdAt: new Date().toISOString(),
    deliveryCount: 0,
    type: 'image',
    tags: ['公園', 'ブランコ', '家族', '笑顔', '外出'],
  };

  console.log('【テスト3：コメントなし（自動生成）】');
  console.log(`📸 写真のタグ: [ ${photoPark.tags.join(', ')} ]`);
  console.log('⏳ Gemini 3.6 で文章を生成中...');
  const result3 = await generateNewsMessage(photoPark);
  console.log(`📤 出力結果: 「${result3}」\n`);

  console.log('========================================');
  console.log('🏁 すべてのテストが終了しました');
  console.log('========================================');
}

runTest();
