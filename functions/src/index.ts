import {setGlobalOptions} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import {generatePhotoTags} from "./services/taggingService";
import {generateNewsMessage} from "./services/newsGenerateService";
import {initializeApp} from "firebase-admin/app";
import {getStorage} from "firebase-admin/storage";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

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
      // 1. Firebase Storageから画像を直接取得
      const [buffer] = await getStorage()
        .bucket(object.bucket)
        .file(object.name)
        .download();
      const imageData =
        `data:${contentType};base64,${buffer.toString("base64")}`;
      console.log("Storageから画像を取得しました");

      // 2. Geminiで画像をタグ付け（AI①）
      const tags = await generatePhotoTags(
        imageData,
        "gemini-3.6-flash",
        GEMINI_API_KEY.value()
      );
      console.log("生成されたタグ:", tags);

      // 3. FirestoreのMediaにタグを保存
      const mediaRef = db.collection("media").doc(mediaId);
      await mediaRef.set(
        {
          tags: tags,
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
      console.log("FirestoreのMediaにタグを保存しました:", mediaId);

      // 4. Media情報（投稿者、キャプション、画像URL）を取得
      const mediaDoc = await mediaRef.get();
      const mediaData = mediaDoc.data() || {};
      const familyUid = mediaData.uploadedBy;
      const caption = mediaData.caption || "";
      const mediaUrl = mediaData.url || "";

      if (!familyUid) {
        console.log("uploadedBy（家族UID）が存在しないためニュース生成をスキップします");
        return;
      }

      // 5. 接続先の高齢者（familyUid == 家族UID）を検索
      let elderlyUid = "";
      const elderlyQuery = await db.collection("users")
        .where("familyUid", "==", familyUid)
        .where("role", "==", "elderly")
        .limit(1)
        .get();

      if (!elderlyQuery.empty) {
        elderlyUid = elderlyQuery.docs[0].id;
      } else {
        // familyConnectionsコレクションからも探す
        const connQuery = await db.collection("familyConnections")
          .where("familyUid", "==", familyUid)
          .limit(1)
          .get();
        if (!connQuery.empty) {
          elderlyUid = connQuery.docs[0].data().elderlyUid;
        }
      }

      if (!elderlyUid) {
        console.log("接続先の高齢者が見つからないためニュース生成をスキップします:", familyUid);
        return;
      }

      console.log("接続先高齢者を検出しました:", elderlyUid);

      // 6. Geminiでニュース見出し・本文を自動生成（AI②）
      const newsContent = await generateNewsMessage(
        {
          tags: tags,
          caption: caption,
        },
        "gemini-3.6-flash",
        GEMINI_API_KEY.value()
      );

      console.log("生成されたニュース見出し:", newsContent.title);

      // 7. news コレクションに自動作成！
      const now = new Date().toISOString();
      const newNewsRef = await db.collection("news").add({
        deliveredTo: elderlyUid,
        type: "family",
        title: newsContent.title,
        message: newsContent.message,
        mediaUrl: mediaUrl,
        mediaId: mediaId,
        isRead: false,
        isAiGeneratedImage: false,
        createdAt: now,
      });

      console.log("🎉 ニュースを自動生成してFirestoreに配信しました:", newNewsRef.id);
      console.log("画像タグ付け・ニュース自動生成処理が完了しました");
    } catch (error) {
      console.error("画像タグ付け・ニュース生成処理でエラー:", error);
    }
  }
);
