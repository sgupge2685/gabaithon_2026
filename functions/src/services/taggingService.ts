import * as fs from "fs";
import {GoogleGenAI, Type} from "@google/genai";

/**
 * 基本タグ一覧（表記ゆれを防ぐための標準ボキャブラリー）
 */
export const BASE_TAGS = [
  // 季節・気候
  "春", "夏", "秋", "冬", "晴れ", "雨", "雪",
  // 行動・シチュエーション
  "外出", "食事", "散歩", "お出かけ", "料理", "運動", "睡眠", "リラックス",
  // 場所
  "室内", "公園", "海", "山", "庭", "家",
  // イベント
  "誕生日", "運動会", "お正月", "クリスマス", "旅行", "お祭り",
  // 人物・関係
  "家族", "子供", "ペット",
  // 予防・健康テーマに関連する代表語
  "水分補給", "冷たい飲み物", "温かい飲み物", "日差し", "防寒", "暑さ対策",
] as const;

/**
 * 写真の自動タグ付けAI。
 *
 * @param {string} imageInput 画像のファイルパス、URL、またはBase64文字列。
 * @param {string} modelName 使用するAIモデル。
 * @param {string} [apiKey] Gemini APIキー。
 * @return {Promise<string[]>} 生成されたタグの配列。
 */
export async function generatePhotoTags(
  imageInput: string,
  modelName: string = "gemini-3.6-flash",
  apiKey?: string
): Promise<string[]> {
  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
    });
    let base64Data = "";
    let mimeType = "image/jpeg";

    // --------------------------------------------------
    // ① 渡されたデータが「ネットのURL」の場合（https://...）
    // --------------------------------------------------
    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
      const response = await fetch(imageInput);
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");

      const rawContentType = response.headers.get("content-type");
      const contentType = rawContentType ?
        rawContentType.toLowerCase().split(";")[0].trim() :
        "";
      const allowedTypes = [
        "image/jpeg", "image/jpg", "image/png",
        "image/heic", "image/heif", "image/webp",
      ];

      if (contentType && allowedTypes.includes(contentType)) {
        mimeType = (contentType === "image/jpg") ? "image/jpeg" : contentType;
      } else {
        console.error(
          `✕ ネットのURLが対応画像形式ではありません: ${
            rawContentType || "不明"
          }（対応形式: jpg, jpeg, png, heic, heif, webp）`
        );
        return [];
      }

    // --------------------------------------------------
    // ② 渡されたデータが「パソコン内のファイルパス」の場合（tests/images/xxx.jpg）
    // --------------------------------------------------
    } else if (fs.existsSync(imageInput)) {
      const buffer = fs.readFileSync(imageInput);
      base64Data = buffer.toString("base64");

      const lower = imageInput.toLowerCase();
      if (lower.endsWith(".png")) {
        mimeType = "image/png";
      } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
        mimeType = "image/jpeg";
      } else if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
        mimeType = "image/heic"; // iPhone 写真対応
      } else if (lower.endsWith(".webp")) {
        mimeType = "image/webp";
      } else {
        console.error(
          `✕ 未対応の画像形式です: ${imageInput}（対応形式: jpg, jpeg, png, heic, heif, webp）`
        );
        return [];
      }

    // --------------------------------------------------
    // ③ 渡されたデータが「すでにBase64の文字列」の場合
    // --------------------------------------------------
    } else {
      // ヘッダー（data:image/xxx;base64,）付きの場合
      const headerMatch = imageInput.match(/^data:(image\/\w+);base64,/i);

      if (headerMatch) {
        const headerType = headerMatch[1].toLowerCase();
        const allowed = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/heic",
          "image/heif",
          "image/webp",
        ];
        if (allowed.includes(headerType)) {
          mimeType = (headerType === "image/jpg") ? "image/jpeg" : headerType;
        } else {
          console.error(
            `✕ 未対応のBase64画像形式です: ${headerType}（対応形式: ` +
            "jpg, jpeg, png, heic, heif, webp）"
          );
          return [];
        }
      } else {
        // ヘッダーがない生Base64の場合、先頭のマジックバイトから判定
        if (imageInput.startsWith("/9j/")) {
          mimeType = "image/jpeg";
        } else if (imageInput.startsWith("iVBORw0KGgo")) {
          mimeType = "image/png";
        } else if (imageInput.startsWith("UklGR")) {
          mimeType = "image/webp";
        } else if (
          imageInput.startsWith("AAAA") ||
          imageInput.includes("ftypheic") ||
          imageInput.includes("ftypmif1")
        ) {
          mimeType = "image/heic"; // iPhone 写真
        } else {
          console.error(
            "✕ 不明なBase64データです（jpg, jpeg, png, heic, heif, webp の" +
            "いずれでもありません）"
          );
          return [];
        }
      }

      // 余計なヘッダーを除去して純粋なBase64にする
      base64Data = imageInput.replace(/^data:image\/\w+;base64,/i, "");
    }

    // --------------------------------------------------
    // ④ Gemini 3.6 に画像を投げてタグを生成！
    // --------------------------------------------------
    const prompt = `
あなたは高齢者向け予防型見守りアプリの写真分析AIです。
写真から役立つタグを抽出してください。

【タグ付けの方針】
1. 基本タグの優先:
   以下の「基本タグ一覧」に含まれる概念と写真の内容が一致する場合は、その表記を優先して使用してください。
   【基本タグ一覧】: ${BASE_TAGS.join(", ")}

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
            data: base64Data,
            mimeType: mimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
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
    console.error("タグ生成中にエラーが発生しました:", error);
    return [];
  }
}
