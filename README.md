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

# 4. iOSシュミレータ起動の場合（Macのみ）
npx expo start --go --offline --ios

# 5. iPhoneのカメラでQRコードを読み取る
```

---

## ディレクトリ構成と役割分担

### 1. ディレクトリ構成
```text
gabaithon_2026/
│
├─ App.tsx                     ← アプリのエントリーポイント（ナビゲーション呼び出し）
├─ app.json                    ← Expo設定ファイル（アプリ名、アイコン、パーミッション設定等）
├─ eas.json                    ← Expo Application Services (EAS) ビルド設定
├─ firebase.json / .firebaserc ← Firebase CLI 設定
├─ GoogleService-Info.plist    ← Firebase iOS用接続設定
├─ google-services.json        ← Firebase Android用接続設定
├─ package.json                ← 依存関係・テスト実行スクリプト定義
├─ tsconfig.json               ← TypeScriptコンパイル設定
│
├─ assets/                     ← アプリのアイコン・スプラッシュ画像等
│
├─ tests/                      ← 各機能の動作確認用単体テスト（tsxで即実行可能）
│  ├─ testSelectPhotos.ts      ← AI① 写真選択AIの単体テスト
│  ├─ testTagging.ts           ← 写真自動タグ付けAIのテスト
│  ├─ testNewsGenerate.ts      ← AI② NEWS生成AIの単体テスト
│  ├─ testWeather.ts          ← 気象データ取得（気象庁公式＋Open-Meteo）のテスト
│  ├─ testPreventionNews.ts   ← AI③④ 予防NEWS生成・写真選定（一本化）のテスト
│  └─ testImageGenerate.ts    ← AI⑤ イラスト生成AIのテスト（参考用）
│
├─ functions/                  ← Firebase Cloud Functions（バックエンド自動処理）
│  ├─ src/
│  │  ├─ index.ts              ← Cloud Functions のエントリーポイント（定時配信バッチ等）
│  │  └─ services/            ← サーバー側共通サービス
│  │     ├─ taggingService.ts
│  │     └─ newsGenerateService.ts
│  └─ package.json
│
└─ src/
   │
   ├─ screens/                 ← アプリ画面（高齢者側・家族側・認証系）
   │  ├─ HomeScreen.tsx        ← 【高齢者】メインホーム（日めくりカレンダー・予防ニュース受信通知）
   │  ├─ NewsScreen.tsx        ← 【高齢者】今日の新聞画面（写真・見出し・記事本文・「みたよ」ボタン）
   │  ├─ HistoryScreen.tsx     ← 【高齢者】過去の新聞アーカイブ一覧画面
   │  ├─ FamilyHomeScreen.tsx  ← 【家族】メインホーム（高齢者の読了確認・予防ニュース手動配信デモ・招待リンク発行・送信履歴）
   │  ├─ CreateNewsScreen.tsx  ← 【家族】写真投稿画面（写真選択・AI自動タグ付け・AI見出し生成・記事配信）
   │  ├─ RoleSelectScreen.tsx  ← 【初期設定】役割選択画面（「おじいちゃん・おばあちゃん」or「ご家族」）
   │  ├─ Loginscreen.tsx       ← 【認証】ログイン・新規登録画面（電話番号認証・SMSコード認証）
   │  └─ AddFamilyScreen.tsx   ← 【家族連携】招待コード入力画面（高齢者・家族のペアリング接続）
   │
   ├─ components/              ← 複数画面で再利用する共通UIコンポーネント
   │  ├─ NewspaperCard.tsx     ← 新聞風カードコンポーネント（写真・見出し・本文・リアクションボタン）
   │  └─ ReactionButton.tsx    ← 「みたよ」スタンプボタン（タップでリアクション送信＆アニメーション）
   │
   ├─ navigation/              ← ナビゲーション設定
   │  └─ AppNavigator.tsx      ← React Navigation による全画面の画面遷移スタック定義
   │
   ├─ features/                ← 各ドメインごとの機能ロジック（認証・家族連携・通知）
   │  ├─ auth/
   │  │  ├─ authFunctions.ts       ← ログイン中ユーザー取得・認証状態管理
   │  │  └─ phoneAuthFunctions.ts  ← 電話番号認証（SMSコード発行・検証）
   │  ├─ familyConnection/
   │  │  ├─ familyConnectionFunctions.ts ← 招待リンク発行・招待コード検証・高齢者と家族の接続処理
   │  │  └─ types/FamilyConnection.ts   ← 家族接続データの型定義
   │  └─ notification/
   │     ├─ notificationFunctions.ts   ← プッシュ通知送信・トークン管理
   │     └─ pushNotificationService.ts ← Expo Notifications の初期設定・通知受信リスナー
   │
   ├─ firebase/                ← Firebase接続・Firestoreデータ操作
   │  ├─ firebaseConfig.ts     ← Firebase初期化設定
   │  ├─ firebaseAuth.ts       ← ユーザー認証ラッパー
   │  ├─ firebaseStorage.ts    ← Cloud Storage への写真アップロード処理
   │  └─ firestore.ts          ← Firestore CRUD操作（users, media, news コレクションの保存・取得・更新）
   │
   ├─ services/                ← AI連携・気象データ・通知サービス
   │  ├─ clientAiService.ts    ← 【最重要】React Nativeクライアント用 Gemini AI 連携（自動タグ付け・見出し生成・気象連動予防ニュース・重複防止ガード）
   │  ├─ weatherService.ts     ← 日本全国の気象データ取得（気象庁公式データ＋Open-Meteoの湿度/UV/風速）
   │  ├─ notificationService.ts← ローカルプッシュ通知制御（権限リクエスト・通知発火）
   │  ├─ photoSelectService.ts ← 写真選定ロジック（最新順・未配信優先・重複回避ソート）
   │  ├─ preventionNewsService.ts ← Node.js/サーバー用 予防NEWS生成・気象判定・写真選定
   │  ├─ newsGenerateService.ts   ← Node.js/サーバー用 NEWS生成AI（見出し＋紹介文）
   │  ├─ taggingService.ts        ← Node.js/サーバー用 写真自動タグ付けAI
   │  └─ imageGenerateService.ts  ← イラスト生成AI（Nano Banana 2 / 参考用）
   │
   ├─ types/                   ← アプリ全体で共有する TypeScript 型定義
   │  ├─ News.ts               ← NEWSデータの形式（deliveredTo, title, message, mediaUrl, reaction等）
   │  ├─ Media.ts              ← 写真データの形式（url, uploadedBy, tags, deliveryCount, caption等）
   │  ├─ User.ts               ← ユーザー情報の形式（role, familyUid, location等）
   │  └─ Weather.ts            ← 気象データの形式（気温、湿度、降水確率、警報等）
   │
   └─ constants/               ← 定数定義
      └─ colors.ts             ← アプリ全体のカラーパレット（Primary, Background, Text等）
