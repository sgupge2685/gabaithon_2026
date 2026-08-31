# MAGONEWS 📰

**家族の思い出と、今日の生活に役立つ情報を、毎日のNEWSとして届ける**

家族が共有した「写真」をトリガーとし、AIがその日の気象・環境情報に基づいた「予防情報（注意喚起）」を自然な形で高齢者に届ける、予防型見守りアプリです。

---

## 技術スタック

- **フロントエンド:** React Native (Expo SDK 54) + TypeScript
- **バックエンド:** Firebase (Authentication, Firestore, Cloud Storage, Cloud Messaging)
- **AI処理:** Gemini API (@google/genai) + 気象API + 画像生成API

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

# 3. 環境変数の設定（.env ファイルを作成して Gemini API キーを設定）
# GEMINI_API_KEY=your_key_here

# 4. 開発サーバーを起動（トンネルモード推奨）
npx expo start --tunnel

# 5. iPhoneのカメラでQRコードを読み取る
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
│  ├─ testSelectPhotos.ts    ← AI① 写真選択AIの単体テスト
│  ├─ testTagging.ts         ← 写真自動タグ付けAIのテスト
│  └─ testNewsGenerate.ts    ← AI② NEWS生成AIの単体テスト
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
   │  ├─ photoSelectService.ts      ← AI① 写真選択AI（毎日のNEWS用）
   │  ├─ taggingService.ts          ← 写真自動タグ付けAI（アップロード時）
   │  └─ newsGenerateService.ts     ← AI② NEWS生成AI（紹介文作成）
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

---

## 🛠️ AIサービスの使い方（B担当・A担当向け）

C担当が作成したAI関数は、以下のようにインポートして呼び出すことができます。

### ① 写真自動タグ付けAI（写真アップロード時に使用）
家族が写真をアップロードした瞬間に呼び出し、生成されたタグを `Media.tags` に保存してください。
```typescript
import { generatePhotoTags } from './src/services/taggingService';

// ファイルパス、URL、Base64文字列のいずれかを渡すだけでタグ（string[]）が返ってきます
const tags = await generatePhotoTags(photoUrlOrPath);
// ➔ ['家族', '食事', 'かき氷', '夏']
```

### ② AI① 写真選択AI（配信写真の決定時に使用）
家族の写真ライブラリ（`Media[]`）を渡すと、要件定義書の優先順位（新しい写真 ＞ 未配信 ＞ 重複回避）に従って最適な写真を選択して返します。
```typescript
import { selectPhotos } from './src/services/photoSelectService';

// 第1引数: 写真配列, 第2引数: 欲しい枚数（省略時は1枚）
const selectedPhotos = selectPhotos(mediaList, 1);
// ➔ [最優先の写真Media]
```

### ③ AI② NEWS生成AI（高齢者向け紹介文の作成時に使用）
写真データ（`Media`）を渡すと、魅力的な見出し「タイトル」と「本文」をセットで返します。
家族コメントがある場合は本文を最優先し、コメントがない場合はタグから温かい紹介文を自動生成します。
```typescript
import { generateNewsMessage } from './src/services/newsGenerateService';

const newsContent = await generateNewsMessage(selectedPhoto);
// newsContent.title   ➔ 「元気に公園あそび！」（AIが生成した見出し）
// newsContent.message ➔ 「今日は公園に行ってきたよ！」（家族コメントまたはAI自動生成文）
```

---

## テストの実行方法

各機能の動作確認テストは以下のコマンドで個別に実行できます：

```bash
# AI① 写真選択AI（photoSelectService）の動作テスト
npm run test:photoSelect

# 写真自動タグ付けAI（taggingService）の動作テスト
npm run test:tagging

# AI② NEWS生成AI（newsGenerateService）の動作テスト
npm run test:news
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

### 実装完了機能（担当C）
- ✅ **AI① 写真選択AI (`photoSelectService.ts`)**: 新しい順・未配信・重複回避ソート実装済み
- ✅ **写真自動タグ付けAI (`taggingService.ts`)**: 基本タグ優先＋具体物追加＋抽象タグ排除＋全画像形式対応
- ✅ **AI② NEWS生成AI (`newsGenerateService.ts`)**: 家族コメント最優先＋タグからの自動生成＋注釈付与

### 今後の検討事項
- 写真選択時の「重要度（お気に入り）」および「画面での見やすさ」の判定については現在未実装（どのようにデータを付与・判定するか今後検討）。
