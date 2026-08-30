import { GoogleGenAI } from '@google/genai';
import { Media } from '../types/Media';

// Gemini API の初期化（.env の GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

/**
 * AI② NEWS生成AI
 * 写真データから高齢者向けの紹介文を生成する
 * 
 * ルール:
 *   1. 家族のコメント（caption）がある場合は最優先でそのまま届ける
 *   2. コメントがない場合は、AI（Gemini）がタグを見て温かい紹介文を自動生成する
 *   3. 自動生成した文章の末尾には「（AIによる自動生成）」と注釈をつける
 * 
 * @param photo AI①で選ばれた写真データ（Media）
 * @param modelName 使用するAIモデル（デフォルト: 'gemini-3.6-flash'）
 * @returns 高齢者向けメッセージ本文
 */
export async function generateNewsMessage(
  photo: Media,
  modelName: string = 'gemini-3.6-flash'
): Promise<string> {
  // ① 家族がコメントを書いている場合は、それを最優先でそのまま返す！
  // コメントがある∧空白文字ではない
  if (photo.caption && photo.caption.trim() !== '') {
    return photo.caption;
  }

  // ② コメントがない場合は、Gemini にタグを渡して紹介文を自動生成
  try {
    const prompt = `
あなたは高齢者向け見守りアプリのNEWS配信AIです。
家族が投稿した写真のタグ情報をもとに、おじいちゃん・おばあちゃんに向けた温かい紹介文（1〜2文程度）を作成してください。

【写真のタグ】: ${photo.tags.join(', ')}

【作成ルール】
1. 敬語で、優しく温かみのあるトーンにすること
2. 長さは1〜2文（60文字以内）で簡潔にすること
3. 写真の状況（タグ）を自然に伝えること（例: 「〜の写真が届きました。元気に過ごしているようです」など）
4. 余計な挨拶や前置き（「はい、作成しました」など）は含めず、紹介文の本文のみを出力すること
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    // AIの出力した文章を採用（万が一空っぽなら保険の文章を使う）
    const aiMessage = response.text ? response.text.trim() : '新しい写真が届きました。';

    // ★自動生成した文章の末尾に注釈をつけて返す！
    return `${aiMessage}（AIによる自動生成）`;

  } catch (error) {
    console.error('NEWS生成エラー:', error);
    return '新しい写真が届きました。（AIによる自動生成）';
  }
}
