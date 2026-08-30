import { getFirestore, collection, addDoc } from "firebase/firestore";
import app from "./firebaseConfig";
import type { Media } from "../types/Media";

const db = getFirestore(app);

// MediaデータをFirestoreに保存する
export const saveMedia = async (
  media: Omit<Media, "id">
): Promise<string> => {
  try {
    const mediaRef = await addDoc(
      collection(db, "media"),
      media
    );
    console.log("Firestoreへの保存成功:", mediaRef.id);
    return mediaRef.id;
  } catch (error) {
    console.error("Firestoreへの保存失敗:", error);
    throw error;
  }
};

export default db;