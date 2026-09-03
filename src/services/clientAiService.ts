/**
 * clientAiService.ts
 * React Native (Expo) クライアント環境で直接動作する軽量 Gemini AI 連携サービス
 * （Node.js の fs / Buffer に依存せず、標準 fetch で動作）
 */

import type { Media } from "../types/Media";
import type { Weather } from "../types/Weather";
import type { News } from "../types/News";

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

/**
 * 基本タグ一覧（表記ゆれ防止）
 */
export const BASE_TAGS = [
  "春", "夏", "秋", "冬", "晴れ", "雨", "雪",
  "外出", "食事", "散歩", "お出かけ", "料理", "運動", "睡眠", "リラックス",
  "室内", "公園", "海", "山", "庭", "家",
  "誕生日", "運動会", "お正月", "クリスマス", "旅行", "お祭り",
  "家族", "子供", "ペット",
  "水分補給", "冷たい飲み物", "温かい飲み物", "日差し", "防寒", "暑さ対策",
] as const;

export interface GeneratedNewsContent {
  title: string;
  message: string;
}

/**
 * 画像 URI を Base64 文字列に変換する（React Native 互換）
 */
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result && result.includes(",")) {
        resolve(result.split(",")[1]);
      } else {
        resolve(result || "");
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * AI① 写真解析・自動タグ付け（クライアント版）
 */
export async function generatePhotoTagsClient(
  imageUri: string
): Promise<string[]> {
  try {
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY が設定されていません。デフォルトタグを使用します。");
      return ["家族", "思い出", "日常"];
    }

    const base64Data = await uriToBase64(imageUri);
    if (!base64Data) {
      return ["家族", "写真"];
    }

    const prompt = `
あなたは高齢者向け見守りアプリの写真分析AIです。
写真から役立つタグを抽出してください。

【基本タグ一覧（一致する場合は優先）】:
${BASE_TAGS.join(", ")}

【ルール】
- 基本タグにない場合でも、写真から明確に判断できる具体的な情報（食べ物、植物、場所など）は積極的に追加してください。
- 「人」「物体」「風景」など抽象的すぎるタグは避けてください。
- 3〜8個程度のタグを日本語のJSON配列形式（例: ["公園", "子供", "笑顔", "夏"]）だけで出力してください。
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Gemini タグ付け API エラー (${res.status}):`, await res.text());
      return ["家族", "日常", "おでかけ"];
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: any) => String(t).trim()).filter(Boolean);
      }
    }

    return ["家族", "思い出"];
  } catch (error) {
    console.error("クライアント側タグ付けエラー:", error);
    return ["家族", "日常"];
  }
}

/**
 * AI② ニュース見出し・本文の自動生成（クライアント版）
 */
