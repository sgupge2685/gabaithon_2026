import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import app from "./firebaseConfig";
import type { Media } from "../types/Media";
import type { News } from "../types/News";
import type { Weather } from "../types/Weather";

const db = getFirestore(app);

// =========================
// Media
// =========================

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

export const saveMediaWithId = async (
  mediaId: string,
  media: Omit<Media, "id">
): Promise<void> => {
  try {
    const mediaRef = doc(db, "media", mediaId);
    await setDoc(mediaRef, media);
    console.log("FirestoreへのMedia保存成功:", mediaId);
  } catch (error) {
    console.error("FirestoreへのMedia保存失敗:", error);
    throw error;
  }
};

// FirestoreからMediaデータを取得する
export const getMedia = async (): Promise<Media[]> => {
  try {
    const snapshot = await getDocs(collection(db, "media"));
    const mediaList: Media[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Media[];
    console.log("FirestoreからMedia取得成功:", mediaList);
    return mediaList;
  } catch (error) {
    console.error("FirestoreからMedia取得失敗:", error);
    throw error;
  }
};

// FirestoreのMediaデータを更新する
export const updateMedia = async (
  mediaId: string,
  data: Partial<Omit<Media, "id">>
): Promise<void> => {
  try {
    const mediaRef = doc(db, "media", mediaId);
    await updateDoc(mediaRef, data);
    console.log("FirestoreのMedia更新成功:", mediaId);
  } catch (error) {
    console.error("FirestoreのMedia更新失敗:", error);
    throw error;
  }
};

// =========================
// NEWS
// =========================

// NEWSデータをFirestoreに保存する
export const saveNews = async (
  news: Omit<News, "id">
): Promise<string> => {
  try {
    const newsRef = await addDoc(
      collection(db, "news"),
      news
    );
    console.log("FirestoreへのNEWS保存成功:", newsRef.id);
    return newsRef.id;
  } catch (error) {
    console.error("FirestoreへのNEWS保存失敗:", error);
    throw error;
  }
};

// FirestoreからNEWSデータを取得する
export const getNews = async (): Promise<News[]> => {
  try {
    const snapshot = await getDocs(collection(db, "news"));
    const newsList: News[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as News[];
    console.log("FirestoreからNEWS取得成功:", newsList);
    return newsList;
  } catch (error) {
    console.error("FirestoreからNEWS取得失敗:", error);
    throw error;
  }
};

// FirestoreのNEWSデータを更新する
export const updateNews = async (
  newsId: string,
  data: Partial<Omit<News, "id">>
): Promise<void> => {
  try {
    const newsRef = doc(db, "news", newsId);
    await updateDoc(newsRef, data);
    console.log("FirestoreのNEWS更新成功:", newsId);
  } catch (error) {
    console.error("FirestoreのNEWS更新失敗:", error);
    throw error;
  }
};

// =========================
// Weather
// =========================

// WeatherデータをFirestoreに保存する
export const saveWeather = async (
  weather: Weather
): Promise<void> => {
  try {
    // 地域名と日付を組み合わせてIDを作成
    const weatherId = `${weather.locationName}_${weather.date}`;
    const weatherRef = doc(db, "weather", weatherId);
    await setDoc(weatherRef, weather);
    console.log(
      "FirestoreへのWeather保存成功:",
      weatherId
    );
  } catch (error) {
    console.error(
      "FirestoreへのWeather保存失敗:",
      error
    );
    throw error;
  }
};

// FirestoreからWeatherデータを取得する
export const getWeather = async (
  locationName: string,
  date: string
): Promise<Weather | null> => {
  try {
    const weatherId = `${locationName}_${date}`;
    const weatherRef = doc(db, "weather", weatherId);
    const snapshot = await getDoc(weatherRef);
    if (!snapshot.exists()) {
      console.log(
        "FirestoreにWeatherデータがありません:",
        weatherId
      );
      return null;
    }
    const weather = snapshot.data() as Weather;
    console.log(
      "FirestoreからWeather取得成功:",
      weatherId
    );
    return weather;
  } catch (error) {
    console.error(
      "FirestoreのWeather取得失敗:",
      error
    );
    throw error;
  }
};

export default db;