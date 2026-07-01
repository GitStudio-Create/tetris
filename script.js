/**
 * NEON TETRIS - ゲームロジック (script.js)
 * 初心者にも分かりやすいように詳細な日本語コメントを付与しています。
 */

// ----------------------------------------------------
// 1. 定数と設定
// ----------------------------------------------------
const BOARD_ROWS = 20; // テトリス盤面の縦のマス数
const BOARD_COLS = 10; // テトリス盤面の横のマス数
const BLOCK_SIZE = 30; // 1マスのサイズ（ピクセル）

// 7種類のテトリミノ（ブロック）の形状を2次元配列で定義
// 1 がブロックがある場所、0 が空の部分を表します
const SHAPES = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'O': [
        [1, 1],
        [1, 1]
    ],
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'S': [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ],
    'Z': [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    'J': [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]
};

// 各テトリミノに対応するネオンカラー
const COLORS = {
    'I': '#00f2fe', // シアン (水色)
    'O': '#ffd000', // イエロー (黄色)
    'T': '#b800ff', // パープル (紫色)
    'S': '#00ff66', // グリーン (黄緑色)
    'Z': '#ff0055', // レッド (赤色)
    'J': '#0066ff', // ブルー (青色)
    'L': '#ff7f00'  // オレンジ (橙色)
};

// ----------------------------------------------------
// 2. HTML要素の取得とCanvasコンテキストの設定
// ----------------------------------------------------
// メインゲーム盤面用のCanvas
const canvas = document.getElementById('tetris-board');
const ctx = canvas.getContext('2d');

// 次のブロック表示用（プレビュー）のCanvas
const nextCanvas = document.getElementById('next-board');
const nextCtx = nextCanvas.getContext('2d');

// UI表示用の要素
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

// スマホ用仮想コントローラーのボタン要素
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnRotate = document.getElementById('btn-rotate');
const btnPause = document.getElementById('btn-pause');
const controlModeDialog = document.getElementById('control-mode-dialog');
const changeControlModeBtn = document.getElementById('change-control-mode');
const tapControlPad = document.getElementById('tap-control-pad');
const mobileQuery = window.matchMedia('(max-width: 680px)');
let controlMode = localStorage.getItem('tetris-control-mode');
let startAfterModeSelection = false;
const HIGH_SCORE_KEY = 'neonTetrisHighScore';
const LEGACY_HIGH_SCORE_KEY = 'tetris-high-score';

// ----------------------------------------------------
// 3. ゲームの変数（状態）の定義
// ----------------------------------------------------
let board = [];        // 20x10の二次元配列（固定されたブロックの情報を保持）
let currentPiece = null; // 現在プレイヤーが操作しているテトリミノ
let nextPiece = null;    // 次に落下してくるテトリミノのプレビュー
let score = 0;           // 現在のスコア
let highScore = 0;       // ハイスコア（localStorageで永続化）
let level = 1;           // 現在のレベル
let lines = 0;           // 消した合計ライン数
let dropCounter = 0;     // 自動落下用のカウンター
let lastTime = 0;        // アニメーション用前回時間
let gameOver = false;    // ゲームオーバー状態
let isPaused = false;    // 一時停止状態
let gameStarted = false;  // ゲーム開始状態
let levelUpTimer = 0;    // レベルアップ表示エフェクト用のタイマー（フレーム数）

// ----------------------------------------------------
// BGM・サウンドの設定
// ----------------------------------------------------
const bgm = new Audio('music/tetris-piano.mp3');
bgm.loop = true;
bgm.volume = 0.35; // ゲームBGMの音量を調整
bgm.preload = 'auto';

const gameoverSound = new Audio('music/GameOver - tetris.mp3');
gameoverSound.volume = 0.45; // ゲームオーバー音の音量を調整
gameoverSound.preload = 'auto';

let isMuted = false; // ミュート状態を管理するフラグ

function playBgm(reset = false) {
    if (isMuted) return;

    if (reset) {
        bgm.currentTime = 0;
    }

    bgm.muted = false;
    bgm.play().catch(e => console.log("BGM再生に失敗しました（ブラウザ制限など）:", e));
}

function prepareAudio() {
    bgm.load();
    gameoverSound.load();
}

// ミュートボタン要素とアイコン要素の取得
const muteBtn = document.getElementById('mute-btn');
const muteIcon = document.getElementById('mute-icon');