export async function generateNewsContentClient(
  tags: string[],
  caption?: string
): Promise<GeneratedNewsContent> {
  const hasCaption = Boolean(caption && caption.trim() !== "");
  const trimmedCaption = caption ? caption.trim() : "";

  try {
    if (!GEMINI_API_KEY) {
      return {
        title: hasCaption ? "家族からのおたより" : "今日の家族ニュース",
        message: hasCaption ? trimmedCaption : "家族から元気な写真が届きました！",
      };
    }

    let prompt = "";
    if (hasCaption) {
      prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
写真のタグ情報と家族のコメントをもとに、おじいちゃん・おばあちゃんがワクワクする親しみやすい見出しタイトル（10〜15文字）を作成してください。

【写真のタグ】: ${tags.join(", ")}
【家族のコメント】: 「${trimmedCaption}」

JSON形式で {"title": "タイトル"} のみを出力してください。
`;
    } else {
      prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
写真のタグ情報をもとに、おじいちゃん・おばあちゃんに向けた親しみやすい「見出しタイトル（10〜15文字）」と、優しく温かみのある「紹介文（1〜2文）」を作成してください。

【写真のタグ】: ${tags.join(", ")}

JSON形式で {"title": "タイトル", "message": "紹介文"} のみを出力してください。
`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Gemini ニュース生成 API エラー (${res.status}):`, await res.text());
      return {
        title: hasCaption ? "家族からのおたより" : "今日の家族ニュース",
        message: hasCaption ? trimmedCaption : "家族から元気な写真が届きました！今日も良い一日になりますように。",
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      const parsed = JSON.parse(text);
      return {
        title: parsed.title ? String(parsed.title).trim() : (hasCaption ? "家族からのおたより" : "今日の家族ニュース"),
        message: hasCaption
          ? trimmedCaption
          : (parsed.message ? String(parsed.message).trim() : "新しい写真が届きました。元気に過ごしているようです。"),
      };
    }

    return {
      title: hasCaption ? "家族からのおたより" : "今日の家族ニュース",
      message: hasCaption ? trimmedCaption : "新しい写真が届きました。",
    };
  } catch (error) {
    console.error("クライアント側ニュース生成エラー:", error);
    return {
      title: hasCaption ? "家族からのおたより" : "今日の家族ニュース",
      message: hasCaption ? trimmedCaption : "家族から元気な写真が届きました！",
    };
  }
}

/**
 * AI③ くらしの予防ニュースの自動生成（クライアント版）
 */
export async function generatePreventionNewsClient(
  theme: string = "水分補給・熱中症予防"
): Promise<GeneratedNewsContent> {
  try {
    if (!GEMINI_API_KEY) {
      return {
        title: "こまめに水分補給を！",
        message: "喉が渇く前に少しずつお茶やお水を飲みましょう。室内でも涼しくしてお過ごしくださいね。",
      };
    }

    const prompt = `
あなたは高齢者向けニュースアプリ「MAGONEWS」の健康・予防NEWS編集AIです。
テーマ: 「${theme}」について、おじいちゃん・おばあちゃんに向けた温かく実用的な予防ニュースを作成してください。

【ルール】
- タイトルは15文字以内で簡潔に（例: 「こまめに水分補給を！」「足元に気をつけてお散歩」）
- 本文は60〜100文字程度で、分かりやすく優しい言葉で具体的な行動アドバイスを促してください。
- 最後に温かい一言を添えてください。

JSON形式で {"title": "タイトル", "message": "本文"} のみを出力してください。
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return {
        title: "こまめに水分補給を！",
        message: "喉が渇く前に少しずつお茶やお水を飲みましょう。室内でも快適な室温にしてお過ごしくださいね。",
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed.title && parsed.message) {
        return {
          title: String(parsed.title).trim(),
          message: String(parsed.message).trim(),
        };
      }
    }

    return {
      title: "こまめに水分補給を！",
      message: "喉が渇く前にお茶やお水を飲みましょう。室内でも涼しくしてお過ごしくださいね。",
    };
  } catch (error) {
    console.error("予防ニュース生成エラー:", error);
    return {
      title: "こまめに水分補給を！",
      message: "喉が渇く前にお茶やお水を飲みましょう。室内でも涼しくしてお過ごしくださいね。",
    };
  }
}

export interface PreventionNewsResultClient {
  title: string;
  message: string;
  photo: Media | null;
  selectedReason: string;
  theme: string;
}

/**
 * 気象条件から、今日まだ配信されていない「注意すべきキーワード群」を抽出する
 * （今日の過去ニュースのタイトル＋メッセージを結合したテキストを検索し、重複を検知）
 */
