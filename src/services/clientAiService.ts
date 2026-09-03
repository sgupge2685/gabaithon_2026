/**
 * clientAiService.ts
 * React Native (Expo) クライアント環境で直接動作する軽量 Gemini AI 連携サービス
 * （Node.js の fs / Buffer に依存せず、標準 fetch で動作）
 */

import type { Media } from "../types/Media";

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
}

/**
 * 【写真選定 ➡️ 予防ニュース生成】
 * 過去の家族写真の中から予防テーマに最も合致する写真をAIが1枚選定し、
 * その写真の思い出に触れながら温かい予防ニュースを作成する。
 */
export async function generatePreventionNewsWithPhotoSelection(
  familyPhotos: Media[] = [],
  theme: string = "熱中症・水分補給",
  locationName: string = "佐賀市"
): Promise<PreventionNewsResultClient> {
  const photosText = familyPhotos.length > 0
    ? familyPhotos.map((p) => {
        const tags = p.tags && p.tags.length > 0 ? `タグ: [${p.tags.join(', ')}]` : 'タグなし';
        const caption = p.caption ? `家族コメント: 「${p.caption}」` : 'コメントなし';
        return `[写真ID: ${p.id}] ${tags} | ${caption}`;
      }).join('\n')
    : '（家族写真はありません）';

  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の温かい健康・家族アドバイザーです。
本日の地域【${locationName}】の予防テーマ【${theme}】と、家族が過去に投稿した写真一覧をもとに、
【写真の選定】と【おじいちゃん・おばあちゃんに向けた予防NEWSの作成】を行ってください。

【家族の写真候補リスト】
${photosText}

【ルール】
1. **写真の選定 (selectedPhotoId)**:
   - 家族写真リストの「タグ」と「家族コメント」を見て、今回の予防テーマ【${theme}】に最もふさわしい写真のIDを1つ選んでください。
   - （例: 熱中症や水分補給なら「麦茶」「スイカ」「冷たい飲み物」「水遊び」、散歩・転倒なら「公園」「靴」「外遊び」など）
   - 全く関係ない写真しかない場合や写真がない場合は、無理に選ばず必ず "none" としてください。

2. **見出し (title)**:
   - 15文字以内で、パッと注意が伝わる温かい見出しにしてください。

3. **本文 (message)**:
   - 80〜120文字程度で、優しく寄り添う言葉にしてください。
   - **写真を選んだ場合**: その写真のコメントやタグ（例: 「みんなで飲んだ冷たい麦茶、おいしかったですね！」など）に必ず温かく触れながら、具体的な予防行動（「今日もこまめに水分をとって涼しく過ごしてくださいね」など）に繋げてください。
   - **写真がない場合 ("none")**: 写真には触れず、気象・テーマに基づいた温かい予防アドバイスを作成してください。

JSON形式で以下のキーのみを出力してください:
{
  "selectedPhotoId": "選んだ写真IDまたはnone",
  "selectedReason": "選んだ理由",
  "title": "見出しタイトル",
  "message": "本文メッセージ"
}
`.trim();

  try {
    if (!GEMINI_API_KEY) {
      const fallbackPhoto = familyPhotos.find(p => p.tags?.some(t => t.includes("麦茶") || t.includes("水") || t.includes("飲み物"))) || (familyPhotos.length > 0 ? familyPhotos[0] : null);
      return {
        title: "こまめに水分補給を！",
        message: fallbackPhoto
          ? `以前の「${fallbackPhoto.caption || "家族との写真"}」のように、喉が渇く前にこまめにお茶やお水を飲んで元気に過ごしてくださいね。（AI予防ニュース）`
          : "喉が渇く前に少しずつお茶やお水を飲みましょう。室内でも涼しくしてお過ごしくださいね。（AI予防ニュース）",
        photo: fallbackPhoto,
        selectedReason: fallbackPhoto ? "水分補給に関連する写真を選定" : "写真なし",
      };
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
      throw new Error(`Gemini APIエラー: ${res.status}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text);
      const selectedId = parsed.selectedPhotoId ? String(parsed.selectedPhotoId).trim() : "none";
      const matchedPhoto = (selectedId && selectedId !== "none")
        ? familyPhotos.find((p) => p.id === selectedId) || null
        : null;

      return {
        title: parsed.title ? String(parsed.title).trim() : "こまめに水分補給を！",
        message: parsed.message ? `${String(parsed.message).trim()}（AI予防ニュース）` : "こまめに水分補給をして元気に過ごしましょう。（AI予防ニュース）",
        photo: matchedPhoto,
        selectedReason: parsed.selectedReason ? String(parsed.selectedReason).trim() : "",
      };
    }

    throw new Error("応答のパースに失敗しました");
  } catch (error) {
    console.warn("予防ニュース・写真選定エラー:", error);
    const fallbackPhoto = familyPhotos.length > 0 ? familyPhotos[0] : null;
    return {
      title: "こまめに水分補給を！",
      message: fallbackPhoto
        ? `家族の写真のように、今日も元気にお茶やお水を飲んで涼しくお過ごしくださいね。（AI予防ニュース）`
        : "喉が渇く前に少しずつお茶やお水を飲みましょう。室内でも涼しくしてお過ごしくださいね。（AI予防ニュース）",
      photo: fallbackPhoto,
      selectedReason: "フォールバック選定",
    };
  }
}
