import {setGlobalOptions} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onObjectFinalized} from "firebase-functions/v2/storage";

import {generatePhotoTags} from "./services/taggingService";

import {GoogleGenAI} from "@google/genai";

import {initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();

setGlobalOptions({
  maxInstances: 10,
});

const GEMINI_API_KEY =
  defineSecret("GEMINI_API_KEY");

// ============================================================
// NEWS本文生成
// ============================================================

const generateNewsContent = async (
  tags: string[],
  caption: string,
  apiKey: string
): Promise<{
  title: string;
  message: string;
}> => {
  const ai = new GoogleGenAI({
    apiKey,
  });

  const tagText =
    tags.length > 0
      ? tags.join("、")
      : "家族の写真";

  const captionText =
    caption.trim() !== ""
      ? caption.trim()
      : "コメントなし";

  const prompt = `
あなたは高齢者向けニュースアプリ
「MAGONEWS」の文章作成AIです。

家族から送られた写真について、
高齢者が読みやすく、
温かい気持ちになるNEWSを作成してください。

写真のタグ:
${tagText}

家族からのコメント:
${captionText}

以下のルールを守ってください。

・タイトルは20文字程度
・本文は60〜120文字程度
・高齢者にも分かりやすい日本語
・難しい言葉を使わない
・写真にない情報を勝手に作らない
・家族からのコメントがある場合は内容を活かす
・写真について自然に紹介する
・最後は温かい一言で終える

JSON形式で以下だけを返してください。

{
  "title": "タイトル",
  "message": "本文"
}
`;

  const response =
    await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType:
          "application/json",
      },
    });

  const text =
    response.text?.trim();

  if (!text) {
    throw new Error(
      "NEWS生成AIから回答を取得できませんでした。"
    );
  }

  const result =
    JSON.parse(text) as {
      title?: string;
      message?: string;
    };

  if (
    !result.title ||
    !result.message
  ) {
    throw new Error(
      "NEWS生成AIの回答形式が不正です。"
    );
  }

  return {
    title: result.title,
    message: result.message,
  };
};

// ============================================================
// 画像アップロード時の処理
// ============================================================

