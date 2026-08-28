import { GoogleGenAI, Type } from '@google/genai';

// Gemini API の初期化（.env の GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

/**
 * 基本タグ一覧（表記ゆれを防ぐための標準ボキャブラリー）
 */
export const BASE_TAGS = [
  // 季節・気候
  '春', '夏', '秋', '冬', '晴れ', '雨', '雪',
  // 行動・シチュエーション
  '外出', '食事', '散歩', 'お出かけ', '料理', '運動', '睡眠', 'リラックス',
  // 場所
  '室内', '公園', '海', '山', '庭', '家',
  // イベント
  '誕生日', '運動会', 'お正月', 'クリスマス', '旅行', 'お祭り',
  // 人物・関係
  '家族', '子供', 'ペット',
  // 予防・健康テーマに関連する代表語
  '水分補給', '冷たい飲み物', '温かい飲み物', '日差し', '防寒', '暑さ対策'
] as const;

/**
 * 写真の自動タグ付けAI
 * JPEG, PNG, WebP 等の画像から、方針に沿った日本語タグ（3〜8個）を生成する
 * 
 * @param imageBase64 画像のBase64文字列データ
 * @param mimeType 画像の形式（省略時はBase64またはデフォルトから自動判定）
 * @param modelName 使用するAIモデル（デフォルト: 'gemini-3.6-flash'）
 * @returns 生成されたタグの配列（例: ['家族', '食事', 'かき氷', '夏']）
 */
export async function generatePhotoTags(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  modelName: string = 'gemini-3.6-flash'
): Promise<string[]> {
  try {
    // PNG などのデータヘッダーが含まれている場合は自動判定
    let detectedMimeType = mimeType;
    if (imageBase64.startsWith('data:image/png') || imageBase64.startsWith('iVBORw0KGgo')) {
      detectedMimeType = 'image/png';
    } else if (imageBase64.startsWith('data:image/webp')) {
      detectedMimeType = 'image/webp';
    }

    // "data:image/jpeg;base64," のようなプレフィックスがあれば純粋なBase64に除去
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
あなたは高齢者向け予防型見守りアプリの写真分析AIです。
写真から役立つタグを抽出してください。

【タグ付けの方針】
1. 基本タグの優先:
   以下の「基本タグ一覧」に含まれる概念と写真の内容が一致する場合は、その表記を優先して使用してください。
   【基本タグ一覧】: ${BASE_TAGS.join(', ')}

2. 具体的なタグの自由追加:
   基本タグにない場合でも、写真から明確に判断できる具体的な情報（食べ物、飲み物、植物、遊具、具体的な場所など）は積極的に新しいタグとして追加してください。
   （例：「かき氷」「麦茶」「スイカ」「ブランコ」「ひまわり」「エアコン」など）

3. 避けるべきタグ:
   「人」「人間」「人物」「物体」「風景」「写真」など、抽象的すぎて検索や予防情報との関連付けに役立たないタグは付与しないでください。
   写真から明確に判断できない憶測の情報もタグにしないでください。

4. タグの数:
   写真の情報量に応じて 3〜8個 程度を出力してください（無理に増やす必要はありません）。
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: detectedMimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    if (response.text) {
      const tags: string[] = JSON.parse(response.text);
      return tags;
    }

    return [];
  } catch (error) {
    console.error('タグ生成中にエラーが発生しました:', error);
    return [];
  }
}
