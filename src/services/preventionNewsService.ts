import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Weather } from '../types/Weather';
import { GeneratedNewsContent } from './newsGenerateService';

// Gemini API クライアントの初期化（環境変数 GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

// JSON出力用のスキーマ定義（タイトルと本文を確実に受け取る）
const preventionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'おじいちゃん・おばあちゃん向けの簡潔で分かりやすい見出し（15文字以内、例:「熱中症に気をつけて！」「午後は急な雨に注意」）',
    },
    message: {
      type: Type.STRING,
      description: '高齢者に寄り添った温かい予防アドバイス本文（80〜120文字程度。具体的な行動を促す内容）',
    },
  },
  required: ['title', 'message'],
};

/**
 * ①【判断ロジック】今日、予防NEWSを配信すべき気象状況かを判定する
 * 
 * @param weather 気象データ
 * @returns 配信すべき危険・変化があれば true、平穏な日なら false
 */
export function shouldDeliverPreventionNews(weather: Weather): boolean {
  // 1. 気象庁の公式警報・注意報が発令されている（大雨、雷、乾燥など）
  if (weather.warnings && weather.warnings.length > 0) {
    return true;
  }

  // 2. 猛暑・熱中症リスク（最高気温31℃以上、または28℃以上かつ湿度70%以上の蒸し暑さ）
  if (weather.temperatureMax >= 31) return true;
  if (weather.temperatureMax >= 28 && weather.humidityDaytime >= 70) return true;

  // 3. 冬の冷え込み・ヒートショックリスク（最低気温5℃以下）
  if (weather.temperatureMin <= 5) return true;

  // 4. 寒暖差リスク（1日の気温差が10℃以上で体調を崩しやすい）
  if (weather.temperatureMax - weather.temperatureMin >= 10) return true;

  // 5. 雨や雪によるスリップ・転倒リスク（降水確率50%以上、または雨・雪の予報）
  if (weather.rainProbability >= 50) return true;
  if (weather.weatherText.includes('雨') || weather.weatherText.includes('雪')) return true;

  // 6. 強風による転倒・飛来物リスク（最大風速8m/s以上）
  if (weather.windSpeed >= 8) return true;

  // 7. 非常に強い紫外線（UVインデックス8以上）
  if (weather.uvIndex >= 8) return true;

  // 上記のどれにも当てはまらない、平穏で過ごしやすい日は配信不要
  return false;
}

/**
 * ②【生成ロジック】気象データから高齢者向けの予防NEWSを生成する
 * 
 * @param weather 気象データ
 * @param force trueにすると判断ロジックを無視して強制生成（テストやデモ用）
 * @param modelName 使用するGeminiモデル（デフォルト: gemini-3.6-flash）
 * @returns 生成されたNEWS（タイトル・本文）。配信不要な日は null を返す
 */
export async function generatePreventionNews(
  weather: Weather,
  force: boolean = false,
  modelName: string = 'gemini-3.6-flash'
): Promise<GeneratedNewsContent | null> {
  // --------------------------------------------------
  // ステップ1：配信が必要かどうかを判定
  // --------------------------------------------------
  if (!force && !shouldDeliverPreventionNews(weather)) {
    console.log('[情報] 平穏な気象条件のため、本日の予防NEWS生成はスキップ（不要と判断）されました。');
    return null; // 不要な日は null を返す
  }

  // --------------------------------------------------
  // ステップ2：Geminiへ渡す気象データのテキストを構築
  // --------------------------------------------------
  const warningText = weather.warnings && weather.warnings.length > 0
    ? weather.warnings.join('・')
    : 'なし';

  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の健康・安全アドバイザーです。
以下の今日の気象データをもとに、おじいちゃん・おばあちゃんが元気に安心して過ごせるよう、
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

【生成ルール】
1. **見出し（title）**:
   - 15文字以内で、最も注意すべきことが一目で伝わる言葉にしてください。
   - 例: 「熱中症に気をつけて！」「午後は急な雨に注意」「朝晩の冷え込みに注意」

2. **メッセージ本文（message）**:
   - 80〜120文字程度で、優しく寄り添うトーン（敬語・ですます調）にしてください。
   - なぜ注意が必要かと、具体的な対策行動（「エアコンをつけて」「水分をとって」「暖かい上着を羽織って」など）を1〜2点伝えてください。
   - 不安を煽りすぎず、安心感のある表現にしてください。
`.trim();

  // --------------------------------------------------
  // ステップ3：Gemini APIの呼び出し（構造化JSON出力）
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
      // AIが生成した文末にはルール通り注釈を付与
      message: `${parsed.message.trim()}（AIによる自動生成）`,
    };

  } catch (error) {
    console.error('× [エラー] 予防NEWS生成中にエラーが発生しました:', error);

    // フォールバック（APIエラー時も画面がクラッシュしないよう安全なメッセージを返す）
    // ※AIが生成したわけではないため（AIによる自動生成）は付与しない
    return {
      title: '今日の健康メモ',
      message: `${weather.locationName}の今日の天気は${weather.weatherText}、最高気温は${weather.temperatureMax}℃の予報です。体調に合わせてこまめに水分補給や衣服の調節をしてお過ごしください。`,
    };
  }
}
