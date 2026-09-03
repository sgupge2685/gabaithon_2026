import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Weather } from '../types/Weather';
import { User } from '../types/User';
import { News } from '../types/News';
import { GeneratedNewsContent } from './newsGenerateService';
import { getWeatherData } from './weatherService';

// Gemini API クライアントの初期化（環境変数 GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

// JSON出力用のスキーマ定義（タイトルと本文を確実に受け取る）
const preventionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'おじいちゃん・おばあちゃん向けの簡潔で分かりやすい見出し（15文字以内）',
    },
    message: {
      type: Type.STRING,
      description: '高齢者に寄り添った温かい予防アドバイス本文（80〜120文字程度。具体的な行動を促す内容）',
    },
  },
  required: ['title', 'message'],
};

/**
 * 気象条件から、今日まだ配信されていない「注意すべきキーワード群」を抽出する
 * 
 * @param weather 最新の気象データ
 * @param pastNewsList 過去に配信されたNEWSリスト（FirestoreのNews[]）
 * @returns 今日まだ注意喚起されていないキーワードの配列（空なら配信不要）
 */
export function getPendingPreventionKeywords(
  weather: Weather,
  pastNewsList: News[] = []
): string[] {
  const today = weather.date;

  // 今日の過去「予防NEWS」のタイトルと本文をすべて結合して、検索用の1つの文字列にする
  const todayDeliveredText = pastNewsList
    .filter((news) => news.type === 'prevention' && news.createdAt.startsWith(today))
    .map((news) => `${news.title} ${news.message}`)
    .join(' ');

  const pendingKeywords: string[] = [];

  // 1. 気象庁の公式警報・注意報（例: 大雨警報、雷注意報、乾燥注意報など）
  if (weather.warnings && weather.warnings.length > 0) {
    for (const warningName of weather.warnings) {
      // 今日のNEWSにこの警報名がまだ一度も登場していない場合に追加
      if (!todayDeliveredText.includes(warningName)) {
        pendingKeywords.push(warningName);
      }
    }
  }

  // 2. 猛暑・熱中症リスク（最高気温31℃以上、または28℃以上かつ湿度70%以上）
  const isHeatDanger = weather.temperatureMax >= 31 || (weather.temperatureMax >= 28 && weather.humidityDaytime >= 70);
  if (isHeatDanger) {
    // 今日のNEWSに「熱中症」も「猛暑」もまだ登場していない場合に追加
    if (!todayDeliveredText.includes('熱中症') && !todayDeliveredText.includes('猛暑')) {
      pendingKeywords.push('熱中症');
    }
  }

  // 3. 冬の冷え込みリスク（最低気温5℃以下）
  if (weather.temperatureMin <= 5) {
    if (!todayDeliveredText.includes('寒い') && !todayDeliveredText.includes('冷え込み')) {
      pendingKeywords.push('寒い');
    }
  }

  // 4. 寒暖差リスク（1日の気温差が10℃以上）
  if (weather.temperatureMax - weather.temperatureMin >= 10) {
    if (!todayDeliveredText.includes('寒暖差')) {
      pendingKeywords.push('寒暖差');
    }
  }

  // 5. 雨や雪によるスリップ・転倒リスク（降水確率50%以上、または雨・雪の予報）
  const isRainOrSnow = weather.rainProbability >= 50 || weather.weatherText.includes('雨') || weather.weatherText.includes('雪');
  if (isRainOrSnow) {
    const word = weather.weatherText.includes('雪') ? '雪' : '雨';
    if (!todayDeliveredText.includes('雨') && !todayDeliveredText.includes('雪')) {
      pendingKeywords.push(word);
    }
  }

  // 6. 強風リスク（最大風速8m/s以上）
  if (weather.windSpeed >= 8) {
    if (!todayDeliveredText.includes('強風') && !todayDeliveredText.includes('風が強い')) {
      pendingKeywords.push('強風');
    }
  }

  // 7. 非常に強い紫外線（UVインデックス8以上）
  if (weather.uvIndex >= 8) {
    if (!todayDeliveredText.includes('紫外線')) {
      pendingKeywords.push('紫外線');
    }
  }

  return pendingKeywords;
}

/**
 * ①【判断ロジック】今日、新しい予防NEWSを配信すべきかを判定する（重複防止対応）
 * 
 * @param weather 気象データ
 * @param pastNewsList 過去に配信されたNEWSリスト（FirestoreのNews[]）
 * @returns 今日まだ配信していない新しい注意要因があれば true、平穏または既に配信済みなら false
 */
export function shouldDeliverPreventionNews(
  weather: Weather,
  pastNewsList: News[] = []
): boolean {
  const pending = getPendingPreventionKeywords(weather, pastNewsList);
  return pending.length > 0;
}

