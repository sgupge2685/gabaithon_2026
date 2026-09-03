import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Weather } from '../types/Weather';
import { User } from '../types/User';
import { News } from '../types/News';
import { Media } from '../types/Media';
import { getWeatherData } from './weatherService';

const ai = new GoogleGenAI({});

/**
 * 予防NEWS生成結果の型（選定された写真も一緒に返却）
 */
export interface PreventionNewsResult {
  title: string;          // 見出し（15文字以内）
  message: string;        // 本文（写真に触れつつ予防アドバイス + 注釈）
  photo: Media | null;    // 選定された家族写真（合致がなければ null）
  selectedReason: string; // なぜその写真を選んだか、または写真なしの理由
}

// Gemini出力用のスキーマ定義（写真ID、見出し、本文を一撃で受け取る）
const preventionOneShotSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    selectedPhotoId: {
      type: Type.STRING,
      description: '予防テーマに最も合致する写真のID。関係ない写真しかない場合は "none"',
    },
    selectedReason: {
      type: Type.STRING,
      description: 'その写真を選んだ理由、または適切な写真がないと判断した理由（簡潔に）',
    },
    title: {
      type: Type.STRING,
      description: 'おじいちゃん・おばあちゃん向けの簡潔で分かりやすい見出し（15文字以内）',
    },
    message: {
      type: Type.STRING,
      description: '家族写真のコメントやタグに温かく触れながら、具体的な予防行動を促すアドバイス本文（80〜120文字程度）',
    },
  },
  required: ['selectedPhotoId', 'selectedReason', 'title', 'message'],
};

/**
 * 気象条件から、今日まだ配信されていない「注意すべきキーワード群」を抽出する
 */