export function getPendingPreventionKeywords(
  weather: Weather | null | undefined,
  pastNewsList: News[] = []
): string[] {
  if (!weather) return [];

  const today = weather.date || new Date().toISOString().split("T")[0];

  // 今日の予防ニュースの「見出し」と「本文」をすべて結合して重複チェック用テキストを作成
  const todayDeliveredText = pastNewsList
    .filter((news) => news.type === "prevention" && news.createdAt.startsWith(today))
    .map((news) => `${news.title} ${news.message}`)
    .join(" ");

  const pendingKeywords: string[] = [];

  // 1. 気象庁の公式警報・注意報
  if (weather.warnings && weather.warnings.length > 0) {
    for (const warningName of weather.warnings) {
      if (!todayDeliveredText.includes(warningName)) {
        pendingKeywords.push(warningName);
      }
    }
  }

  // 2. 猛暑・熱中症リスク
  const isHeatDanger = weather.temperatureMax >= 31 || (weather.temperatureMax >= 28 && weather.humidityDaytime >= 70);
  if (isHeatDanger) {
    if (!todayDeliveredText.includes("熱中症") && !todayDeliveredText.includes("猛暑")) {
      pendingKeywords.push("熱中症");
    }
  }

  // 3. 冬の冷え込みリスク
  if (weather.temperatureMin <= 5) {
    if (!todayDeliveredText.includes("寒い") && !todayDeliveredText.includes("冷え込み")) {
      pendingKeywords.push("冷え込み");
    }
  }

  // 4. 寒暖差リスク
  if (weather.temperatureMax - weather.temperatureMin >= 10) {
    if (!todayDeliveredText.includes("寒暖差")) {
      pendingKeywords.push("寒暖差");
    }
  }

  // 5. 雨や雪によるスリップ・転倒リスク
  const isRainOrSnow = weather.rainProbability >= 50 || weather.weatherText.includes("雨") || weather.weatherText.includes("雪");
  if (isRainOrSnow) {
    const word = weather.weatherText.includes("雪") ? "雪" : "雨";
    if (!todayDeliveredText.includes("雨") && !todayDeliveredText.includes("雪")) {
      pendingKeywords.push(word);
    }
  }

  // 6. 強風リスク
  if (weather.windSpeed >= 8) {
    if (!todayDeliveredText.includes("強風") && !todayDeliveredText.includes("風が強い")) {
      pendingKeywords.push("強風");
    }
  }

  // 7. 紫外線
  if (weather.uvIndex >= 8) {
    if (!todayDeliveredText.includes("紫外線")) {
      pendingKeywords.push("紫外線");
    }
  }

  return pendingKeywords;
}

/**
 * 気象データから本日の予防テーマを自動判定する
 */
export function determinePreventionTheme(weather?: Weather | null): string {
  if (!weather) return "健康管理・こまめな水分補給";

  // 1. 猛暑・熱中症リスク
  if (weather.temperatureMax >= 31 || (weather.temperatureMax >= 28 && weather.humidityDaytime >= 70)) {
    return "熱中症・水分補給";
  }
  // 2. 冬の冷え込み
  if (weather.temperatureMin <= 5) {
    return "冷え込み・防寒対策";
  }
  // 3. 寒暖差
  if (weather.temperatureMax - weather.temperatureMin >= 10) {
    return "寒暖差・体調管理";
  }
  // 4. 雨・雪（足元の転倒リスク）
  if (weather.rainProbability >= 50 || weather.weatherText.includes("雨") || weather.weatherText.includes("雪")) {
    return "雨天・足元の滑り防止";
  }
  // 5. 強風
  if (weather.windSpeed >= 8) {
    return "強風・戸締まり";
  }
  // 6. 紫外線
  if (weather.uvIndex >= 8) {
    return "強い紫外線・日差し対策";
  }

  return "健康管理・こまめな水分補給";
}

/**
 * 【写真選定 ➡️ 予防ニュース生成】
 * 気象データと過去の家族写真の中から、予防テーマに明確に合致する写真のみをAIが選定。
 * 合致する写真がない場合は無理に選ばず写真なし（photo: null）で温かい気象予防ニュースを作成する。
 */