/**
 * ②【一連の流れを実行するメイン関数】
 * 高齢者ユーザー（または地名）を受け取り、
 * 「天気取得 ➔ 未配信の危険を判定 ➔ 予防NEWS生成」までを全自動で実行する！
 * 
 * @param userOrLocation 高齢者ユーザー（User）または地名（例: "佐賀市"）
 * @param pastNewsList 過去に配信されたNEWSリスト（重複チェック用）
 * @param force trueにすると重複チェックを無視して強制生成（テスト用）
 * @param modelName 使用するGeminiモデル（デフォルト: gemini-3.6-flash）
 * @returns 生成されたNEWS（タイトル・本文）。不要または配信済みの場合は null
 */
export async function generatePreventionNews(
  userOrLocation: User | string,
  pastNewsList: News[] = [],
  force: boolean = false,
  modelName: string = 'gemini-3.6-flash'
): Promise<GeneratedNewsContent | null> {
  // --------------------------------------------------
  // ステップ1：Userオブジェクト、または地名文字列から「地域名」を取り出す
  // --------------------------------------------------
  const locationName = typeof userOrLocation === 'string'
    ? userOrLocation
    : userOrLocation.location;

  if (!locationName) {
    console.error('× [エラー] ユーザーの地域名（location）が設定されていません。');
    return null;
  }

  // --------------------------------------------------
  // ステップ2：最新の気象データを取得（※DBには保存せずメモリ上だけで使用！）
  // --------------------------------------------------
  const weather = await getWeatherData(locationName);
  if (!weather) {
    console.error(`× [エラー] ${locationName} の気象データを取得できませんでした。`);
    return null;
  }

  // --------------------------------------------------
  // ステップ3：今日まだ配信されていない注意キーワードがあるか判定
  // --------------------------------------------------
  const pendingKeywords = getPendingPreventionKeywords(weather, pastNewsList);

  if (!force && pendingKeywords.length === 0) {
    console.log('[情報] 平穏な気象、または本日すでに同じ注意を配信済みのためスキップしました。');
    return null; // 不要な時は null を返す
  }

  const requiredKeywords = pendingKeywords.length > 0
    ? pendingKeywords
    : (weather.warnings && weather.warnings.length > 0 ? weather.warnings : ['体調管理']);

  // --------------------------------------------------
  // ステップ4：Geminiへ渡すプロンプトを構築（必須キーワードを指定）
  // --------------------------------------------------
  const warningText = weather.warnings && weather.warnings.length > 0
    ? weather.warnings.join('・')
    : 'なし';

  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の健康・安全アドバイザーです。
以下の気象情報をもとに、おじいちゃん・おばあちゃんが元気に安心して過ごせるよう、
今日特に気をつけるべき「健康・安全の予防アドバイス」を生成してください。

【本日の気象情報】
- 地域: ${weather.locationName}
- 天気: ${weather.weatherText}
- 最高気温: ${weather.temperatureMax}℃
- 最低気温: ${weather.temperatureMin}℃
- 昼の湿度: ${weather.humidityDaytime}%
- 降水確率: ${weather.rainProbability}%
- 紫外線指数: ${weather.uvIndex}
- 最大風速: ${weather.windSpeed} m/s
- 発令中の公式警報・注意報: ${warningText}

【最重要ルール】
今回の予防NEWSで最も注意を促したいキーワードは【 ${requiredKeywords.join('、')} 】です。
おじいちゃんが一目で何の注意か理解できるよう、
【見出し（title）または本文（message）のどちらかに、「${requiredKeywords[0]}」という言葉を必ずそのまま含めてください】。

【その他の作成ルール】
1. **見出し（title）**:
   - 15文字以内で、簡潔で分かりやすい言葉にしてください。
2. **本文（message）**:
   - 80〜120文字程度で、優しく寄り添うトーン（敬語・ですます調）にしてください。
   - なぜ注意が必要かと、具体的な対策行動（「エアコンをつけて」「水分をとって」など）を伝えてください。
   - 不安を煽りすぎず、安心感のある表現にしてください。
`.trim();

  // --------------------------------------------------
  // ステップ5：Gemini APIの呼び出し（構造化JSON出力）
  // --------------------------------------------------
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: preventionSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini APIからの応答が空でした。');
    }

    const parsed: GeneratedNewsContent = JSON.parse(responseText);

    return {
      title: parsed.title.trim(),
      message: `${parsed.message.trim()}（AIによる自動生成）`,
    };

  } catch (error) {
    console.error('× [エラー] 予防NEWS生成中にエラーが発生しました:', error);

    return {
      title: `${requiredKeywords[0]}に注意`,
      message: `${weather.locationName}では本日、${requiredKeywords.join('や')}への注意が必要です。体調に合わせて水分補給や安全な行動を心がけてお過ごしください。`,
    };
  }
}