// ミュートボタンに表示するSVGアイコンのパス定義（ON時とOFF時）
const MUTE_SVG_PATH_ON = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';
const MUTE_SVG_PATH_OFF = 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z';


// ----------------------------------------------------
// 4. テトリミノのクラス定義
// ----------------------------------------------------
class Piece {
    constructor(shape, color) {
        this.shape = shape; // 形状の2次元配列
        this.color = color; // 色
        // 初期配置座標：盤面中央の上端に配置
        this.x = Math.floor((BOARD_COLS - shape[0].length) / 2);
        this.y = 0;
    }
}

// ----------------------------------------------------
// 5. ボードとゲームの初期化関数
// ----------------------------------------------------
// 20x10の空のゲームボード配列を生成する関数
function createBoard() {
    const newBoard = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
        newBoard.push(Array(BOARD_COLS).fill(0)); // 0 は空マスを表します
    }
    return newBoard;
}

// ----------------------------------------------------
// 6. 描画に関する関数
// ----------------------------------------------------
// 1つのブロックをCanvas上に描画する関数
function drawBlock(context, x, y, color, size = BLOCK_SIZE) {
    // ブロックの塗りつぶし
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size, size);

    // ブロックの境界線を描画して格子状にする
    context.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    context.lineWidth = 1;
    context.strokeRect(x * size, y * size, size, size);

    // ハイライト効果（左と上の境界線を少し白くして立体感を出す）
    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.fillRect(x * size, y * size, size, 2); // 上の辺
    context.fillRect(x * size, y * size, 2, size); // 左の辺
}

// ゲーム盤面の背景グリッド（格子線）を描画する関数
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;

    // 横線を描画
    for (let r = 0; r < BOARD_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(canvas.width, r * BLOCK_SIZE);
        ctx.stroke();
    }

    // 縦線を描画
    for (let c = 0; c < BOARD_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
}

// 落下地点の予測（ゴースト）を描画する関数（ユーザーにやさしい機能）
function drawGhostPiece() {
    if (!currentPiece) return;

    let ghostY = currentPiece.y;
    // 衝突するまでダミーのY座標を下げていく
    while (!collide(board, { shape: currentPiece.shape, x: currentPiece.x, y: ghostY + 1 })) {
        ghostY++;
    }

    // 予測位置を細い枠線で描画
    currentPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                ctx.strokeStyle = currentPiece.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(
                    (currentPiece.x + c) * BLOCK_SIZE + 2,
                    (ghostY + r) * BLOCK_SIZE + 2,
                    BLOCK_SIZE - 4,
                    BLOCK_SIZE - 4
                );
            }
        });
    });
}

// NEXT（次のブロック）を描画する関数
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;

    const shape = nextPiece.shape;
    const previewBlockSize = 24; // プレビュー用のやや小さめのサイズ

    // NEXTキャンバスの中央にブロックを配置するための余白（オフセット）計算
    const offsetX = (nextCanvas.width - shape[0].length * previewBlockSize) / 2;
    const offsetY = (nextCanvas.height - shape.length * previewBlockSize) / 2;

    shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                // NEXT用ブロックの描画
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(offsetX + c * previewBlockSize, offsetY + r * previewBlockSize, previewBlockSize, previewBlockSize);

                nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
                nextCtx.lineWidth = 1;
                nextCtx.strokeRect(offsetX + c * previewBlockSize, offsetY + r * previewBlockSize, previewBlockSize, previewBlockSize);

                nextCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                nextCtx.fillRect(offsetX + c * previewBlockSize, offsetY + r * previewBlockSize, previewBlockSize, 2);
                nextCtx.fillRect(offsetX + c * previewBlockSize, offsetY + r * previewBlockSize, 2, previewBlockSize);
            }
        });
    });
}

// 画面全体の描画メイン関数
function draw() {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景グリッドを描画
    drawGrid();

    // ボード（固定されたブロック）を描画
    board.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                drawBlock(ctx, c, r, value);
            }
        });
    });

    // 現在操作中のブロックとゴーストを描画
    if (currentPiece) {
        drawGhostPiece(); // 落下予測を描画

        currentPiece.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value !== 0) {
                    drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, currentPiece.color);
                }
            });
        });
    }

    // レベルアップ時のテキストエフェクト描画
    if (levelUpTimer > 0) {
        ctx.save();
        // だんだんフェードアウトするように透明度を調整
        ctx.fillStyle = `rgba(0, 242, 254, ${levelUpTimer / 60})`;
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // ネオンのように発光させるシャドウエフェクト
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 15;

        ctx.fillText('LEVEL UP!', canvas.width / 2, canvas.height / 2);
        ctx.restore();

        levelUpTimer--; // タイマーを1減らす
    }
}

