import { 
  generatePreventionNews, 
  getPendingPreventionKeywords 
} from '../src/services/preventionNewsService';
import { getWeatherData } from '../src/services/weatherService';
import { User } from '../src/types/User';
import { News } from '../src/types/News';
import { Media } from '../src/types/Media';
import { Weather } from '../src/types/Weather';

/**
 * Weather 型のデータを綺麗に出力するヘルパー
 */
function printWeatherData(weather: Weather) {
  console.log('  [気象データ (Weather 型)]:');
  console.log(`    ・地域名      : ${weather.locationName}`);
  console.log(`    ・天気        : ${weather.weatherText}`);
  console.log(`    ・気温        : 最高 ${weather.temperatureMax}℃ / 最低 ${weather.temperatureMin}℃`);
  console.log(`    ・湿度        : 昼 ${weather.humidityDaytime}% / 夜 ${weather.humidityNight}%`);
  console.log(`    ・発令中の警報: ${weather.warnings && weather.warnings.length > 0 ? weather.warnings.join(', ') : 'なし（平常）'}`);
}

async function runTest() {
  console.log('========================================');
  console.log('[テスト開始] 予防NEWS・写真選定 一本化パイプライン');
  console.log('========================================\n');

  const elderlyUser: User = {
    id: 'user_grandpa_001',
    name: 'おじいちゃん',
    role: 'elderly',
    familyGroupId: 'family_group_001',
    location: '佐賀市',
    notificationEnabled: true,
  };

  // テスト用の家族写真リスト（Media[]）
  const familyPhotos: Media[] = [
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
      caption: '冷たい麦茶を作ったよ',
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
  ];

  const pastNewsList: News[] = [];

  // --------------------------------------------------
  // テスト1：初回チェック（写真あり ➔ 写真選定 ＋ NEWS生成が一撃で実行！）
  // --------------------------------------------------
  console.log('--- テスト1: 初回チェック（家族写真あり・過去NEWSなし） ---');
  console.log(`[対象ユーザー] ${elderlyUser.name}（お住まい: ${elderlyUser.location}）`);

  const realWeather = await getWeatherData(elderlyUser.location);
  if (realWeather) {
    printWeatherData(realWeather);
  }

  // ★ ユーザー、過去NEWS、家族写真リストを渡して 1回 呼ぶだけ！
  const result1 = await generatePreventionNews(elderlyUser, pastNewsList, familyPhotos);

  if (result1) {
    console.log('[結果] 一本化パイプライン実行成功！');
    console.log(`  見出し        : ${result1.title}`);
    console.log(`  本文          : ${result1.message}`);
    console.log(`  選定された写真: ${result1.photo ? result1.photo.id + ' (' + result1.photo.url + ')' : 'なし'}`);
    console.log(`  選定理由      : ${result1.selectedReason}\n`);

    pastNewsList.push({
      id: 'news_001',
      deliveredTo: elderlyUser.id,
      type: 'prevention',
      title: result1.title,
      message: result1.message,
      mediaUrl: result1.photo?.url || 'https://example.com/default.jpg',
      isRead: false,
      isAiGeneratedImage: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    console.log('[結果] 平穏なためスキップ（null）\n');
  }

  // --------------------------------------------------
  // テスト2：2回目の定期チェック（同じ注意が継続中 ➔ 重複スキップ）
  // --------------------------------------------------
  console.log('--- テスト2: 2回目のチェック（15分後・同じ注意が継続中） ---');
  const result2 = await generatePreventionNews(elderlyUser, pastNewsList, familyPhotos);

  if (result2) {
    console.log('[結果] NEWS生成あり\n');
  } else {
    console.log('[結果] NEWS生成なし（★重複防止が正常作動！本日すでに配信済みのためスキップ成功）\n');
  }

  // --------------------------------------------------
  // テスト3：写真が1枚もない場合（空配列 []）
  // ➔ 写真なしでもクラッシュせず、通常の温かい予防NEWSが生成されることを確認！
  // --------------------------------------------------
  console.log('--- テスト3: 写真が1枚もない場合（空配列 []・force=true で強制確認） ---');
  const result3 = await generatePreventionNews(elderlyUser, [], [], true);
  if (result3) {
    console.log('[結果] 写真なし時のNEWS生成成功！');
    console.log(`  見出し        : ${result3.title}`);
    console.log(`  本文          : ${result3.message}`);
    console.log(`  写真          : ${result3.photo === null ? 'null (写真なしで安全に生成)' : 'あり'}`);
    console.log(`  選定理由      : ${result3.selectedReason}\n`);
  }

  console.log('========================================');
  console.log('[テスト終了] すべてのテストが完了しました');
  console.log('========================================');
}

runTest();