export function getPendingPreventionKeywords(
  weather: Weather,
  pastNewsList: News[] = []
): string[] {
  const today = weather.date;

  const todayDeliveredText = pastNewsList
    .filter((news) => news.type === 'prevention' && news.createdAt.startsWith(today))
    .map((news) => `${news.title} ${news.message}`)
    .join(' ');

  const pendingKeywords: string[] = [];

  // 1. 気象庁の公式警報・注意報
  if (weather.warnings && weather.warnings.length > 0) {
    for (const warningName of weather.warnings) {
      if (!todayDeliveredText.includes(warningName)) {
        pendingKeywords.push(warningName);
      }
    }
  }

  // 2. 猛暑・熱中症リスク（最高気温31℃以上、または28℃以上かつ湿度70%以上）
  const isHeatDanger = weather.temperatureMax >= 31 || (weather.temperatureMax >= 28 && weather.humidityDaytime >= 70);
  if (isHeatDanger) {
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

  // 5. 雨や雪によるスリップ・転倒リスク
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
 * 予防NEWSを配信すべきか判定する
 */
export function shouldDeliverPreventionNews(
  weather: Weather,
  pastNewsList: News[] = []
): boolean {
  return getPendingPreventionKeywords(weather, pastNewsList).length > 0;
}

/**
 * 【一撃実行】予防NEWS自動生成パイプライン
 * 
 * 1. user.location から天気を自動取得（DB保存なし）
 * 2. 今日未配信の危険（熱中症など）を判定
 * 3. ★Geminiを1回だけ呼び出し、
 *    「写真リストから合う写真を1枚選ぶ」＋「その写真に触れた予防NEWSを作る」を一撃で同時に完了！
 * 
 * @param userOrLocation 高齢者ユーザー（User）または地名
 * @param pastNewsList 過去のNEWS（重複防止用）
 * @param familyPhotos 家族の写真ライブラリ（Media[]）
 * @param force trueにすると重複チェックを無視して強制生成（テスト用）
 * @param modelName 使用するGeminiモデル（デフォルト: gemini-3.6-flash）
 * @returns 生成結果（見出し、本文、選ばれた写真）。不要・重複時は null
 */
export async function generatePreventionNews(
  userOrLocation: User | string,
  pastNewsList: News[] = [],
  familyPhotos: Media[] = [],
  force: boolean = false,
  modelName: string = 'gemini-3.6-flash'
): Promise<PreventionNewsResult | null> {
  // --------------------------------------------------
  // ステップ1：地域名を取得して天気を取得（DB保存なし）
  // --------------------------------------------------
  const locationName = typeof userOrLocation === 'string'
    ? userOrLocation
    : userOrLocation.location;

  if (!locationName) {
    console.error('× [エラー] ユーザーの地域名（location）が設定されていません。');
    return null;
  }

  const weather = await getWeatherData(locationName);
  if (!weather) {
    console.error(`× [エラー] ${locationName} の気象データを取得できませんでした。`);
    return null;
  }

  // --------------------------------------------------
  // ステップ2：今日未配信の注意キーワードがあるか判定
  // --------------------------------------------------
  const pendingKeywords = getPendingPreventionKeywords(weather, pastNewsList);

  if (!force && pendingKeywords.length === 0) {
    console.log('[情報] 平穏な気象、または本日すでに同じ注意を配信済みのためスキップしました。');
    return null;
  }

  const requiredKeyword = pendingKeywords.length > 0
    ? pendingKeywords[0]
    : (weather.warnings?.[0] || '体調管理');

  // --------------------------------------------------
  // ステップ3：家族写真の「タグ」と「コメント」を箇条書きテキストに整形
  // --------------------------------------------------
  const photosText = familyPhotos.length > 0
    ? familyPhotos.map((p, index) => {
        const tags = p.tags?.length > 0 ? `タグ: [${p.tags.join(', ')}]` : 'タグなし';
        const caption = p.caption ? `家族コメント: 「${p.caption}」` : 'コメントなし';
        return `[写真ID: ${p.id}] ${tags} | ${caption}`;
      }).join('\n')
    : '（家族写真はありません）';

  // --------------------------------------------------
  // ステップ4：Gemini へ渡す「一撃プロンプト」を構築
  // --------------------------------------------------
  const warningText = weather.warnings?.join('・') || 'なし';

  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の温かい健康・家族アドバイザーです。
本日の気象情報と、家族が投稿してくれた写真一覧をもとに、
【写真の選定】と【おじいちゃん・おばあちゃんに向けた予防NEWSの作成】を同時に行ってください。

【本日の気象情報】
- 地域: ${weather.locationName}
- 天気: ${weather.weatherText}
- 最高気温: ${weather.temperatureMax}℃ / 最低気温: ${weather.temperatureMin}℃
- 湿度: 昼 ${weather.humidityDaytime}% / 夜 ${weather.humidityNight}%
- 降水確率: ${weather.rainProbability}%
- 発令中の警報: ${warningText}
- ★今回の最重要予防テーマ: 【 ${requiredKeyword} 】

【家族の写真候補リスト】
${photosText}

【指示とルール】
1. **写真の選定 (selectedPhotoId)**:
   - 家族写真リストの「タグ」と「家族コメント」を見て、今回の予防テーマ【${requiredKeyword}】にふさわしい写真のIDを1つ選んでください。
   - （例: 熱中症なら「麦茶」「スイカ」「冷房」「室内」、大雨なら「傘」「長靴」「お家遊び」など）
   - 全く関係ない写真しかない場合は、無理に選ばず必ず "none" と回答してください。

2. **見出し (title)**:
   - 15文字以内で、パッと注意が伝わる言葉にしてください。
   - 必ず見出しまたは本文に「${requiredKeyword}」という言葉を含めてください。

3. **本文 (message)**:
   - 80〜120文字程度で、優しく寄り添う敬語にしてください。
   - **写真を選んだ場合**: その家族写真のコメントやタグ（例: 「たろうくんが作ってくれた冷たい麦茶、おいしそうですね！」）に必ず温かく一言触れながら、具体的な予防行動（「しっかり水分をとって涼しく過ごしてくださいね」）に自然に繋げてください。
   - **写真がない場合 ("none")**: 写真には触れず、気象データに基づいた温かい予防アドバイスを作成してください。
`.trim();

  // --------------------------------------------------
  // ステップ5：Gemini API の呼び出し（たった 1 回の一撃！）
  // --------------------------------------------------
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: preventionOneShotSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini APIからの応答が空でした。');
    }

    const parsed = JSON.parse(responseText);
    const selectedId = parsed.selectedPhotoId?.trim();
    const matchedPhoto = (selectedId && selectedId !== 'none')
      ? familyPhotos.find((p) => p.id === selectedId) || null
      : null;

    return {
      title: parsed.title.trim(),
      message: `${parsed.message.trim()}（AIによる自動生成）`,
      photo: matchedPhoto,
      selectedReason: parsed.selectedReason?.trim() || '',
    };

  } catch (error) {
    console.error('× [エラー] 予防NEWS生成中にエラーが発生しました:', error);

    return {
      title: `${requiredKeyword}に注意`,
      message: `${weather.locationName}では本日、${requiredKeyword}への注意が必要です。体調に合わせてこまめに水分補給や安全な行動をしてお過ごしください。`,
      photo: null,
      selectedReason: 'APIエラーによるフォールバック',
    };
  }
}