// ----------------------------------------------------
// 7. テトリミノの物理・衝突判定
// ----------------------------------------------------
// 指定された位置のブロックが盤面の枠外に出たり、固定ブロックと重なったりしないかチェックする関数
function collide(board, piece) {
    const shape = piece.shape;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            // ブロックが存在する部分だけをチェック
            if (shape[r][c] !== 0) {
                const targetX = piece.x + c;
                const targetY = piece.y + r;

                // 左右の壁、および床（下端）を突き抜けていないか判定
                if (targetX < 0 || targetX >= BOARD_COLS || targetY >= BOARD_ROWS) {
                    return true;
                }

                // 既に配置されている他のブロックと重なっていないか判定
                // (上部で出現中の一瞬は targetY < 0 なのでチェックをスキップします)
                if (targetY >= 0 && board[targetY][targetX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false; // 衝突がなければ false を返す
}

// 操作中ブロックをボードに固定（マージ）する関数
function merge(board, piece) {
    piece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                const targetY = piece.y + r;
                const targetX = piece.x + c;
                if (targetY >= 0) {
                    board[targetY][targetX] = piece.color; // ブロックの色をボードに記録
                }
            }
        });
    });
}

// ----------------------------------------------------
// 8. 回転・移動の操作関数
// ----------------------------------------------------
// 2次元配列（行列）を時計回りに90度回転させるヘルパー関数
function rotateMatrix(matrix) {
    const n = matrix.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            rotated[c][n - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

// ブロックを回転させる関数（壁との衝突時の補正処理含む）
function pieceRotate() {
    const originalShape = currentPiece.shape;
    const originalX = currentPiece.x;

    // 回転を実行
    currentPiece.shape = rotateMatrix(currentPiece.shape);

    // もし回転した結果、壁や他のブロックにめり込んでしまったら
    // 左右に少しずらしてめり込まない位置を探す（簡易壁キック）
    let offset = 1;
    while (collide(board, currentPiece)) {
        currentPiece.x += offset;
        // offsetを 1, -2, 3... のように交互かつ幅を広げながらチェック
        offset = -(offset + (offset > 0 ? 1 : -1));

        // テトリミノの幅を超えても調整できなかった場合は回転を諦める
        if (Math.abs(offset) > currentPiece.shape[0].length) {
            currentPiece.shape = originalShape; // 回転を元に戻す
            currentPiece.x = originalX;         // 位置を元に戻す
            return;
        }
    }
}

// ブロックを1マス落下させる（自動落下およびソフトドロップ）
function pieceDrop() {
    currentPiece.y++;
    // 落下後に衝突した場合、元の位置に戻して固定する
    if (collide(board, currentPiece)) {
        currentPiece.y--;
        merge(board, currentPiece);
        clearLines(); // 揃ったラインの消去処理へ
        spawnPiece(); // 新しいブロックを生成
    }
    dropCounter = 0; // 落下間隔カウンターをリセット
}

// 一番下まで瞬時に落とす（ハードドロップ）
function pieceHardDrop() {
    // 衝突する手前までY座標を限界まで下げる
    while (!collide(board, currentPiece)) {
        currentPiece.y++;
    }
    currentPiece.y--; // 衝突直前の安全な位置

    merge(board, currentPiece);
    clearLines();
    spawnPiece();
    dropCounter = 0;
}

// ----------------------------------------------------
// 9. ゲームルールと進行管理（ライン消去・スピード調整）
// ----------------------------------------------------
// 7種類の中からランダムにテトリミノを1個生成する
function getRandomPiece() {
    const pieces = Object.keys(SHAPES);
    const randKey = pieces[Math.floor(Math.random() * pieces.length)];
    return new Piece(SHAPES[randKey], COLORS[randKey]);
}

// 新しいテトリミノを登場させる
function spawnPiece() {
    currentPiece = nextPiece || getRandomPiece();
    nextPiece = getRandomPiece(); // 次のブロックをあらかじめ用意

    // 登場した時点で既に衝突している場合は、ゲームオーバー
    if (collide(board, currentPiece)) {
        endGame();
    }

    drawNextPiece(); // プレビューの描画を更新
}

// 揃ったラインを消去し、上の行を下にスライドし、スコアを加算する
function clearLines() {
    let clearedLinesCount = 0;

    // 下の行から順番にチェック
    for (let r = BOARD_ROWS - 1; r >= 0; r--) {
        const isLineFull = board[r].every(value => value !== 0);

        if (isLineFull) {
            clearedLinesCount++;
            board.splice(r, 1); // 揃った行を削除
            board.unshift(Array(BOARD_COLS).fill(0)); // 最上部に空の行を挿入
            r++; // 行が詰めて下がってきたため、同じ行番号をもう一度チェック
        }
    }

    if (clearedLinesCount > 0) {
        // スコア加算
        const scoreTable = [0, 100, 300, 500, 800];
        score += scoreTable[clearedLinesCount] * level;
        lines += clearedLinesCount;

        // リアルタイムにハイスコアを同期
        if (score > highScore) {
            highScore = score;
        }

        // 10ライン消すごとにレベルが1アップ
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelUpTimer = 60; // 60フレーム（約1秒）の間、LEVEL UP!テキストを表示
        }

        updateUI(); // UIに反映
    }
}

// 画面上のスコアやレベルの文字盤を更新する関数
function updateUI() {
    scoreEl.textContent = score;
    highScoreEl.textContent = highScore;
    levelEl.textContent = level;
    linesEl.textContent = lines;
}

function readHighScore() {
    const savedScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
    if (Number.isFinite(savedScore)) return savedScore;

    const legacyScore = parseInt(localStorage.getItem(LEGACY_HIGH_SCORE_KEY), 10) || 0;
    if (legacyScore > 0) localStorage.setItem(HIGH_SCORE_KEY, String(legacyScore));
    return legacyScore;
}

function saveHighScoreIfNeeded() {
    const savedScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 0;
    if (score > savedScore) {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
    }
    highScore = Math.max(highScore, score, savedScore);
}

// 現在のレベルに応じた自動落下の間隔（ミリ秒）を取得する関数
function getDropInterval() {
    // レベルが上がるにつれて等比級数的に速度を上げる (L1: 1000ms, L2: 750ms, L3: 562ms... 下限は 80ms)
    // レベルアップによる速度変化が体感しやすくなります
    return Math.max(80, Math.floor(1000 * Math.pow(0.75, level - 1)));
}

// ----------------------------------------------------
// 10. メインループと状態変更（スタート・ゲームオーバー・一時停止）
// ----------------------------------------------------
// requestAnimationFrameで常に動作する、ゲームのメインクロックループ
function update(time = 0) {
    if (gameOver || isPaused || !gameStarted) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    // 設定された時間（ドロップインターバル）を超えたら自動落下
    if (dropCounter > getDropInterval()) {
        pieceDrop();
    }

    draw();
    requestAnimationFrame(update);
}

// ゲームを開始する関数
function startGame() {
    board = createBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    gameStarted = true;

    updateUI();

    nextPiece = getRandomPiece();
    spawnPiece();

    overlay.classList.add('hidden'); // ポップアップを隠す

    // サウンドの制御：ゲームオーバー音を止めて最初からBGMを再生
    gameoverSound.pause();
    gameoverSound.currentTime = 0;

    playBgm(true);

    lastTime = performance.now();
    dropCounter = 0;
    update();
}

// ゲームを一時停止・再開する関数
function togglePause() {
    if (!gameStarted || gameOver) return;

    isPaused = !isPaused;

    if (isPaused) {
        overlayTitle.textContent = "PAUSED";
        if (mobileQuery.matches && controlMode === 'tap') {
            overlayMsg.innerHTML = `
                <span>タップ操作ガイド</span>
                <span class="tap-help">
                    <span class="wide">↻ 上ボタン：回転</span>
                    <span>← 左ボタン：左移動</span>
                    <span>右ボタン：右移動 →</span>
                    <span class="wide">↓ 下ボタン：ソフトドロップ</span>
                </span>`;
        } else {
            overlayMsg.textContent = "上矢印キーまたはボタンを押してゲームを再開します";
        }
        startBtn.textContent = "RESUME";
        overlay.classList.remove('hidden');

        // 一時停止時はBGMを止める
        bgm.pause();
    } else {
        overlay.classList.add('hidden');
        lastTime = performance.now();
        dropCounter = 0;

        // 再開時にミュート状態でなければBGMを再生
        playBgm();

        update();
    }
}

// ゲームオーバー処理を行う関数
function endGame() {
    gameOver = true;
    overlayTitle.textContent = "GAME OVER";
    overlayMsg.innerHTML = `スコア: <span style="color: #ff007f; font-weight: 800; font-size: 1.6rem; text-shadow: 0 0 10px rgba(255,0,127,0.3);">${score}</span><br>ハイスコアを目指して再挑戦しましょう！`;
    startBtn.textContent = "TRY AGAIN";
    overlay.classList.remove('hidden');

    // ハイスコアを超えていたらLocalStorageに保存する
    saveHighScoreIfNeeded();
    updateUI();

    // ゲームオーバー時はBGMを止めて、ゲームオーバー用のBGMを流す
    bgm.pause();
    bgm.currentTime = 0;

    if (!isMuted) {
        gameoverSound.currentTime = 0;
        gameoverSound.play().catch(e => console.log("ゲームオーバー音の再生に失敗しました:", e));
    }
}

// ----------------------------------------------------
// 11. イベントハンドラの設定
// ----------------------------------------------------
// キーボード入力時の操作設定
document.addEventListener('keydown', event => {
    // ゲームが開始されていない、またはゲームオーバーの時はキーを受け付けない
    if (!gameStarted || gameOver) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
        event.preventDefault();
    }

    // 一時停止状態の時は、上矢印キー以外の操作を無効にする
    if (isPaused && event.key !== 'ArrowUp') {
        return;
    }

    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            // 左に移動
            currentPiece.x--;
            if (collide(board, currentPiece)) {
                currentPiece.x++; // 衝突したら元に戻す
            }
            break;

        case 'ArrowRight':
        case 'd':
        case 'D':
            // 右に移動
            currentPiece.x++;
            if (collide(board, currentPiece)) {
                currentPiece.x--; // 衝突したら元に戻す
            }
            break;

        case 'ArrowDown':
        case 's':
        case 'S':
            // 下に落とす（ソフトドロップ）
            pieceDrop();
            break;

        case ' ': // スペースキー
            // 回転
            pieceRotate();
            break;

        case 'ArrowUp':
            togglePause(); // 一時停止の切り替え
            break;
    }
    draw(); // 操作を反映して再描画
});

