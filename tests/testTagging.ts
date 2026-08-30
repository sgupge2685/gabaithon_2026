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

  // jpg, jpeg, png, heic, heif, webp の全形式を探す
  const files = fs.readdirSync(imagesDir).filter(file => 
    /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(file)
  );

  if (files.length === 0) {
    console.error('❌ tests/images/ の中にテスト用画像が見つかりません');
    console.log('👉 tests/images/ フォルダの中に画像を保存してください！');
    return;
  }

  // フォルダ内の画像を1枚ずつAIに投げてテスト
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    console.log(`📸 テスト画像: ${file}`);

    console.log('⏳ Gemini (3.6 Flash) でタグ付け中...');
    const startTime = Date.now();

    // ★ファイルパス（filePath）をそのまま渡すだけ！
    const tags = await generatePhotoTags(filePath);

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
