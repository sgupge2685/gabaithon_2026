import { GoogleGenAI } from '@google/genai';
import { GeneratedNewsContent } from './newsGenerateService';

// Gemini API クライアントの初期化（環境変数 GEMINI_API_KEY を自動読み込み）
const ai = new GoogleGenAI({});

/**
 * 画像生成結果のインターフェース
 */
export interface GeneratedImageResult {
  base64: string;     // 純粋なBase64文字列（Firebase Storageアップロード用）
  dataUrl: string;    // data:image/jpeg;base64,... 形式（アプリ画面で即表示可能）
  promptUsed: string; // 実際に使用した生成プロンプト（確認・デバッグ用）
}

/**
 * AI⑤ イラスト生成AI
 * 
 * 予防NEWSの内容（タイトル・本文）をもとに、Nano Banana 2 (Gemini 3.1 Flash Image) を使用して
 * 高齢者向けの温かい「絵本・水彩風の予防イラスト（アスペクト比 4:3）」を自動生成する。
 * 
 * ★重要ルール:
 * 高齢者の混乱（知らない人の顔・不気味の谷）を防ぐため、
 * 【人物（人間・顔・手・体）は絶対に描かない】静物・風景・アイテムのみの絵本風イラストに限定する。
 * 
 * @param newsContent 予防NEWSの見出しと本文（{ title, message }）
 * @param modelName 使用するモデル（デフォルト: 'gemini-3.1-flash-image' 【Nano Banana 2】）
 * @returns 生成された画像のBase64データ。エラー時は null
 */
export async function generatePreventionIllustration(
  newsContent: GeneratedNewsContent,
  modelName: string = 'gemini-3.1-flash-image'
): Promise<GeneratedImageResult | null> {
  try {
    // --------------------------------------------------
    // ステップ1：NEWS内容から、描くべきモチーフを決定（人物は完全排除）
    // --------------------------------------------------
    const textToAnalyze = `${newsContent.title} ${newsContent.message}`;

    let motifDescription = 'a peaceful cozy room, a window with gentle sunlight, a warm cup on a wooden table';

    if (textToAnalyze.includes('熱中症') || textToAnalyze.includes('猛暑') || textToAnalyze.includes('水分')) {
      motifDescription = 'a cold glass of barley tea with ice cubes, fresh watermelon slice, a retro small electric fan, summer indoor scene';
    } else if (textToAnalyze.includes('雨') || textToAnalyze.includes('大雨') || textToAnalyze.includes('傘')) {
      motifDescription = 'a cute colorful umbrella and rain boots beside a window with gentle raindrops, blooming hydrangea flowers';
    } else if (textToAnalyze.includes('寒い') || textToAnalyze.includes('冷え込み') || textToAnalyze.includes('雪')) {
      motifDescription = 'a steaming hot green tea cup on a cozy kotatsu table, a soft wool knit scarf, warm fireplace light';
    } else if (textToAnalyze.includes('雷') || textToAnalyze.includes('風')) {
      motifDescription = 'a cozy quiet house seen from outside under rainclouds, warm amber light shining through the window';
    }

    // --------------------------------------------------
    // ステップ2：Nano Banana 2 向けのプロンプトを構築（人物排除・4:3比率）
    // --------------------------------------------------
    const prompt = `
A heartwarming watercolor picture-book style illustration of ${motifDescription}.
Soft pastel color palette, gentle hand-drawn texture, peaceful and comforting atmosphere.
CRITICAL RULES:
- Absolutely NO people, NO humans, NO human faces, NO hands, NO bodies. Still life and cozy scenery only.
- NO text, NO letters, NO words, NO typography, NO watermark.
- Clean, simple, easy-to-see composition suitable for elderly viewers.
- Horizontal 4:3 landscape ratio composition.
`.trim();

    console.log(`[情報] イラスト生成開始 (モデル: ${modelName}, アスペクト比: 4:3, モチーフ: ${newsContent.title})`);

    // --------------------------------------------------
    // ステップ3：画像生成 API の呼び出し（二重化対応）
    // --------------------------------------------------
    let base64Bytes: string | null = null;

    try {
      // 方式A: generateImages（画像生成専用エンドポイント / 4:3指定）
      const response = await ai.models.generateImages({
        model: modelName,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '4:3', // ★4:3アスペクト比
        },
      });
      base64Bytes = response.generatedImages?.[0]?.image?.imageBytes ?? null;
    } catch (err) {
      // 方式B: generateContent（マルチモーダル生成エンドポイント）
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      // レスポンスの parts からインライン画像データを抽出
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content?.parts || []) {
          if ('inlineData' in part && part.inlineData?.data) {
            base64Bytes = part.inlineData.data;
            break;
          }
        }
      }
    }

    if (!base64Bytes) {
      throw new Error('API から画像データが返却されませんでした。');
    }

    const dataUrl = `data:image/jpeg;base64,${base64Bytes}`;

    console.log('[成功] 4:3 予防イラストの生成が完了しました！');

    return {
      base64: base64Bytes,
      dataUrl: dataUrl,
      promptUsed: prompt,
    };

  } catch (error) {
    console.error('× [エラー] イラスト生成中にエラーが発生しました:', error);
    return null;
  }
}
