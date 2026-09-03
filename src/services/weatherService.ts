import { Weather } from '../types/Weather';

/**
 * 日本全国の市区町村名から、気象データを取得する
 * 
 * データソース:
 *   - 気象庁（JMA）: 天気予報、気温、降水確率、市区町村別の公式警報・注意報
 *   - Open-Meteo: 湿度（昼・夜）、紫外線指数、風速
 * 
 * @param cityName 市区町村名（例: "佐賀市", "唐津市", "世田谷区", "札幌市" など）
 * @returns 気象データ（Weather 型）。取得失敗時は null を返す
 */
export async function getWeatherData(cityName: string = '佐賀市'): Promise<Weather | null> {
  try {
    // ==================================================
    // ステップ1：気象庁の全国エリア辞書（area.json）から、地名に対応するコードを検索
    // ==================================================
    // 気象庁の全国市区町村・都道府県コード一覧（辞書JSON）をダウンロード
    const areaMasterRes = await fetch('https://www.jma.go.jp/bosai/common/const/area.json');
    if (!areaMasterRes.ok) {
      console.error(`❌ 気象庁エリアマスターの取得に失敗しました（ステータス: ${areaMasterRes.status}）`);
      return null;
    }
    const areaMaster = await areaMasterRes.json();

    // 検索で見つかった気象庁コードを保存するための変数を用意（ループ後も使うため外側で宣言）
    let targetClass20Code = '';      // 市区町村コード（例: "4120100" = 佐賀市）
    let targetOfficeCode = '';       // 都道府県コード（例: "410000" = 佐賀県）
    let resolvedCityName = cityName; // 画面表示用の綺麗な正式地名

    // 辞書から「市区町村マップ（class20s）」を取り出し、1件ずつループで探す
    const class20s = areaMaster.class20s || {};
    for (const [code, info] of Object.entries<any>(class20s)) {
      // 辞書の地名（info.name）が存在し、かつ探している cityName と部分一致するか判定
      if (info.name && (info.name.includes(cityName) || cityName.includes(info.name))) {
        targetClass20Code = code;      // 市区町村コードを保存（例: "4120100"）
        resolvedCityName = info.name;  // 正式な地名を保存（例: "佐賀市"）

        // 親ID（info.parent）をたどって、所属する都道府県コード（佐賀県: "410000"）を特定
        const class15 = areaMaster.class15s?.[info.parent]; // 北海道などの特殊地域チェック（通常はundefined）
        const class10 = areaMaster.class10s?.[class15?.parent || info.parent]; // 地域マップ（佐賀県南部: 410010）
        targetOfficeCode = class10?.parent || ''; // その親の都道府県コード（佐賀県: 410000）を取得
        break; // 見つかったのでループを終了
      }
    }

    // もし「佐賀市」ではなく「佐賀県」や「東京都」と都道府県名で入力された場合の保険検索
    if (!targetOfficeCode) {
      const offices = areaMaster.offices || {};
      for (const [code, info] of Object.entries<any>(offices)) {
        if (info.name && (info.name.includes(cityName) || cityName.includes(info.name))) {
          targetOfficeCode = code; // 都道府県コードを直接取得
          resolvedCityName = info.name;
          break;
        }
      }
    }

    // 存在しない変な地名が渡されてコードが見つからなかった場合、安全に null を返す
    if (!targetOfficeCode) {
      console.error(`❌ 気象庁のエリアマスターに地名が見つかりませんでした: ${cityName}`);
      return null;
    }

    // ==================================================
    // ステップ2：気象庁の天気予報 と Open-Meteoの湿度・UV を【同時に】取得して高速化！
    // ==================================================
    // Open-Meteo用に、地名から緯度・経度を検索
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ja&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    let lat = 33.25; // デフォルト緯度（佐賀市付近）
    let lon = 130.30; // デフォルト経度
    if (geoData.results && geoData.results.length > 0) {
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    }

    // ①気象庁の天気予報URL（都道府県コードを使用）
    const jmaForecastUrl = `https://www.jma.go.jp/bosai/forecast/data/forecast/${targetOfficeCode}.json`;
    // ②Open-Meteoの湿度・UV・風速URL（緯度経度を使用、風速はm/s単位を指定）
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=relative_humidity_2m&daily=uv_index_max,wind_speed_10m_max&wind_speed_unit=ms&timezone=Asia%2FTokyo`;

    // Promise.all で2つのAPIへ同時にリクエストを送り、通信待ち時間を最短にする（約0.2秒）
    const [jmaForecastRes, openMeteoRes] = await Promise.all([
      fetch(jmaForecastUrl),
      fetch(openMeteoUrl)
    ]);

    if (!jmaForecastRes.ok) {
      console.error(`❌ 気象庁天気予報の取得に失敗しました（ステータス: ${jmaForecastRes.status}）`);
      return null;
    }

    const jmaForecast = await jmaForecastRes.json();

    // ==================================================
    // ステップ3：気象庁の天気予報データを抽出（天気・気温・降水確率）
    // ==================================================
    const timeSeries = jmaForecast[0]?.timeSeries || [];
    const weatherSeries = timeSeries[0]; // 今日の天気データブロック
    const popSeries = timeSeries[1];     // 降水確率（Probability of Precipitation）ブロック
    const tempSeries = timeSeries[2];    // 気温データブロック

    // 今日の天気テキスト（例: "晴れ 時々 くもり"）
    const weatherText = weatherSeries?.areas?.[0]?.weathers?.[0] || '不明';
    // 今日の降水確率（例: "20" ➔ 20%）
    const rainProbability = parseInt(popSeries?.areas?.[0]?.pops?.[0] || '0', 10);

    // 気象庁のデータ（data[0]）から「今日の最高気温」と「今夜〜明朝の最低気温」を抽出
    const temps = tempSeries?.areas?.[0]?.temps || [];
    // temps[0] は今日の最高気温（例: "37" ➔ 37℃）
    const tempMax = parseInt(temps[0] || '0', 10);

    // お昼・夕方発表時は temps[2] に「今夜〜明朝の最低気温（例: 27℃）」が格納されている
    let tempMin = 0;
    if (temps.length >= 3) {
      tempMin = parseInt(temps[2], 10); // お昼発表: 今夜の最低気温
    } else if (temps.length === 2) {
      tempMin = parseInt(temps[0], 10); // 朝発表: 今朝の最低気温
    } else {
      tempMin = Math.max(0, tempMax - 6);
    }

    // ==================================================
    // ステップ4：Open-Meteo のデータを抽出（昼夜の湿度・UV・風速）
    // ==================================================
    let humidityDaytime = 0;
    let humidityNight = 0;
    let uvIndex = 0;
    let windSpeed = 0;

    if (openMeteoRes.ok) {
      const openMeteoData = await openMeteoRes.json();
      // 昼12時（お昼の熱中症用）と 夜21時（夜間の熱中症用）の湿度を抽出
      humidityDaytime = openMeteoData.hourly?.relative_humidity_2m?.[12] ?? 0;
      humidityNight = openMeteoData.hourly?.relative_humidity_2m?.[21] ?? 0;
      // 紫外線指数（UV）と風速（m/s）を四捨五入して取得
      uvIndex = Math.round(openMeteoData.daily?.uv_index_max?.[0] ?? 0);
      windSpeed = Math.round(openMeteoData.daily?.wind_speed_10m_max?.[0] ?? 0);
    } else {
      console.warn('⚠️ Open-Meteo の取得に失敗（湿度・UV・風速は 0 になります）');
    }

    // ==================================================
    // ステップ5：気象庁の公式データから「指定した市区町村」の警報・注意報だけを抽出！
    // ==================================================
    const warnings = await fetchCityWarnings(targetOfficeCode, targetClass20Code);

    // ==================================================
    // ステップ6：集めた本物のデータを Weather 型に詰めて返却！
    // ==================================================
    const today = new Date().toISOString().split('T')[0];

    return {
      locationName: resolvedCityName,                     // 正式地名（例: "佐賀市"）
      date: today,                                        // 今日の日付（例: "2026-08-31"）
      weatherText: weatherText.replace(/\s+/g, ' ').trim(), // 天気（余計な改行や空白を除去）
      temperatureMax: tempMax,                            // 最高気温（℃）
      temperatureMin: tempMin,                            // 最低気温（℃）
      humidityDaytime: humidityDaytime,                   // 昼の湿度（%）
      humidityNight: humidityNight,                       // 夜の湿度（%）
      rainProbability: rainProbability,                   // 降水確率（%）
      uvIndex: uvIndex,                                   // 紫外線指数
      windSpeed: windSpeed,                               // 風速（m/s）
      warnings: warnings.length > 0 ? warnings : undefined // 発令中の気象庁公式警報（なければundefined）
    };

  } catch (error) {
    console.error('気象データ取得エラー:', error);
    return null;
  }
}

// 気象庁の公式警報コード辞書（コード番号 ➔ 日本語の警報名）
const JMA_WARNING_NAMES: Record<string, string> = {
  '02': '暴風雪警報', '03': '大雨警報', '04': '洪水警報', '05': '暴風警報',
  '06': '大雪警報', '07': '波浪警報', '08': '高潮警報',
  '10': '大雨注意報', '12': '大雪注意報', '13': '風雪注意報', '14': '雷注意報',
  '15': '強風注意報', '16': '波浪注意報', '17': '融雪注意報', '18': '洪水注意報',
  '19': '高潮注意報', '20': '濃霧注意報', '21': '乾燥注意報', '22': 'なだれ注意報',
  '23': '低温注意報', '24': '霜注意報', '25': '着氷注意報', '26': '着雪注意報',
  '33': '大雨特別警報', '35': '暴風特別警報', '36': '大雪特別警報', '37': '波浪特別警報', '38': '高潮特別警報'
};

/**
 * 気象庁の最新リアルタイムAPI（r8システム）から、指定された市区町村に現在出ている警報・注意報だけをピンポイント抽出する
 * 
 * @param officeCode 都道府県コード（例: "410000" = 佐賀県）
 * @param class20Code 市区町村コード（例: "4120100" = 佐賀市）
 * @returns 現在発令中の警報・注意報の配列（例: ["雷注意報", "乾燥注意報"]）
 */
async function fetchCityWarnings(officeCode: string, class20Code: string): Promise<string[]> {
  try {
    // 気象庁公式の最新リアルタイム警報JSONを取得
    const url = 'https://www.jma.go.jp/bosai/warning/data/r8/map.json';
    const res = await fetch(url);
    if (!res.ok) return [];
    const allOfficesData = await res.json();

    const warnings: string[] = [];

    // 気象庁の全国警報データの中から、対象の都道府県・市区町村を探す
    for (const report of allOfficesData) {
      // 市区町村リスト（class20Items）と 地域リスト（class10Items）を結合
      const items = [
        ...(report.warning?.class20Items || []),
        ...(report.warning?.class10Items || [])
      ];

      for (const item of items) {
        // 市区町村コード（例: 4120100）または市全体・親地域に一致するかチェック
        const isTargetCity = class20Code 
          ? (item.areaCode === class20Code || 
             (class20Code.length >= 3 && item.areaCode?.startsWith(class20Code.slice(0, 3)) && item.areaCode?.endsWith('0000')) ||
             item.areaCode === officeCode)
          : true;

        // その市区町村の警報・注意報リスト（kinds）をチェック
        if (isTargetCity && item.kinds) {
          for (const k of item.kinds) {
            // status が「発表」または「継続」の警報・注意報だけを抽出
            if (k.status === '発表' || k.status === '継続') {
              // コード番号（例: "14" ➔ "雷注意報"）に変換して配列に追加
              const warningName = JMA_WARNING_NAMES[k.code] || k.name;
              if (warningName && !warnings.includes(warningName)) {
                warnings.push(warningName);
              }
            }
          }
        }
      }
    }

    return warnings; // 例: ["雷注意報", "乾燥注意報"] を返す
  } catch (error) {
    console.warn('⚠️ 気象庁警報データの取得をスキップ:', error);
    return [];
  }
}
