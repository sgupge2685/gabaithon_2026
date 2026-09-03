import { 
  generatePreventionNews, 
  shouldDeliverPreventionNews, 
  getPendingPreventionKeywords 
} from '../src/services/preventionNewsService';
import { getWeatherData } from '../src/services/weatherService';
import { User } from '../src/types/User';
import { News } from '../src/types/News';
import { Weather } from '../src/types/Weather';

/**
 * Weather 型のデータを綺麗に出力するヘルパー関数
 */
function printWeatherData(weather: Weather) {
  console.log('  [気象データ (Weather 型)]:');
  console.log(`    ・地域名      : ${weather.locationName}`);
  console.log(`    ・日付        : ${weather.date}`);
  console.log(`    ・天気        : ${weather.weatherText}`);
  console.log(`    ・気温        : 最高 ${weather.temperatureMax}℃ / 最低 ${weather.temperatureMin}℃`);
  console.log(`    ・湿度        : 昼 ${weather.humidityDaytime}% / 夜 ${weather.humidityNight}%`);
  console.log(`    ・降水確率    : ${weather.rainProbability}%`);
  console.log(`    ・紫外線(UV)  : ${weather.uvIndex}`);
  console.log(`    ・風速        : ${weather.windSpeed} m/s`);
  console.log(`    ・発令中の警報: ${weather.warnings && weather.warnings.length > 0 ? weather.warnings.join(', ') : 'なし（平常）'}`);
}

async function runTest() {
  console.log('========================================');
  console.log('[テスト開始] 予防NEWS自動判定・生成パイプライン');
  console.log('========================================\n');

  const elderlyUser: User = {
    id: 'user_grandpa_001',
    name: 'おじいちゃん',
    role: 'elderly',
    familyGroupId: 'family_group_001',
    location: '佐賀市',
    notificationEnabled: true,
  };

  // --------------------------------------------------
  // テスト1：平穏な日のテスト
  // --------------------------------------------------
  console.log('--- テスト1: 完全に平穏な日のテスト（存在しない地名） ---');
  const calmResult = await generatePreventionNews('存在しない町名XYZ');
  console.log(`[結果] 平穏/エラー時: ${calmResult === null ? 'null (正常にスキップ)' : calmResult.title}\n`);

  // --------------------------------------------------
  // テスト2：1回目の定期チェック（過去NEWSなし ➔ 初回配信）
  // --------------------------------------------------
  console.log('--- テスト2: 1回目の定期チェック（Userオブジェクトを渡す・過去NEWSなし） ---');
  console.log(`[対象ユーザー] ${elderlyUser.name}（お住まい: ${elderlyUser.location}）`);
  
  const pastNewsList: News[] = [];

  // 実況の天気を取得
  const realWeather = await getWeatherData(elderlyUser.location);
  if (realWeather) {
    // Weather の全データを出力
    printWeatherData(realWeather);
  }

  const reasons1 = realWeather ? getPendingPreventionKeywords(realWeather, pastNewsList) : [];
  const result1 = await generatePreventionNews(elderlyUser, pastNewsList);

  if (result1) {
    console.log('[結果] NEWS生成あり（注意喚起を発信）');
    console.log(`  配信理由: 【${reasons1.join('・')}】への警戒が必要と判断`);
    console.log(`  見出し  : ${result1.title}`);
    console.log(`  本文    : ${result1.message}\n`);

    pastNewsList.push({
      id: 'news_001',
      deliveredTo: elderlyUser.id,
      type: 'prevention',
      title: result1.title,
      message: result1.message,
      mediaUrl: 'https://example.com/dummy.jpg',
      isRead: false,
      isAiGeneratedImage: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    console.log('[結果] NEWS生成なし（平穏な気象のため配信スキップ）');
    console.log(`  見出し: （なし）`);
    console.log(`  本文  : （なし）\n`);
  }

  // --------------------------------------------------
  // テスト3：2回目の定期チェック（同じ注意が継続中 ➔ 重複スキップ）
  // --------------------------------------------------
  console.log('--- テスト3: 2回目の定期チェック（15分後・同じ注意が継続中） ---');
  console.log('[シミュレーション] 15分後に同じおじいちゃんの天気を再度チェック...');

  const result2 = await generatePreventionNews(elderlyUser, pastNewsList);

  if (result2) {
    console.log('[結果] NEWS生成あり');
    console.log(`  見出し: ${result2.title}`);
    console.log(`  本文  : ${result2.message}\n`);
  } else {
    console.log('[結果] NEWS生成なし（重複防止が正常作動！本日すでに配信済みのためスキップ成功）');
    console.log(`  判定理由: 直前に配信した【${reasons1.join('・')}】と同じ要因が継続しているため送信不要`);
    console.log(`  見出し  : （なし）`);
    console.log(`  本文    : （なし - 重複送信を防止しました）\n`);
  }

  // --------------------------------------------------
  // テスト4：3回目の定期チェック（新しく大雨警報が追加されたシミュレーション）
  // --------------------------------------------------
  console.log('--- テスト4: 3回目の定期チェック（午後に新しく大雨警報が追加された場合） ---');
  
  const mockAlertWeather: Weather = {
    locationName: '佐賀市',
    date: new Date().toISOString().split('T')[0],
    weatherText: '大雨',
    temperatureMax: 28,
    temperatureMin: 22,
    humidityDaytime: 85,
    humidityNight: 90,
    rainProbability: 90,
    uvIndex: 2,
    windSpeed: 8,
    warnings: ['大雨警報'],
  };

  // シミュレーション用の Weather データも出力
  printWeatherData(mockAlertWeather);

  const newReasons = getPendingPreventionKeywords(mockAlertWeather, pastNewsList);
  const hasNewAlert = shouldDeliverPreventionNews(mockAlertWeather, pastNewsList);

  console.log(`[判定結果] 新しい危険の検知フラグ: ${hasNewAlert ? 'true (新警報を検知！)' : 'false'}`);
  if (hasNewAlert) {
    console.log(`  新検知理由: 本日まだ配信していない新しい危険【${newReasons.join('・')}】を検知！`);
    console.log('[結果] 新しい危険が追加されたため、本日2回目のNEWS配信が可能と判定されました！\n');
  }

  console.log('========================================');
  console.log('[テスト終了] すべてのテストが完了しました');
  console.log('========================================');
}

runTest();
