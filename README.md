# MAGONEWS 📰

**家族の思い出と、今日の生活に役立つ情報を、毎日のNEWSとして届ける**

家族が共有した「写真」をトリガーとし、AIがその日の気象・環境情報に基づいた「予防情報（注意喚起）」を自然な形で高齢者に届ける、予防型見守りアプリです。

## 技術スタック

- **フロントエンド:** React Native (Expo SDK 54) + TypeScript
- **バックエンド:** Firebase (Authentication, Firestore, Cloud Storage, Cloud Messaging)
- **AI処理:** Cloud Functions (Python)

## セットアップ

### 必要なもの

- [Node.js](https://nodejs.org/) (LTS版)
- [Expo Go](https://apps.apple.com/app/expo-go/id982107779) (iPhone にインストール)

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/sgupge2685/gabaithon_2026.git
cd gabaithon_2026

# 2. 依存パッケージをインストール
npm install

# 3. 開発サーバーを起動
npx expo start

# 4. iPhoneのExpo GoアプリでQRコードを読み取る
```

> **注意:** PCとiPhoneが同じWi-Fiに接続されている必要があります。

## プロジェクト構成

```
gabaithon_2026/
├── App.tsx           # アプリのエントリーポイント
├── app.json          # Expo設定
├── assets/           # アイコン・スプラッシュ画像
├── package.json      # 依存パッケージ
└── tsconfig.json     # TypeScript設定
```