export async function generatePreventionNewsWithPhotoSelection(
  familyPhotos: Media[] = [],
  weatherOrTheme?: Weather | string | null,
  locationName: string = "佐賀市",
  targetKeyword?: string
): Promise<PreventionNewsResultClient> {
  const isWeatherObj = weatherOrTheme && typeof weatherOrTheme === "object";
  const weather = isWeatherObj ? (weatherOrTheme as Weather) : null;
  const theme = targetKeyword || (typeof weatherOrTheme === "string"
    ? weatherOrTheme
    : determinePreventionTheme(weather));

  const weatherDetailText = weather
    ? `地域: ${weather.locationName || locationName}, 天気: ${weather.weatherText}, 気温: 最高${weather.temperatureMax}℃/最低${weather.temperatureMin}℃, 降水確率: ${weather.rainProbability}%`
    : `地域: ${locationName}`;

  const photosText = familyPhotos.length > 0
    ? familyPhotos.map((p) => {
        const tags = p.tags && p.tags.length > 0 ? `タグ: [${p.tags.join(', ')}]` : 'タグなし';
        const caption = p.caption ? `家族コメント: 「${p.caption}」` : 'コメントなし';
        return `[写真ID: ${p.id}] ${tags} | ${caption}`;
      }).join('\n')
    : '（家族写真はありません）';

  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の健康アドバイザーAIです。
本日の気象状況【${weatherDetailText}】と予防テーマ【${theme}】に基づき、
家族写真の選定およびおじいちゃん・おばあちゃんに向けた予防NEWS記事を作成してください。

【家族の写真候補リスト】
${photosText}

【厳格な選定ルール】
1. **写真の選定 (selectedPhotoId)**:
   - 候補写真の「タグ」と「家族コメント」を確認し、今回のテーマ【${theme}】に【明確に関連している写真がある場合のみ】その写真IDを指定してください。
   - （例: 水分補給なら「麦茶・水・飲み物」、雨天なら「傘・長靴・雨」、散歩・転倒なら「公園・靴・外遊び」など）
   - ★重要★ テーマに明確に合致する写真がない場合や写真がない場合は、絶対に無理に関係の薄い写真を選ばず、必ず "none" と回答してください。

2. **選定理由 (selectedReason)**:
   - なぜその写真を選んだか、または写真がない（none）と判断した理由を簡潔に述べてください。

3. **見出し (title)**:
   - 15文字以内で、パッと注意が伝わる温かい見出しにしてください。

4. **本文 (message)**:
   - 80〜120文字程度で、優しく寄り添う敬語にしてください。
   - **写真を選んだ場合**: その家族写真の思い出に必ず触れつつ、予防アドバイスに繋げてください。
   - **写真がない場合 ("none")**: 写真には一切触れず、気象状況に基づいた温かい予防アドバイスを作成してください。

5. **★最重要ルール（重複防止）★**:
   - 1日に何度も同じテーマのニュースが配信されるのを防ぐため、**必ず見出し(title)または本文(message)の中にキーワード「${theme}」という言葉を含めてください**。

JSON形式で以下のキーのみを出力してください:
{
  "selectedPhotoId": "合致する写真IDまたはnone",
  "selectedReason": "選定理由またはnoneの理由",
  "title": "見出しタイトル",
  "message": "本文メッセージ"
}
`.trim();

  try {
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY が未設定のため、デフォルトの予防ニュースを返します。");
      return {
        title: "今日もお元気にお過ごしください",
        message: "体調に気をつけて、こまめに水分補給をしながら快適にお過ごしくださいね。（AI予防ニュース）",
        photo: null,
        selectedReason: "APIキー未設定のため写真なしで配信",
        theme,
      };
    }

    // gemini-2.5-flash または gemini-1.5-flash を呼び出し
    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    let text: string | undefined;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) break;
        } else {
          console.warn(`Geminiモデル ${model} 応答エラー:`, res.status);
        }
      } catch (callError) {
        console.warn(`Geminiモデル ${model} 呼び出し失敗:`, callError);
      }
    }

    if (text) {
      const parsed = JSON.parse(text);
      const selectedId = parsed.selectedPhotoId ? String(parsed.selectedPhotoId).trim() : "none";
      const matchedPhoto = (selectedId && selectedId !== "none")
        ? familyPhotos.find((p) => p.id === selectedId) || null
        : null;

      return {
        title: parsed.title ? String(parsed.title).trim() : "今日もお元気にお過ごしください",
        message: parsed.message ? `${String(parsed.message).trim()}（AI予防ニュース）` : "体調に気をつけて元気に過ごしましょう。（AI予防ニュース）",
        photo: matchedPhoto,
        selectedReason: parsed.selectedReason ? String(parsed.selectedReason).trim() : (matchedPhoto ? "テーマに合致する写真を選定" : "合致する写真なし"),
        theme,
      };
    }

    throw new Error("応答の取得またはパースに失敗しました");
  } catch (error) {
    console.warn("予防ニュース・写真選定エラー:", error);
    // エラー時も無関係な写真は決して選ばず、photo: null で安全に配信する
    return {
      title: "今日もお元気にお過ごしください",
      message: "体調に気をつけて、こまめな水分補給と快適な室温でお過ごしくださいね。（AI予防ニュース）",
      photo: null,
      selectedReason: "エラー時の安全な代替配信（写真なし）",
      theme,
    };
  }
}