// 開始・再開ボタンが押された時の動作
if (window.PointerEvent) {
    startBtn.addEventListener('pointerdown', prepareAudio);
} else {
    startBtn.addEventListener('touchstart', prepareAudio);
    startBtn.addEventListener('mousedown', prepareAudio);
}

startBtn.addEventListener('click', () => {
    if (isPaused) {
        togglePause();
    } else if (mobileQuery.matches && !controlMode) {
        startAfterModeSelection = true;
        showControlModeDialog();
    } else {
        startGame();
    }
});

// ミュートボタンのクリック動作
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;

    // Audioオブジェクトのミュート状態を同期
    bgm.muted = isMuted;
    gameoverSound.muted = isMuted;

    // SVGアイコンの表示パスを切り替えてミュート状況をビジュアル表現
    const pathEl = muteIcon.querySelector('path');
    if (isMuted) {
        pathEl.setAttribute('d', MUTE_SVG_PATH_OFF);
        muteBtn.title = "音声を有効にする";
        // ミュート時は再生も一時的に止める
        bgm.pause();
    } else {
        pathEl.setAttribute('d', MUTE_SVG_PATH_ON);
        muteBtn.title = "音声をミュートにする";
        // ゲーム中かつ進行中（一時停止でもゲームオーバーでもない）ならBGMを再生
        if (gameStarted && !gameOver && !isPaused) {
            playBgm();
        }
    }
});


