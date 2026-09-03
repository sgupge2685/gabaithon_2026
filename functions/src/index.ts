import {setGlobalOptions} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import {generatePhotoTags} from "./services/taggingService";
import {initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

setGlobalOptions({
  maxInstances: 10,
});

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const tagUploadedImage = onObjectFinalized(
  {
    secrets: [GEMINI_API_KEY],
  },
  async (event) => {
    const object = event.data;
    console.log("画像アップロードを検知しました:", object.name);
    const fileName = object.name.split("/").pop() || "";
    const mediaId = fileName.replace(/\.[^/.]+$/, "");
    console.log("Media ID:", mediaId);
    if (!object.name || !object.bucket) {
      console.log("画像情報が取得できませんでした");
      return;
    }

    // 画像ファイルのMIMEタイプを確認
    const contentType = object.contentType || "";
    if (!contentType.startsWith("image/")) {
      console.log("画像ではないため処理を終了します:", contentType);
      return;
    }

    try {
      // Firebase Storageから画像を直接取得
      const [buffer] = await getStorage()
        .bucket(object.bucket)
        .file(object.name)
        .download();
      const imageData =
        `data:${contentType};base64,${buffer.toString("base64")}`;
      console.log("Storageから画像を取得しました");

      // Geminiで画像をタグ付け
      const tags = await generatePhotoTags(
        imageData,
        "gemini-3.6-flash",
        GEMINI_API_KEY.value()
      );
      console.log("生成されたタグ:", tags);
      
      await db.collection("media").doc(mediaId).update({
        tags: tags,
      });
      console.log("FirestoreのMediaにタグを保存しました:", mediaId);
      console.log("画像タグ付け処理が完了しました");
    } catch (error) {
      console.error("画像タグ付け処理でエラー:", error);
    }
  }
);