```

---

## 📊 データ構造の定義（`src/types/`）

チーム全体（フロント・バック・AI）で共通して使用する主要なデータの保存形式です。

### 1. 写真データ (`Media.ts`)
家族がアップロードした写真のメタデータです。Firestoreの `media` コレクションに保存されます。
```typescript
export interface Media {
  id: string;                // 写真の固有ID
  url: string;               // 写真のアクセスURL（Cloud Storage）
  uploadedBy: string;        // 投稿者のユーザーID
  createdAt: string;         // 投稿日時
  type: 'image' | 'AIimage'; // 通常写真 or AI生成画像
  tags: string[];            // AIが付与したタグ（例: ['家族', '食事', '公園']）
  deliveryCount: number;     // 過去にNEWSとして配信された回数（重複配信回避用）
  takenAt?: string;          // 撮影日時（省略可）
  caption?: string;          // 家族からのひとことコメント（省略可）
}
```

### 2. NEWSデータ (`News.ts`)
高齢者向けに毎日配信されるNEWSデータです。Firestoreの `news` コレクションに保存されます。
```typescript
export interface News {
  id: string;                    // NEWSの固有ID
  deliveredTo: string;           // 配信先の高齢者ユーザーID
  type: 'family' | 'prevention'; // NEWS種別（家族写真NEWS or 予防情報NEWS）
  title: string;                 // 見出しタイトル（例: 「元気に公園あそび！」「水分補給のお願い」）
  message: string;               // 本文メッセージ（家族コメント or AI自動生成文）
  mediaUrl: string;              // 表示する写真またはAIイラストのURL
  isRead: boolean;               // 高齢者が読んだかどうかの既読フラグ（見守り用）
  isAiGeneratedImage: boolean;   // 画像がAI生成イラスト（AI⑤）かどうか
  createdAt: string;             // 配信日時
  reaction?: string;             // 高齢者からのリアクション（例: "👍" / 省略可）
}
```

### 3. ユーザー情報 (`User.ts`)
高齢者および家族のアカウント情報です。
```typescript
export interface User {
  id: string;                  // ユーザー固有ID（Firebase Auth UID）
  name: string;                // 表示名（例: 「おじいちゃん」「たろう」）
  role: 'elderly' | 'family';  // 高齢者側 or 家族側
  familyGroupId: string;       // 所属する家族グループID
  location: string;            // お住まいの地域名（例: "佐賀市" / 天気取得用）
  notificationEnabled: boolean;// プッシュ通知設定
  photoUrl?: string;           // プロフィールアイコン画像URL（省略可）
  createdAt?: string;          // 作成日時（省略可）
}
```

### 4. 気象データ (`Weather.ts`)
`weatherService.ts` が気象庁および Open-Meteo から取得した気象データです。AI③（予防NEWS生成）の入力として使用されます。
```typescript
export interface Weather {
  locationName: string;    // 正式地名（例: "佐賀市", "世田谷区"）
  date: string;            // 日付（例: "2026-08-31"）
  weatherText: string;     // 天気テキスト（例: "晴れ 時々 くもり"）
  temperatureMax: number;  // 日中の最高気温（℃）
  temperatureMin: number;  // 今夜〜明朝の最低気温（℃）
  humidityDaytime: number; // 昼間の湿度（%）
  humidityNight: number;   // 夜間の湿度（%）
  rainProbability: number; // 降水確率（%）
  uvIndex: number;         // 紫外線指数（UV）
  windSpeed: number;       // 最大風速（m/s）
  warnings?: string[];     // 発令中の公式警報・注意報（例: ['雷注意報', '乾燥注意報'] / なければ省略）
}
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