// ----------------------------------------------------
// 12. ゲームの初回表示設定とハイスコア読み込み
// ----------------------------------------------------
// LocalStorage から過去のハイスコアを読み込む
highScore = readHighScore();
updateUI();

// スマホ用タッチ操作ボタンのイベント設定用ヘルパー関数
function bindButton(btnElement, action) {
    if (!btnElement) return;

    const buttonAction = event => {
        event.preventDefault(); // ズームやスクロールなどのブラウザ標準動作を抑止
        if (gameStarted && !gameOver && !isPaused) {
            action();
            draw();
        }
    };

    if (window.PointerEvent) {
        btnElement.addEventListener('pointerdown', buttonAction);
    } else {
        // タッチ操作用（すばやい反応のために touchstart を利用）
        btnElement.addEventListener('touchstart', buttonAction);

        // マウス操作用（PCでのデバッグ・テスト用）
        btnElement.addEventListener('mousedown', buttonAction);
    }
}

function bindRepeatButton(btnElement, action, repeatMs = 45) {
    if (!btnElement) return;

    let repeatTimer = null;

    const stopRepeat = () => {
        if (repeatTimer) {
            clearInterval(repeatTimer);
            repeatTimer = null;
        }
    };

    const runAction = () => {
        if (!gameStarted || gameOver || isPaused) {
            stopRepeat();
            return;
        }

        action();
        draw();
    };

    const startRepeat = event => {
        if (event.type === 'pointerdown' && event.pointerType === 'touch') return;
        event.preventDefault();
        stopRepeat();
        runAction();
        repeatTimer = setInterval(runAction, repeatMs);
    };

    // Touch events are registered explicitly so releasing or cancelling a touch
    // always stops repetition, including browsers that also support PointerEvent.
    btnElement.addEventListener('touchstart', startRepeat, { passive: false });
    btnElement.addEventListener('touchend', stopRepeat);
    btnElement.addEventListener('touchcancel', stopRepeat);

    if (window.PointerEvent) {
        btnElement.addEventListener('pointerdown', startRepeat);
        btnElement.addEventListener('pointerup', stopRepeat);
        btnElement.addEventListener('pointercancel', stopRepeat);
        btnElement.addEventListener('pointerleave', stopRepeat);
    } else {
        btnElement.addEventListener('mousedown', startRepeat);
        btnElement.addEventListener('mouseup', stopRepeat);
        btnElement.addEventListener('mouseleave', stopRepeat);
    }
}

