import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Media } from '../types/Media';
import { GeneratedNewsContent } from './newsGenerateService';

// Gemini API クライアントの初期化（環境変数 GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

// JSON出力用のスキーマ定義
const photoMatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matchedPhotoId: {
      type: Type.STRING,
      description: '予防NEWSの内容・文脈に最も合致する写真のID。適切な写真がない場合は "none"',
    },
    reason: {
      type: Type.STRING,
      description: 'その写真を選んだ理由、または適切な写真がないと判断した理由（簡潔に30文字程度）',
    },
  },
  required: ['matchedPhotoId', 'reason'],
};

/**
 * AI④ 予防NEWSに適した写真の選択AI
 * 
 * 予防NEWSの内容（タイトル・本文）を分析し、家族の写真ライブラリの中から
 * 最も内容・文脈にマッチする写真（Media）を1枚選定する。
 * 
 * 適切な写真がない場合は無理に選ばず null を返す（➔ AI⑤イラスト生成へ繋ぐ）。
 * 
 * @param newsContent 予防NEWSの見出しと本文（{ title, message }）
 * @param photos 家族の写真リスト（Media[]）
 * @param modelName 使用するGeminiモデル（デフォルト: gemini-3.6-flash）
 * @returns マッチした写真（Media）と選定理由。適切な写真がない場合は photo: null
 */
export async function selectPhotoForPreventionNews(
  newsContent: GeneratedNewsContent,
  photos: Media[],
  modelName: string = 'gemini-3.6-flash'
): Promise<{ photo: Media | null; reason: string }> {
  // 写真が1枚もない場合は即座に null
  if (!photos || photos.length === 0) {
    return { photo: null, reason: '写真ライブラリが空のため適合写真なし' };
  }

  // --------------------------------------------------
  // ステップ1：写真候補のリストをテキストに整形
  // --------------------------------------------------
  const photoCandidatesText = photos.map((p, index) => {
    const caption = p.caption ? `家族コメント: 「${p.caption}」` : 'コメントなし';
    const tags = p.tags && p.tags.length > 0 ? `タグ: [${p.tags.join(', ')}]` : 'タグなし';
    return `[写真${index + 1}] ID: ${p.id} | ${tags} | ${caption}`;
  }).join('\n');

  // --------------------------------------------------
  // ステップ2：Geminiへ渡すプロンプトを構築
  // --------------------------------------------------
  const prompt = `
あなたは高齢者向け見守りアプリ「MAGONEWS」の写真選定AIです。
以下の【配信予定の予防NEWS】の挿絵・アイキャッチとして、
【家族の写真候補リスト】の中から、最も内容や文脈（テーマ、季節、行動など）にピッタリ合致する写真を1つ選んでください。

【配信予定の予防NEWS】
- 見出し: ${newsContent.title}
- 本文  : ${newsContent.message}

【家族の写真候補リスト】
${photoCandidatesText}

【判定ルール】
1. **意味の合致を最優先**:
   - 例: 「熱中症・水分補給」のNEWS ➔ 「麦茶」「スイカ」「冷房」「室内での休憩」などの写真が合致
   - 例: 「大雨・雨天」のNEWS ➔ 「傘」「雨」「長靴」「お家遊び」などの写真が合致
   - 例: 「寒さ・冷え込み」のNEWS ➔ 「こたつ」「鍋」「暖かい上着」「雪遊び」などの写真が合致

2. **無理な選定は絶対NG（重要）**:
   - 予防内容と全く関係のない写真（例: 熱中症の注意なのに、犬の散歩や冬の雪だるまの写真など）しかない場合は、
     おじいちゃんが混乱するため、絶対に選ばず matchedPhotoId に "none" と回答してください。
`.trim();

  // --------------------------------------------------
  // ステップ3：Gemini API の呼び出し（構造化JSON出力）
  // --------------------------------------------------
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: photoMatchSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini APIからの応答が空でした。');
    }

    const result = JSON.parse(responseText);
    const selectedId = result.matchedPhotoId?.trim();
    const reason = result.reason?.trim() || '';

    // "none" や空文字の場合は「適合写真なし」と判定
    if (!selectedId || selectedId === 'none') {
      console.log(`[情報] 予防NEWSに合致する家族写真なし（理由: ${reason}）`);
      return { photo: null, reason };
    }

    // IDから該当する Media オブジェクトを検索
    const matchedPhoto = photos.find((p) => p.id === selectedId) || null;

    if (matchedPhoto) {
      console.log(`[選定成功] 予防NEWSに合致する写真を選定（ID: ${matchedPhoto.id}, 理由: ${reason}）`);
      return { photo: matchedPhoto, reason };
    } else {
      return { photo: null, reason: '選定されたIDの写真が見つかりませんでした' };
    }

  } catch (error) {
    console.error('× [エラー] 予防NEWS写真選定中にエラーが発生しました:', error);
    return { photo: null, reason: 'APIエラーによる選定失敗' };
  }
}