### ④ 気象データ取得サービス（天気・警報・湿度などの取得に使用）
日本全国の市区町村名（「佐賀市」「世田谷区」など）を渡すと、気象庁の公式予報・警報と Open-Meteo の湿度・UV・風速を統合した `Weather` データを返します。
```typescript
import { getWeatherData } from './src/services/weatherService';

const weather = await getWeatherData('佐賀市');
// weather.weatherText     ➔ 「晴れ 時々 くもり」
// weather.temperatureMax  ➔ 37（今日の最高気温）
// weather.temperatureMin  ➔ 27（今夜〜明朝の最低気温）
// weather.humidityDaytime ➔ 66（昼の湿度%）
// weather.warnings        ➔ ['雷注意報', '乾燥注意報']（市区町村別の公式警報）
```

### ⑤ AI③④ 予防NEWS・写真選定AI（高齢者向け予防アドバイスの作成時に使用）
高齢者ユーザー（`User`）、過去のNEWSリスト（`News[]`）、家族写真リスト（`Media[]`）を渡すと、`user.location` から天気を自動取得し、今日まだ伝えていない新しい危険がある場合のみ、**「タグとコメントから合う写真を選定」し、その写真に触れながら「タイトル」と「本文」を一撃で生成** して返します（平穏時や、本日すでに配信済みの重複時は `null` を返します）。
※天気データをDBに保存する必要はありません。

