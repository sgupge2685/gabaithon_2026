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
├─ tests/             ← 各機能の動作確認テスト
│  └─ testSelectPhotos.ts    ← AI① 写真選択AIの単体テスト
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
   │  └─ photoSelectService.ts      ← AI① 写真選択AI（毎日のNEWS用）
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

## テストの実行方法

各機能の動作確認テストは以下のコマンドで個別に実行できます：

```bash
# AI① 写真選択AI（photoSelectService）の動作テスト
npm run test:photoSelect
```

---

## 開発ルール（Git）

1. `main` ブランチで直接作業せず、必ず作業用ブランチを作成して作業してください。
2. ブランチ命名規則の目安:
   - 担当A: `feature/front-xxx`
   - 担当B: `feature/backend-xxx`
   - 担当C: `feature/ai-xxx`

---

## 開発状況・検討中事項（Notes）

### AI① 写真選択AI（`selectPhotos`）
- **現在の優先順位実装:**
  1. 新しい写真（投稿日付が新しい順）
  2. 未配信の写真（`deliveryCount === 0`）
  3. 過去の重複回避（`deliveryCount` が少ない順）
- **今後の検討事項:**
  - 要件定義書にある「重要度」および「画面での見やすさ」の判定については現在未実装（どのようにデータを付与・判定するか今後検討）。
