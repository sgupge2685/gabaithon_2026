import * as fs from 'fs';
import * as path from 'path';
import { generatePhotoTags } from '../src/services/taggingService';

async function run() {
  console.log('========================================');
  console.log('🧪 画像自動タグ付けAI 動作テスト開始');
  console.log('========================================\n');

  // 画像フォルダのパス（tests/images/）
  const imagesDir = path.join(__dirname, 'images');

  if (!fs.existsSync(imagesDir)) {
    console.error('❌ tests/images/ フォルダが見つかりません');
    return;
  }

  const files = fs.readdirSync(imagesDir).filter(file => 
    /\.(jpg|jpeg|png|webp)$/i.test(file)
  );

  if (files.length === 0) {
    console.error('❌ tests/images/ の中にテスト用画像が見つかりません');
    console.log('👉 tests/images/ フォルダの中に .jpg や .png 形式の画像を保存してください！');
    return;
  }

  // フォルダ内の画像を1枚ずつAIに投げてテスト
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    console.log(`📸 テスト画像: ${file}`);

    // 画像ファイルを読み込んで Base64（文字データ）に変換
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');

    console.log('⏳ Gemini (3.6 Flash) に画像を送信中...');
    const startTime = Date.now();

    // ★自作のAI関数に画像を投げる！
    const tags = await generatePhotoTags(base64);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`🎉 タグ生成完了！（所要時間: ${duration}秒）`);
    console.log('🏷️  AIが付けたタグ:');
    console.log(tags);
    console.log('----------------------------------------\n');
  }

  console.log('========================================');
  console.log('🏁 すべてのテストが終了しました');
  console.log('========================================');
}

run();
