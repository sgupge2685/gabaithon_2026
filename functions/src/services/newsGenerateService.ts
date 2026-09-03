import { GoogleGenAI, Type } from "@google/genai";

/**
 * 生成されたNEWSコンテンツの形式（タイトルと本文のセット）
 */
export interface GeneratedNewsContent {
  title: string;   // AIが生成した見出しタイトル（10〜15文字）
  message: string; // 家族コメント（最優先）または AI生成紹介文
}

/**
 * AI② NEWS生成AI (Cloud Functions用)
 * 写真データ（タグ・家族コメント）から高齢者向けの「タイトル（見出し）」と「紹介文」を同時に生成する
 *
 * @param photo 写真データ（tags, caption）
 * @param modelName 使用するAIモデル（デフォルト: 'gemini-3.6-flash'）
 * @param apiKey Gemini APIキー
 * @returns 生成されたタイトルと本文のオブジェクト
 */
export async function generateNewsMessage(
  photo: { tags: string[]; caption?: string },
  modelName: string = "gemini-3.6-flash",
  apiKey?: string
): Promise<GeneratedNewsContent> {
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });

    // ==================================================
    // 【分岐①】家族のコメントがある場合
    // （本文は家族の言葉そのまま！タイトルだけAIが生成）
    // ==================================================
    if (photo.caption && photo.caption.trim() !== "") {
      const captionText = photo.caption.trim();

      const prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
家族が投稿した写真のタグと、家族からのコメントをもとに、おじいちゃん・おばあちゃんがワクワクする「親しみやすいタイトル（見出し）」を1つ作成してください。

【写真のタグ】: ${photo.tags.join(", ")}
【家族のコメント】: 「${captionText}」

【ルール】
- 10〜15文字以内で、ニュースや写真アルバムの見出しのように簡潔で温かいタイトルにすること
- （例: 「元気に公園あそび！」「おいしいお食事タイム」「みんなでお出かけ」など）
`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
            },
            required: ["title"],
          },
        },
      });

      let title = "家族からのおたより";
      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.title) title = data.title.trim();
      }

      return {
        title: title,
        message: captionText,
      };

    // ==================================================
    // 【分岐②】家族のコメントがない場合
    // （タグからタイトルと紹介文の両方をAIが自動生成！）
    // ==================================================
    } else {
      const prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
家族が投稿した写真のタグ情報をもとに、おじいちゃん・おばあちゃんに向けた「タイトル（見出し）」と「温かい紹介文」を作成してください。

【写真のタグ】: ${photo.tags.join(", ")}

【作成ルール】
1. タイトル（title）:
   - 10〜15文字以内で、パッと状況がわかる親しみやすいタイトルにすること
   - 例: 「元気に公園あそび！」「冷たい麦茶でひと休み」「元気にお散歩中」など

2. 本文（message）:
   - 敬語で、優しく温かみのあるトーンにすること（1〜2文程度）
   - 写真の状況（タグ）を自然に伝えること（例: 「〜の写真が届きました。元気に過ごしているようです」など）
   - 余計な挨拶や前置きは含めず、紹介文のみにすること
`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
            },
            required: ["title", "message"],
          },
        },
      });

      let title = "今日の家族ニュース";
      let message = "新しい写真が届きました。元気に過ごしているようです。";

      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.title) title = data.title.trim();
        if (data.message) message = data.message.trim();
      }

      return {
        title: title,
        message: message,
      };
    }
  } catch (error) {
    console.error("Functions内NEWS生成エラー:", error);
    const hasCaption = photo.caption && photo.caption.trim() !== "";
    return {
      title: hasCaption ? "家族からのおたより" : "今日の家族ニュース",
      message: hasCaption
        ? photo.caption!.trim()
        : "新しい写真が届きました。",
    };
  }
}
