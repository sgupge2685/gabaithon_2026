import { GoogleGenAI, Type } from '@google/genai';
import { Media } from '../types/Media';

const ai = new GoogleGenAI({});

/**
 * 生成されたNEWSコンテンツの形式（タイトルと本文のセット）
 */
export interface GeneratedNewsContent {
  title: string;   // AIが生成した見出しタイトル（10〜15文字）
  message: string; // 家族コメント（最優先）または AI生成紹介文
}

/**
 * AI② NEWS生成AI
 * 写真データ（タグ・家族コメント）から高齢者向けの「タイトル（見出し）」と「紹介文」を同時に生成する
 * 
 * 動作ルール:
 *   1. 家族コメントがある場合:
 *      - タイトル: 家族コメントとタグをもとにAIが親しみやすい見出しを自動生成
 *      - 本文: 家族のコメントを最優先し、無加工でそのまま届ける
 *   2. 家族コメントがない場合:
 *      - タイトル: 写真のタグをもとにAIが親しみやすい見出しを自動生成
 *      - 本文: 写真のタグをもとにAIが温かい紹介文を自動生成し、末尾に「（AIによる自動生成）」と注釈を付与
 * 
 * @param photo AI①で選択された写真データ（Media）
 * @param modelName 使用するAIモデル（デフォルト: 'gemini-3.6-flash'）
 * @returns 生成されたタイトルと本文のオブジェクト（GeneratedNewsContent）
 */
export async function generateNewsMessage(
  photo: Media,
  modelName: string = 'gemini-3.6-flash'
): Promise<GeneratedNewsContent> {
  try {
    // ==================================================
    // 【分岐①】家族のコメントがある場合
    // （本文は家族の言葉そのまま！タイトルだけAIが生成）
    // ==================================================
    if (photo.caption && photo.caption.trim() !== '') {
      const captionText = photo.caption.trim();

      const prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
家族が投稿した写真のタグと、家族からのコメントをもとに、おじいちゃん・おばあちゃんがワクワクする「親しみやすいタイトル（見出し）」を1つ作成してください。

【写真のタグ】: ${photo.tags.join(', ')}
【家族のコメント】: 「${captionText}」

【ルール】
- 10〜15文字以内で、新聞や写真アルバムの見出しのように簡潔で温かいタイトルにすること
- （例: 「元気に公園あそび！」「おいしいお食事タイム」「みんなでお出かけ」など）
`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
            },
            required: ['title'],
          },
        },
      });

      let title = '家族からのおたより';
      if (response.text) {
        const data = JSON.parse(response.text);
        if (data.title) title = data.title.trim();
      }

      return {
        title: title,
        message: captionText // ★家族の言葉はそのまま！
      };

    // ==================================================
    // 【分岐②】家族のコメントがない場合（else）
    // （タグからタイトルと紹介文の両方をAIが自動生成！）
    // ==================================================
    } else {
      const prompt = `
あなたは高齢者向け見守りアプリのNEWS編集AIです。
家族が投稿した写真のタグ情報をもとに、おじいちゃん・おばあちゃんに向けた「タイトル（見出し）」と「温かい紹介文」を作成してください。

【写真のタグ】: ${photo.tags.join(', ')}

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
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
            },
            required: ['title', 'message'],
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        return {
          title: data.title ? data.title.trim() : '今日の家族NEWS',
          message: `${data.message ? data.message.trim() : '新しい写真が届きました。'}（AIによる自動生成）`
        };
      }

      return {
        title: '今日の家族NEWS',
        message: '新しい写真が届きました。（AIによる自動生成）'
      };
    }

  // ==================================================
  // 【万が一のエラー時】
  // ==================================================
  } catch (error) {
    console.error('NEWS生成エラー:', error);
    const hasCaption = photo.caption && photo.caption.trim() !== '';
    return {
      //コメントがある場合→家族からのお便り
      title: hasCaption ? '家族からのおたより' : '今日の家族NEWS',
      //コメントがある場合→コメント．ない場合→新しい写真が届きました
      message: hasCaption ? photo.caption!.trim() : '新しい写真が届きました。'
    };
  }
}