```typescript
import { generatePreventionNews } from './src/services/preventionNewsService';

// 高齢者ユーザー、過去NEWS、家族写真リストを渡して 1回 呼ぶだけ！（全自動）
const result = await generatePreventionNews(elderlyUser, pastNewsList, familyPhotos);

if (result) {
  console.log(result.title);        // ➔ 「麦茶で熱中症予防！」（見出し）
  console.log(result.message);      // ➔ 「家族が作ってくれた冷たい麦茶、おいしそうですね！...（AIによる自動生成）」
  console.log(result.photo?.url);   // ➔ 麦茶の写真のURL（そのまま NEWS の mediaUrl にセット！）
  console.log(result.selectedReason);// ➔ なぜその写真を選んだかの理由
}
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

# 気象データ取得（weatherService）の動作テスト
npm run test:weather

# AI③④ 予防NEWS生成・写真選定AI（preventionNewsService）の動作テスト
npm run test:prevention
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
- ✅ **気象データ取得サービス (`weatherService.ts`)**: 気象庁公式（天気・気温・警報）＋Open-Meteo（湿度・UV・風速）連携
- ✅ **AI③④ 予防NEWS生成・写真選定AI (`preventionNewsService.ts`)**: 気象状況の自動判断＋家族写真（タグ・コメント）の自動選定＋写真に触れた予防NEWS一撃生成（重複防止機能つき）

### 実装見送り・今後の課題（担当C）
- ⚠️ **AI⑤ イラスト生成AI (`imageGenerateService.ts`) の実装見送り（参考コードとして保持）**:
  - **背景・理由:**
    - Google の画像生成モデル（Nano Banana 2 / Imagen 3等）は現在、Google AI Studio の無料枠（Free Tier）では利用枠（Quota）が 0 に制限されており、有料課金（Billing）の有効化が必須となっているため。
    - リアルタイム画像生成に伴う待機時間（十数秒）や API コストの観点から、今回のプロトタイプ開発では実装を見送る判断としました。
  - **代替・運用方針:**
    - 予防NEWSに合致する家族写真がない場合は、無理に画像を自動生成せず、デフォルトの予防アイキャッチ画像を表示するか、家族写真NEWSのみを優先して配信する形で対応します。
- 写真選択時の「重要度（お気に入り）」および「画面での見やすさ」の判定については現在未実装（どのようにデータを付与・判定するか今後検討）。

---

## ⚠️ 気象データ取得に関する技術的留意事項（本番提供時の課題）

現在本アプリで実装している `weatherService.ts` の気象データ取得方式については、以下の技術的背景と将来的な課題を認識して設計されています。

### 1. 現状の取得アーキテクチャ（ハイブリッド方式）
- **気象庁（JMA）内部データ:** 最高/最低気温、降水確率、および市区町村別の公式警報・注意報を取得。
- **Open-Meteo API:** 「昼夜の湿度」「紫外線指数」「風速」を取得。

### 2. 技術的留意事項・リスク
現在参照している気象庁のエンドポイント（`jma.go.jp/bosai/...`）は、外部開発者向けに仕様保証された「公式API」ではなく、**「気象庁ホームページの画面表示用に内部利用されているJSONデータ」** を参照しています。
そのため、将来的に気象庁側のWebサイト構造リニューアル、URL変更、またはアクセス制限・権限変更が行われた場合、**予告なくデータ取得が利用不可になるリスク** があります。

### 3. 一般提供（商用サービス化）に向けた今後の課題
プロトタイプ・ハッカソン段階では「完全無料かつ市区町村ピンポイントの公式警報」を実現するために現状のハイブリッド方式を採用していますが、将来的に一般向け商用サービスとして安定して提供するとなれば、他の手段を検討する必要がある。
