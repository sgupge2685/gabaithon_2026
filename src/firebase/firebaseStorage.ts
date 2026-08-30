import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import app from "./firebaseConfig";

const storage = getStorage(app);

// 画像のURIとファイル名を受け取り、Firebase Storageに画像を保存する
// 保存後、画像にアクセスするためのURL（downloadURL）を返す
export const uploadImage = async (
  uri: string,
  fileName: string
): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `media/${fileName}`);
  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

export default storage;