export const tagUploadedImage =
  onObjectFinalized(
    {
      secrets: [GEMINI_API_KEY],
    },
    async (event) => {
      const object = event.data;

      console.log(
        "画像アップロードを検知しました:",
        object.name
      );

      // --------------------------------------------------
      // 画像情報確認
      // --------------------------------------------------

      if (
        !object.name ||
        !object.bucket
      ) {
        console.log(
          "画像情報が取得できませんでした"
        );
        return;
      }

      // --------------------------------------------------
      // 画像ファイル確認
      // --------------------------------------------------

      const contentType =
        object.contentType || "";

      if (
        !contentType.startsWith("image/")
      ) {
        console.log(
          "画像ではないため処理を終了します:",
          contentType
        );
        return;
      }

      // --------------------------------------------------
      // Storageのファイル名からMedia ID取得
      //
      // news/{mediaId}.jpg
      // --------------------------------------------------

      const fileName =
        object.name
          .split("/")
          .pop() || "";

      const mediaId =
        fileName.replace(
          /\.[^/.]+$/,
          ""
        );

      if (!mediaId) {
        console.log(
          "Media IDを取得できませんでした:",
          object.name
        );
        return;
      }

      console.log(
        "Media ID:",
        mediaId
      );

      try {
        // --------------------------------------------------
        // FirestoreのMedia取得
        // --------------------------------------------------

        const mediaRef =
          db
            .collection("media")
            .doc(mediaId);

        const mediaSnapshot =
          await mediaRef.get();

        if (!mediaSnapshot.exists) {
          console.error(
            "Firestoreに対象Mediaが存在しません:",
            mediaId
          );
          return;
        }

        const mediaData =
          mediaSnapshot.data();

        if (!mediaData) {
          throw new Error(
            "Mediaデータを取得できませんでした。"
          );
        }

        // --------------------------------------------------
        // Firebase Storageから画像取得
        // --------------------------------------------------

        const [buffer] =
          await getStorage()
            .bucket(object.bucket)
            .file(object.name)
            .download();

        const imageData =
          `data:${contentType};base64,${buffer.toString(
            "base64"
          )}`;

        console.log(
          "Storageから画像を取得しました"
        );

        // --------------------------------------------------
        // Geminiで画像タグ付け
        // --------------------------------------------------

        const tags =
          await generatePhotoTags(
            imageData,
            "gemini-3.6-flash",
            GEMINI_API_KEY.value()
          );

        console.log(
          "生成されたタグ:",
          tags
        );

        // --------------------------------------------------
        // Mediaにタグ保存
        // --------------------------------------------------

        await mediaRef.update({
          tags,
        });

        console.log(
          "FirestoreのMediaにタグを保存しました:",
          mediaId
        );

        // --------------------------------------------------
        // アップロードした家族ユーザー取得
        // --------------------------------------------------

        const uploadedBy =
          mediaData.uploadedBy;

        if (!uploadedBy) {
          throw new Error(
            "MediaにuploadedByがありません。"
          );
        }

        const familyRef =
          db
            .collection("users")
            .doc(uploadedBy);

        const familySnapshot =
          await familyRef.get();

        if (!familySnapshot.exists) {
          throw new Error(
            "アップロードした家族ユーザーが存在しません。"
          );
        }

        const familyData =
          familySnapshot.data();

        // --------------------------------------------------
        // familyConnectionsから高齢者を取得
        // --------------------------------------------------

        let elderlyUid = "";

        const connectionSnapshot =
          await db
            .collection("familyConnections")
            .where(
              "familyUid",
              "==",
              uploadedBy
            )
            .limit(1)
            .get();

        if (
          !connectionSnapshot.empty
        ) {
          const connectionData =
            connectionSnapshot.docs[0].data();

          elderlyUid =
            connectionData.elderlyUid || "";
        }

        // --------------------------------------------------
        // 旧familyGroupId方式との互換
        // --------------------------------------------------

        if (
          !elderlyUid &&
          familyData?.familyGroupId
        ) {
          const elderlySnapshot =
            await db
              .collection("users")
              .where(
                "familyGroupId",
                "==",
                familyData.familyGroupId
              )
              .where(
                "role",
                "==",
                "elderly"
              )
              .limit(1)
              .get();

          if (
            !elderlySnapshot.empty
          ) {
            elderlyUid =
              elderlySnapshot.docs[0].id;
          }
        }

        if (!elderlyUid) {
          throw new Error(
            "送信先の高齢者が見つかりません。"
          );
        }

        console.log(
          "NEWS送信先:",
          elderlyUid
        );

        // --------------------------------------------------
        // タグ＋コメントからNEWS生成
        // --------------------------------------------------

        const newsContent =
          await generateNewsContent(
            tags,
            mediaData.caption || "",
            GEMINI_API_KEY.value()
          );

        console.log(
          "生成されたNEWS:",
          newsContent
        );

        // --------------------------------------------------
        // NEWS保存
        // --------------------------------------------------

        await db.collection("news").add({
          deliveredTo: elderlyUid,
          type: "family",
          title: newsContent.title,
          message: newsContent.message,
          mediaUrl: mediaData.url || "",
          isRead: false,
          isAiGeneratedImage: false,
          createdAt: new Date().toISOString(),
        });

        // --------------------------------------------------
        // Media更新
        // --------------------------------------------------

        await mediaRef.update({
          deliveryCount:
            mediaData.deliveryCount || 1,
        });

        console.log(
          "NEWSをFirestoreに保存しました"
        );

        console.log(
          "画像タグ付け・NEWS生成処理が完了しました:",
          mediaId
        );
      } catch (error) {
        console.error(
          "画像処理でエラーが発生しました:",
          error
        );

        throw error;
      }
    }
  );