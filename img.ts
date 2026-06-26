import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;

// --- Пиксельный шрифт (.otf или .ttf) ---
const FONT_PATH = path.join(__dirname, 'assets', 'hud.otf');
const FONT_FAMILY = 'Hud';

/** Рендерим SVG в PNG через resvg с ЯВНОЙ загрузкой файла шрифта. */
function renderSvgToPng(svg) {
  const hasFont = fs.existsSync(FONT_PATH);
  if (!hasFont) console.warn(`⚠️  Шрифт не найден: ${FONT_PATH} — будет системный.`);

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: hasFont ? [FONT_PATH] : [],
      loadSystemFonts: !hasFont, // есть свой шрифт -> грузим только его
      defaultFontFamily: FONT_FAMILY,
    },
  });
  return resvg.render().asPng(); // Buffer: PNG на весь холст, прозрачный фон
}

/**
 * Удаление фона в ОТДЕЛЬНОМ процессе.
 * Нативный краш убьёт только дочерний процесс — главный это переживёт.
 */
function removeBgIsolated(pngBuffer) {
  const tmpIn = path.join(os.tmpdir(), `bg_in_${Date.now()}.png`);
  const tmpOut = path.join(os.tmpdir(), `bg_out_${Date.now()}.png`);
  try {
    fs.writeFileSync(tmpIn, pngBuffer);
    const worker = path.join(__dirname, 'bg-worker.mjs');
    const r = spawnSync('node', [worker, tmpIn, tmpOut], {
      stdio: ['ignore', 'inherit', 'inherit'],
      timeout: 120_000,
    });
    if (r.status === 0 && fs.existsSync(tmpOut)) return fs.readFileSync(tmpOut);
    console.warn(`⚠️  Воркер обрезки фона завершился аварийно (status=${r.status}, signal=${r.signal}). Использую исходное фото.`);
    return null;
  } catch (e) {
    console.warn('⚠️  Не удалось запустить воркер обрезки:', e instanceof Error ? e.message : e);
    return null;
  } finally {
    for (const f of [tmpIn, tmpOut]) { try { fs.existsSync(f) && fs.unlinkSync(f); } catch {} }
  }
}

async function testCardGeneration() {
  console.log('🚀 Начинаем генерацию карточки...');

  const playerSrc = path.join(__dirname, 'assets', 'player.jpg');
  const templateSrc = path.join(__dirname, 'assets', 'background.jpg');
  const outputSrc = path.join(__dirname, 'assets', 'result_card.png');

  try {
    for (const f of [playerSrc, templateSrc]) {
      if (!fs.existsSync(f)) throw new Error(`Файл не найден: ${f}`);
    }

    console.log('📂 Загружаем изображение игрока...');
    const pngBuffer = await sharp(playerSrc).png().toBuffer();
    const meta = await sharp(pngBuffer).metadata();
    console.log('Метаданные игрока:', meta.width, 'x', meta.height);

    console.log('⏳ Вырезаем фон (в отдельном процессе)...');
    const noBg = removeBgIsolated(pngBuffer);
    const playerImage = noBg ?? pngBuffer;
    console.log(noBg ? '✅ Фон удалён' : 'ℹ️  Фон НЕ удалён — карточка с исходным фото');

    console.log('✨ Применяем пиксельный эффект (итог 600×600)...');
    const pixelatedPlayer = await sharp(playerImage)
      .ensureAlpha()
      .resize(150, 150, { kernel: sharp.kernel.nearest, fit: 'inside' })
      .resize(600, 600, {
        kernel: sharp.kernel.nearest,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    console.log('✍️ Генерируем текст...');
    const svgText = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .pixel-text { fill: #1a1a1a; font-family: '${FONT_FAMILY}'; font-weight: bold; }
          .rating   { font-size: 86px; }
          .position { font-size: 86px; }
          .name     { font-size: 64px; text-anchor: middle; }
          .stat     { font-size: 42px; }
        </style>

        <text x="140" y="287"  lengthAdjust="spacingAndGlyphs" class="pixel-text rating">81</text>
        <text x="140" y="417" textLength="140" lengthAdjust="spacingAndGlyphs" class="pixel-text position">LW</text>
        <text x="443" y="830" class="pixel-text name">PALMER</text>
        <text x="160" y="892"  class="pixel-text stat">82 PAC</text>
        <text x="164" y="980"  class="pixel-text stat">78 SHO</text>
        <text x="164" y="1070" class="pixel-text stat">79 PAS</text>
        <text x="490" y="892"  class="pixel-text stat">81 DRI</text>
        <text x="490" y="980"  class="pixel-text stat">44 DEF</text>
        <text x="490" y="1070" class="pixel-text stat">56 PHY</text>
      </svg>
    `;
    const textPng = renderSvgToPng(svgText);

    // --- Слои ---
    const overlays = [
      { input: pixelatedPlayer, top: 142, left: 132 }, // игрок 600×600 @ (182,122)
      { input: textPng, top: 0, left: 0 },             // текстовый слой
    ];

    // Флаг и эмблема клуба (если есть файлы)
    const flagSrc = path.join(__dirname, 'assets', 'flag.png');
    const clubSrc = path.join(__dirname, 'assets', 'club.png');
    // if (fs.existsSync(flagSrc)) {
    //   const flag = await sharp(flagSrc).resize(141, 85, { fit: 'inside' }).png().toBuffer();
    //   overlays.push({ input: flag, top: 445, left: 140 }); // флаг @ (140,390)
    // }
    // if (fs.existsSync(clubSrc)) {
    //   const club = await sharp(clubSrc).resize(140, 140, { fit: 'inside' }).png().toBuffer();
    //   overlays.push({ input: club, top: 565, left: 138 }); // эмблема @ (142,490)
    // }

    console.log('🖼️ Собираем карточку...');
    await sharp(templateSrc)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .composite(overlays)
      .png()
      .toFile(outputSrc);

    console.log(`✅ Готово! Карточка сохранена: ${outputSrc}`);
  } catch (error) {
    console.error('❌ Ошибка:', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}

testCardGeneration();
