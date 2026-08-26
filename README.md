# MAGONEWS 📰

**家族の思い出と、今日の生活に役立つ情報を、毎日のNEWSとして届ける**

家族が共有した「写真」をトリガーとし、AIがその日の気象・環境情報に基づいた「予防情報（注意喚起）」を自然な形で高齢者に届ける、予防型見守りアプリです。

---

## 技術スタック

- **フロントエンド:** React Native (Expo SDK 54) + TypeScript
- **バックエンド:** Firebase (Authentication, Firestore, Cloud Storage, Cloud Messaging)
- **AI処理:** Gemini API / 各種LLM + 気象API + 画像生成API

---

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

# 3. 開発サーバーを起動（トンネルモード推奨）
npx expo start --tunnel

# 4. iPhoneのカメラでQRコードを読み取る
```

---

## ディレクトリ構成と役割分担

### 1. ディレクトリ構成
```text
gabaithon_2026/
│
├─ App.tsx
├─ app.json
├─ package.json
├─ package-lock.json
├─ tsconfig.json
│
├─ assets/
│
└─ src/
   │
   ├─ screens/       ← A担当：画面そのもの
   │
   ├─ components/    ← A担当：複数画面で共通して使うUI部品
   │
   ├─ navigation/    ← A担当：画面と画面を移動する仕組み
   │
   ├─ firebase/      ← B担当：Firebaseとの接続・データ保存（写真/ユーザー情報の保存取得、通知処理など）
   │
   ├─ services/      ← C担当：天気・AI・NEWS生成などの処理
   │
   ├─ types/         ← 3人で共有：データの型を定義など
   │  ├─ News.ts             ← NEWSデータの形式
   │  ├─ Media.ts            ← 写真データの形式
   │  ├─ User.ts             ← ユーザー情報の形式
   │  └─ Weather.ts          ← 気象データの形式
   │
   └─ constants/     ← A中心：アプリ全体で共通する設定
      └─ colors.ts   ← アプリで使う色
```

### 2. コード別の分担（Gitでの担当）

* **担当A（フロントエンド）**
  - `src/screens/`
  - `src/components/`
  - `src/navigation/`
  - `src/constants/`

* **担当B（バックエンド）**
  - `src/firebase/`

* **担当C（AI・サービス）**
  - `src/services/`

* **3人共有**
  - `src/types/`

---

## 開発ルール（Git）

1. `main` ブランチで直接作業せず、必ず作業用ブランチを作成して作業してください。
2. ブランチ命名規則の目安:
   - 担当A: `feature/front-xxx`
   - 担当B: `feature/backend-xxx`
   - 担当C: `feature/ai-xxx`
