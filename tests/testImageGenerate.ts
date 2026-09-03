import { generatePreventionIllustration } from '../src/services/imageGenerateService';
import { GeneratedNewsContent } from '../src/services/newsGenerateService';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  console.log('========================================');
  console.log('[テスト開始] イラスト生成AI (Nano Banana 2 / 4:3比率)');
  console.log('========================================\n');

  // テスト用の予防NEWS（熱中症予防）
  const sampleNews: GeneratedNewsContent = {
    title: '熱中症に気をつけて！',
    message: '今日は35℃の猛暑日です。こまめに冷たい麦茶を飲んで水分補給をしてくださいね。（AIによる自動生成）',
  };

  console.log(`[テストNEWS] 見出し: 「${sampleNews.title}」`);
  console.log('イラスト生成APIを呼び出し中...（数秒お待ちください）\n');

  const startTime = Date.now();
  const result = await generatePreventionIllustration(sampleNews);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (result) {
    console.log(`[結果] イラスト生成成功！（所要時間: ${elapsed}秒）`);
    console.log(`  DataURL接頭辞: ${result.dataUrl.substring(0, 40)}...`);
    console.log(`  Base64サイズ  : ${result.base64.length} 文字`);

    // tests/ フォルダ内に画像ファイルとして書き出し
    const outputPath = path.join(__dirname, 'test_illustration.jpg');
    fs.writeFileSync(outputPath, Buffer.from(result.base64, 'base64'));
    console.log(`  画像ファイル保存完了: ${outputPath}`);
    console.log('  （エクスプローラーやエディタで開いて、4:3の優しいイラストを確認できます！）\n');
  } else {
    console.log('× [結果] イラスト生成に失敗しました（nullが返却されました）\n');
  }

  console.log('========================================');
  console.log('[テスト終了] すべてのテストが完了しました');
  console.log('========================================');
}

runTest();