function bindPauseButton(btnElement) {
    if (!btnElement) return;

    const pauseAction = event => {
        event.preventDefault();
        if (gameStarted && !gameOver) {
            togglePause();
            draw();
        }
    };

    if (window.PointerEvent) {
        btnElement.addEventListener('pointerdown', pauseAction);
    } else {
        btnElement.addEventListener('touchstart', pauseAction);
        btnElement.addEventListener('mousedown', pauseAction);
    }
}

function moveLeft() {
    currentPiece.x--;
    if (collide(board, currentPiece)) {
        currentPiece.x++;
    }
}

function moveRight() {
    currentPiece.x++;
    if (collide(board, currentPiece)) {
        currentPiece.x--;
    }
}

function runTouchAction(action, allowPaused = false) {
    if (!gameStarted || gameOver || (!allowPaused && isPaused)) return;

    action();
    draw();
}

function bindTapZones() {
    if (!tapControlPad) return;

    const actions = { left: moveLeft, right: moveRight, down: pieceDrop, rotate: pieceRotate };
    tapControlPad.querySelectorAll('[data-tap-action]').forEach(zone => {
        const actionName = zone.dataset.tapAction;
        const action = actions[actionName];

        if (actionName === 'left' || actionName === 'right' || actionName === 'down') {
            bindRepeatButton(zone, action, actionName === 'down' ? 55 : 70);
        } else {
            bindButton(zone, action);
        }
    });
}

function applyControlMode(mode) {
    controlMode = mode;
    document.body.classList.toggle('control-mode-tap', mode === 'tap');
    document.body.classList.toggle('control-mode-buttons', mode === 'buttons');
    if (mode) localStorage.setItem('tetris-control-mode', mode);
}

function showControlModeDialog() {
    if (!mobileQuery.matches) return;
    controlModeDialog.hidden = false;
}

controlModeDialog.querySelectorAll('[data-control-mode]').forEach(button => {
    button.addEventListener('click', () => {
        applyControlMode(button.dataset.controlMode);
        controlModeDialog.hidden = true;
        if (startAfterModeSelection) {
            startAfterModeSelection = false;
            startGame();
        }
    });
});

changeControlModeBtn.addEventListener('click', () => {
    startAfterModeSelection = false;
    showControlModeDialog();
});

// 各スマホ仮想キーにテトリスアクションを紐付け
bindRepeatButton(btnLeft, () => {
    moveLeft();
});

bindRepeatButton(btnRight, () => {
    moveRight();
});

bindRepeatButton(btnDown, () => {
    pieceDrop();
});

bindButton(btnRotate, () => {
    pieceRotate();
});

bindPauseButton(btnPause);
bindTapZones();
applyControlMode(controlMode);

board = createBoard();
draw();
