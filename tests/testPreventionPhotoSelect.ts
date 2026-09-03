import { selectPhotoForPreventionNews } from '../src/services/preventionPhotoSelectService';
import { Media } from '../src/types/Media';
import { GeneratedNewsContent } from '../src/services/newsGenerateService';

async function runTest() {
  console.log('========================================');
  console.log('[テスト開始] 予防NEWS写真選択AI (preventionPhotoSelectService)');
  console.log('========================================\n');

  // テスト用の写真ライブラリ（Media[]）
  const samplePhotos: Media[] = [
    {
      id: 'photo_park_001',
      url: 'https://example.com/photos/park.jpg',
      uploadedBy: 'user_01',
      createdAt: '2026-08-01T10:00:00Z',
      type: 'image',
      tags: ['公園', 'すべり台', '外遊び'],
      deliveryCount: 0,
      caption: '公園で元気に遊んだよ！',
    },
    {
      id: 'photo_mugicha_002',
      url: 'https://example.com/photos/mugicha.jpg',
      uploadedBy: 'user_01',
      createdAt: '2026-08-05T14:00:00Z',
      type: 'image',
      tags: ['食事', '麦茶', '水分補給', '夏'],
      deliveryCount: 0,
      caption: '冷たい麦茶を作ってひと休み',
    },
    {
      id: 'photo_rain_003',
      url: 'https://example.com/photos/rain.jpg',
      uploadedBy: 'user_01',
      createdAt: '2026-08-10T09:00:00Z',
      type: 'image',
      tags: ['雨', '傘', '長靴', 'お家遊び'],
      deliveryCount: 0,
      caption: '雨だからお家でブロック遊び',
    },
    {
      id: 'photo_winter_004',
      url: 'https://example.com/photos/winter.jpg',
      uploadedBy: 'user_01',
      createdAt: '2026-01-15T11:00:00Z',
      type: 'image',
      tags: ['雪', '冬', '雪だるま', '防寒'],
      deliveryCount: 0,
      caption: '大きな雪だるまを作ったよ',
    },
  ];

  // --------------------------------------------------
  // ケース1：熱中症・水分補給の予防NEWS
  // ➔ 「麦茶（photo_mugicha_002）」が選ばれるはず！
  // --------------------------------------------------
  console.log('--- ケース1: 熱中症・水分補給の予防NEWS ---');
  const heatNews: GeneratedNewsContent = {
    title: '熱中症に気をつけて！',
    message: '今日は35℃の猛暑日です。こまめに冷たい麦茶を飲んで水分補給をしてくださいね。（AIによる自動生成）',
  };

  const result1 = await selectPhotoForPreventionNews(heatNews, samplePhotos);
  console.log(`[選定結果] ${result1.photo ? '写真選定成功' : '適合写真なし (null)'}`);
  if (result1.photo) {
    console.log(`  写真ID  : ${result1.photo.id}`);
    console.log(`  写真URL : ${result1.photo.url}`);
    console.log(`  タグ    : [${result1.photo.tags.join(', ')}]`);
    console.log(`  選定理由: ${result1.reason}\n`);
  }

  // --------------------------------------------------
  // ケース2：大雨・雨天転倒注意の予防NEWS
  // ➔ 「雨・傘（photo_rain_003）」が選ばれるはず！
  // --------------------------------------------------
  console.log('--- ケース2: 大雨・雨天転倒注意の予防NEWS ---');
  const rainNews: GeneratedNewsContent = {
    title: '大雨に気をつけて！',
    message: '午後は強い雨が降る予報です。足元が滑りやすいので外出は控えてお家でお過ごしください。（AIによる自動生成）',
  };

  const result2 = await selectPhotoForPreventionNews(rainNews, samplePhotos);
  console.log(`[選定結果] ${result2.photo ? '写真選定成功' : '適合写真なし (null)'}`);
  if (result2.photo) {
    console.log(`  写真ID  : ${result2.photo.id}`);
    console.log(`  写真URL : ${result2.photo.url}`);
    console.log(`  タグ    : [${result2.photo.tags.join(', ')}]`);
    console.log(`  選定理由: ${result2.reason}\n`);
  }

  // --------------------------------------------------
  // ケース3：合致する写真が全くない場合
  // ➔ 無理に選ばず null が返ることを確認！
  // --------------------------------------------------
  console.log('--- ケース3: 合致する写真がない場合（雷注意報） ---');
  // 「雷」に関連する写真が1枚もない写真リスト
  const noMatchPhotos: Media[] = [
    samplePhotos[0], // 公園
    samplePhotos[3], // 冬・雪だるま
  ];

  const thunderNews: GeneratedNewsContent = {
    title: '雷注意報に注意！',
    message: '夕方から雷が鳴る可能性があります。急な雷雨に備えて早めに洗濯物を取り込んでください。（AIによる自動生成）',
  };

  const result3 = await selectPhotoForPreventionNews(thunderNews, noMatchPhotos);
  console.log(`[選定結果] ${result3.photo ? '写真選定あり' : '適合写真なし (null) ★期待通りの挙動！'}`);
  console.log(`  判定理由: ${result3.reason}\n`);

  console.log('========================================');
  console.log('[テスト終了] すべてのテストが完了しました');
  console.log('========================================');
}

runTest();
