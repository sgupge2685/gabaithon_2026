import { generatePreventionNews } from '../src/services/preventionNewsService';
import { getWeatherData } from '../src/services/weatherService';
import { Weather } from '../src/types/Weather';

async function runTest() {
  console.log('========================================');
  console.log('[テスト開始] 予防NEWS生成AI (preventionNewsService)');
  console.log('========================================\n');

  // --------------------------------------------------
  // ケース1：平穏で過ごしやすい日（不要 ➔ null）
  // --------------------------------------------------
  console.log('--- ケース1: 完全に平穏で過ごしやすい日 ---');
  const calmWeather: Weather = {
    locationName: '佐賀市',
    date: '2026-05-15',
    weatherText: '晴れ',
    temperatureMax: 22,
    temperatureMin: 15,
    humidityDaytime: 50,
    humidityNight: 60,
    rainProbability: 10,
    uvIndex: 4,
    windSpeed: 2,
    warnings: undefined,
  };

  const result1 = await generatePreventionNews(calmWeather);
  if (result1) {
    console.log(`[結果] NEWS生成あり`);
    console.log(`  見出し: ${result1.title}`);
    console.log(`  本文  : ${result1.message}\n`);
  } else {
    // 生成されない場合も「見出し」「本文」を表示
    console.log(`[結果] NEWS生成なし（平穏なため配信スキップ）`);
    console.log(`  見出し: （なし）`);
    console.log(`  本文  : （なし - 家族写真NEWSのみ表示）\n`);
  }

  // --------------------------------------------------
  // ケース2：35℃の猛暑日（必要 ➔ 生成）
  // --------------------------------------------------
  console.log('--- ケース2: 35℃の猛暑日 ---');
  const hotWeather: Weather = {
    locationName: '佐賀市',
    date: '2026-08-05',
    weatherText: '晴れ',
    temperatureMax: 35,
    temperatureMin: 26,
    humidityDaytime: 75,
    humidityNight: 85,
    rainProbability: 0,
    uvIndex: 9,
    windSpeed: 3,
    warnings: ['熱中症警戒アラート'],
  };

  const result2 = await generatePreventionNews(hotWeather);
  if (result2) {
    console.log(`[結果] NEWS生成あり`);
    console.log(`  見出し: ${result2.title}`);
    console.log(`  本文  : ${result2.message}\n`);
  } else {
    console.log(`[結果] NEWS生成なし（配信スキップ）`);
    console.log(`  見出し: （なし）`);
    console.log(`  本文  : （なし）\n`);
  }

  // --------------------------------------------------
  // ケース3：大雨警報の日（必要 ➔ 生成）
  // --------------------------------------------------
  console.log('--- ケース3: 大雨警報発令中の日 ---');
  const rainyWeather: Weather = {
    locationName: '佐賀市',
    date: '2026-07-10',
    weatherText: '大雨',
    temperatureMax: 25,
    temperatureMin: 22,
    humidityDaytime: 90,
    humidityNight: 95,
    rainProbability: 90,
    uvIndex: 1,
    windSpeed: 9,
    warnings: ['大雨警報', '洪水警報'],
  };

  const result3 = await generatePreventionNews(rainyWeather);
  if (result3) {
    console.log(`[結果] NEWS生成あり`);
    console.log(`  見出し: ${result3.title}`);
    console.log(`  本文  : ${result3.message}\n`);
  } else {
    console.log(`[結果] NEWS生成なし（配信スキップ）`);
    console.log(`  見出し: （なし）`);
    console.log(`  本文  : （なし）\n`);
  }

  // --------------------------------------------------
  // ケース4：実際のリアルタイム天気（佐賀市）
  // --------------------------------------------------
  console.log('--- ケース4: 実際の佐賀市のリアルタイム気象データと連携 ---');
  const realWeather = await getWeatherData('佐賀市');
  if (realWeather) {
    console.log(`[実況データ] ${realWeather.locationName}: 天気=${realWeather.weatherText}, 最高=${realWeather.temperatureMax}℃, 警報=${realWeather.warnings?.join('・') || 'なし'}`);

    const resultReal = await generatePreventionNews(realWeather);
    if (resultReal) {
      console.log(`[結果] NEWS生成あり（実況から生成）`);
      console.log(`  見出し: ${resultReal.title}`);
      console.log(`  本文  : ${resultReal.message}\n`);
    } else {
      console.log(`[結果] NEWS生成なし（実況が平穏なため配信スキップ）`);
      console.log(`  見出し: （なし）`);
      console.log(`  本文  : （なし - 家族写真NEWSのみ表示）\n`);
    }
  }

  console.log('========================================');
  console.log('[テスト終了] すべてのテストが完了しました');
  console.log('========================================');
}

runTest();
