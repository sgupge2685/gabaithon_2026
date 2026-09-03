import { getWeatherData } from '../src/services/weatherService';
import { Weather } from '../src/types/Weather';

/**
 * 気象データ取得サービス（weatherService）の動作確認テスト
 */
async function runTest() {
  console.log('========================================');
  console.log('🧪 気象データ取得（気象庁＋Open-Meteo）テスト開始');
  console.log('========================================\n');

  const testCities = ['佐賀市', '福岡市', '札幌市', '存在しない町名XYZ'];

  for (const city of testCities) {
    console.log(`📍 【テスト地名】: 「${city}」`);

    // ★Weather 型を明示的に型付けして受け取る！
    const weather: Weather | null = await getWeatherData(city);

    if (weather) {
      console.log('[取得成功] 気象データ（Weather 型）:');
      console.log(`   ・地域名: ${weather.locationName}`);
      console.log(`   ・日付: ${weather.date}`);
      console.log(`   ・天気: ${weather.weatherText}`);
      console.log(`   ・気温: 最高 ${weather.temperatureMax}℃ / 最低 ${weather.temperatureMin}℃`);
      console.log(`   ・湿度: 昼 ${weather.humidityDaytime}% / 夜 ${weather.humidityNight}%`);
      console.log(`   ・降水確率: ${weather.rainProbability}%`);
      console.log(`   ・紫外線指数(UV): ${weather.uvIndex}`);
      console.log(`   ・風速: ${weather.windSpeed} m/s`);
      console.log(`   ・発令中の気象庁公式警報: ${weather.warnings && weather.warnings.length > 0 ? weather.warnings.join(', ') : 'なし（平常）'}`);
      console.log(`   ・含まれるキー一覧: [ ${Object.keys(weather).join(', ')} ]\n`);
    } else {
      console.log('[失敗] 地名が見つからないため、安全に null が返されました\n');
    }
  }

  console.log('========================================');
  console.log('🏁 すべてのテストが終了しました');
  console.log('========================================');
}

runTest();
