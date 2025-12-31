const board = document.getElementById('board');
const modeSelection = document.getElementById('mode-selection');
const startMenu = document.getElementById('start-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const gameOverMessage = document.getElementById('game-over-message');
const promotionMenu = document.getElementById('promotion-menu');
const btnPvp = document.getElementById('btn-pvp');
const btnAi = document.getElementById('btn-ai');

let selectedTile = null;
let turn = 'white';
let gameMode = null; // 'pvp' or 'ai'
let isGameOver = false;

// State for Special Moves
let castlingRights = {
    whiteKingMoved: false,
    whiteRookKingsideMoved: false,
    whiteRookQueensideMoved: false,
    blackKingMoved: false,
    blackRookKingsideMoved: false,
    blackRookQueensideMoved: false
};
let enPassantTarget = null; // { row, col } or null
let pendingPromotion = null; // { row, col } to place promoted piece

// Event Listeners
btnPvp.addEventListener('click', () => startGame('pvp'));
btnAi.addEventListener('click', () => startGame('ai'));

document.querySelectorAll('.promo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const pieceType = e.currentTarget.dataset.piece;
        finalizePromotion(pieceType);
    });
});

const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const startingBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

function startGame(mode) {
    gameMode = mode;
    modeSelection.classList.add('hidden');
    startMenu.classList.add('hidden');
    createBoard();
}

function showGameOver(winner) {
    isGameOver = true;
    modeSelection.classList.remove('hidden');
    gameOverMenu.classList.remove('hidden');

    if (winner === 'draw') {
        gameOverMessage.textContent = "¡Juego Terminado! Tablas (Ahogado)";
    } else {
        const winnerText = winner === 'white' ? 'Blancas' : 'Negras';
        gameOverMessage.textContent = `¡Juego Terminado! Ganan ${winnerText}`;
    }
}

function showPromotionMenu(row, col) {
    pendingPromotion = { row, col };
    modeSelection.classList.remove('hidden');
    promotionMenu.classList.remove('hidden');
}

function finalizePromotion(pieceType) {
    if (!pendingPromotion) return;

    // Determine color based on row (0 for White, 7 for Black) is simplest
    const isWhitePiece = pendingPromotion.row === 0;
    const actualPiece = isWhitePiece ? pieceType.toUpperCase() : pieceType;

    startingBoard[pendingPromotion.row][pendingPromotion.col] = actualPiece;

    modeSelection.classList.add('hidden');
    promotionMenu.classList.add('hidden');
    pendingPromotion = null;

    createBoard();

    const nextTurn = isWhitePiece ? 'black' : 'white';
    if (checkGameOver(nextTurn)) return;

    if (gameMode === 'ai' && nextTurn === 'black') {
        setTimeout(makeAIMove, 500);
    }
}

function createBoard() {
    board.innerHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']; // Visual ranks top-down

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.classList.add((row + col) % 2 === 0 ? 'white' : 'black');

            tile.dataset.row = row;
            tile.dataset.col = col;

            // Render Piece
            const piece = startingBoard[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.classList.add('piece');
                pieceSpan.textContent = pieces[piece];
                tile.appendChild(pieceSpan);
            }

            // Render Coordinates
            // Rank Numbers (1-8) on the Left column (col 0)
            if (col === 0) {
                const rankSpan = document.createElement('span');
                rankSpan.classList.add('coord', 'coord-rank');
                rankSpan.textContent = ranks[row]; // row 0 is rank 8
                tile.appendChild(rankSpan);
            }

            // File Letters (a-h) on the Bottom row (row 7)
            if (row === 7) {
                const fileSpan = document.createElement('span');
                fileSpan.classList.add('coord', 'coord-file');
                fileSpan.textContent = files[col];
                tile.appendChild(fileSpan);
            }

            tile.addEventListener('click', handleTileClick);
            board.appendChild(tile);
        }
    }
}

function handleTileClick(e) {
    if (isGameOver || pendingPromotion) return;
    if (gameMode === 'ai' && turn === 'black') return;

    const clickedTile = e.currentTarget;
    const row = parseInt(clickedTile.dataset.row);
    const col = parseInt(clickedTile.dataset.col);
    const pieceSpan = clickedTile.querySelector('.piece');
    const content = pieceSpan ? pieceSpan.textContent : "";

    if (!selectedTile) {
        if (content !== "") {
            const piece = startingBoard[row][col];
            const isWhite = piece === piece.toUpperCase();

            if ((turn === 'white' && isWhite) || (turn === 'black' && !isWhite)) {
                selectedTile = clickedTile;
                highlightTile(clickedTile, true);
            }
        }
    } else {
        const startRow = parseInt(selectedTile.dataset.row);
        const startCol = parseInt(selectedTile.dataset.col);
        const pieceToMove = startingBoard[startRow][startCol];

        if (isSafeMove(pieceToMove, startRow, startCol, row, col)) {
            executeMove(startRow, startCol, row, col, pieceToMove);
        } else {
            highlightTile(selectedTile, false);

            // Allow re-selection if clicking another own piece
            if (startingBoard[row][col] !== '') {
                const targetPiece = startingBoard[row][col];
                const isTargetWhite = targetPiece === targetPiece.toUpperCase();
                const isCurrentWhite = pieceToMove === pieceToMove.toUpperCase();

                if (isTargetWhite === isCurrentWhite) {
                    selectedTile = clickedTile;
                    highlightTile(clickedTile, true);
                    return;
                }
            }
            selectedTile = null;
        }
    }
}

function highlightTile(tile, isActive) {
    // We use inline style for bg color, but let's check if we should use a class for premium look
    // Using inline is sufficient as long as it overrides CSS
    // For premium look, let's use a semi-transparent yellow?
    // style.css defines --highlight. Let's use that if possible? 
    // JS interacting with CSS variables is okay.
    if (isActive) tile.style.backgroundColor = "var(--highlight)";
    else tile.style.backgroundColor = "";
}

function executeMove(startRow, startCol, endRow, endCol, piece) {
    // 1. Handle Special Moves Side Effects

    // Castling
    if (piece.toLowerCase() === 'k' && Math.abs(endCol - startCol) === 2) {
        if (endCol > startCol) {
            const rook = startingBoard[startRow][7];
            startingBoard[startRow][5] = rook;
            startingBoard[startRow][7] = '';
        } else {
            const rook = startingBoard[startRow][0];
            startingBoard[startRow][3] = rook;
            startingBoard[startRow][0] = '';
        }
    }

    // En Passant
    if (piece.toLowerCase() === 'p' && Math.abs(endCol - startCol) === 1 && startingBoard[endRow][endCol] === '') {
        startingBoard[startRow][endCol] = '';
    }

    updateCastlingRights(startRow, startCol, piece);

    // 2. Move the Piece
    startingBoard[endRow][endCol] = piece;
    startingBoard[startRow][startCol] = '';

    // 3. Set/Reset En Passant Target
    if (piece.toLowerCase() === 'p' && Math.abs(endRow - startRow) === 2) {
        enPassantTarget = { row: (startRow + endRow) / 2, col: startCol };
    } else {
        enPassantTarget = null;
    }

    // 4. Check for Promotion
    if (piece.toLowerCase() === 'p' && (endRow === 0 || endRow === 7)) {
        selectedTile = null;
        createBoard();
        if (gameMode === 'ai' && turn === 'black') {
            startingBoard[endRow][endCol] = 'q';
        } else {
            showPromotionMenu(endRow, endCol);
            return;
        }
    }

    // 5. Switch Turn
    const nextTurn = (turn === 'white') ? 'black' : 'white';
    turn = nextTurn;

    selectedTile = null;
    createBoard();

    if (checkGameOver(nextTurn)) return;

    if (gameMode === 'ai' && turn === 'black') {
        setTimeout(makeAIMove, 500);
    }
}

function updateCastlingRights(r, c, piece) {
    if (piece === 'K') castlingRights.whiteKingMoved = true;
    if (piece === 'k') castlingRights.blackKingMoved = true;
    if (piece === 'R') {
        if (c === 0) castlingRights.whiteRookQueensideMoved = true;
        if (c === 7) castlingRights.whiteRookKingsideMoved = true;
    }
    if (piece === 'r') {
        if (c === 0) castlingRights.blackRookQueensideMoved = true;
        if (c === 7) castlingRights.blackRookKingsideMoved = true;
    }
}

// ------ VALIDATION ------

function isSafeMove(piece, startRow, startCol, endRow, endCol) {
    if (!isPseudoLegalMove(piece, startRow, startCol, endRow, endCol, startingBoard)) {
        return false;
    }

    const savedDest = startingBoard[endRow][endCol];
    const savedStart = startingBoard[startRow][startCol];

    // Check Castling path safety
    if (piece.toLowerCase() === 'k' && Math.abs(endCol - startCol) === 2) {
        if (isInCheck((piece === 'K' ? 'white' : 'black'), startingBoard)) return false;
        const middleCol = (startCol + endCol) / 2;
        startingBoard[startRow][middleCol] = piece;
        startingBoard[startRow][startCol] = '';
        const middleCheck = isInCheck((piece === 'K' ? 'white' : 'black'), startingBoard);
        startingBoard[startRow][startCol] = piece;
        startingBoard[startRow][middleCol] = '';
        if (middleCheck) return false;
    }

    // Simulate
    startingBoard[endRow][endCol] = piece;
    startingBoard[startRow][startCol] = '';

    let savedEPPawn = null;
    if (piece.toLowerCase() === 'p' && Math.abs(endCol - startCol) === 1 && savedDest === '') {
        savedEPPawn = startingBoard[startRow][endCol];
        startingBoard[startRow][endCol] = '';
    }

    const myColor = (piece === piece.toUpperCase()) ? 'white' : 'black';
    const kingSafe = !isInCheck(myColor, startingBoard);

    // Revert
    startingBoard[startRow][startCol] = savedStart;
    startingBoard[endRow][endCol] = savedDest;
    if (savedEPPawn) startingBoard[startRow][endCol] = savedEPPawn;

    return kingSafe;
}

function isInCheck(color, boardState) {
    let kingRow, kingCol;
    const kingSymbol = (color === 'white') ? 'K' : 'k';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c] === kingSymbol) {
                kingRow = r;
                kingCol = c;
                break;
            }
        }
    }

    if (kingRow === undefined) return true;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (!piece) continue;

            const isPieceWhite = piece === piece.toUpperCase();
            const isKingWhite = color === 'white';

            if (isPieceWhite !== isKingWhite) {
                if (isPseudoLegalMove(piece, r, c, kingRow, kingCol, boardState, true)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function checkGameOver(currentTurnColor) {
    let hasMoves = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = startingBoard[r][c];
            if (!piece) continue;
            const isPieceWhite = piece === piece.toUpperCase();
            if ((currentTurnColor === 'white' && isPieceWhite) || (currentTurnColor === 'black' && !isPieceWhite)) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isSafeMove(piece, r, c, tr, tc)) {
                            hasMoves = true;
                            break;
                        }
                    }
                    if (hasMoves) break;
                }
            }
            if (hasMoves) break;
        }
        if (hasMoves) break;
    }

    if (!hasMoves) {
        if (isInCheck(currentTurnColor, startingBoard)) {
            const winner = (currentTurnColor === 'white') ? 'black' : 'white';
            showGameOver(winner);
        } else {
            showGameOver('draw');
        }
        return true;
    }
    return false;
}

function makeAIMove() {
    const legalMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = startingBoard[r][c];
            if (piece && piece === piece.toLowerCase()) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isSafeMove(piece, r, c, tr, tc)) {
                            legalMoves.push({
                                startRow: r, startCol: c,
                                endRow: tr, endCol: tc,
                                piece: piece
                            });
                        }
                    }
                }
            }
        }
    }

    if (legalMoves.length > 0) {
        const captureMoves = legalMoves.filter(m => startingBoard[m.endRow][m.endCol] !== '');
        let move = (captureMoves.length > 0)
            ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
            : legalMoves[Math.floor(Math.random() * legalMoves.length)];
        executeMove(move.startRow, move.startCol, move.endRow, move.endCol, move.piece);
    } else {
        if (isInCheck('black', startingBoard)) showGameOver('white');
        else showGameOver('draw');
    }
}

function isPathClear(r0, c0, r1, c1, boardState) {
    const stepR = r1 === r0 ? 0 : (r1 > r0 ? 1 : -1);
    const stepC = c1 === c0 ? 0 : (c1 > c0 ? 1 : -1);
    let r = r0 + stepR;
    let c = c0 + stepC;
    while (r !== r1 || c !== c1) {
        if (boardState[r][c] !== '') return false;
        r += stepR;
        c += stepC;
    }
    return true;
}

function isPseudoLegalMove(piece, startRow, startCol, endRow, endCol, boardState, ignoreSpecial = false) {
    const dr = Math.abs(endRow - startRow);
    const dc = Math.abs(endCol - startCol);
    const isWhite = piece === piece.toUpperCase();

    if (boardState[endRow][endCol] !== '') {
        const targetPiece = boardState[endRow][endCol];
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if (isWhite === isTargetWhite) return false;
    }

    if (piece.toLowerCase() === 'p') {
        const direction = isWhite ? -1 : 1;
        const startRowForPawn = isWhite ? 6 : 1;

        if (startCol === endCol && endRow === startRow + direction && boardState[endRow][endCol] === '') return true;
        if (startCol === endCol && startRow === startRowForPawn && endRow === startRow + (direction * 2) && boardState[endRow][endCol] === '' && boardState[startRow + direction][startCol] === '') return true;
        if (dc === 1 && endRow === startRow + direction && boardState[endRow][endCol] !== '') return true;

        if (!ignoreSpecial && enPassantTarget && dc === 1 && endRow === startRow + direction && boardState[endRow][endCol] === '') {
            if (enPassantTarget.row === endRow && enPassantTarget.col === endCol) return true;
        }

        return false;
    }

    if (piece.toLowerCase() === 'r') {
        return (startRow === endRow || startCol === endCol) && isPathClear(startRow, startCol, endRow, endCol, boardState);
    }

    if (piece.toLowerCase() === 'n') {
        return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }

    if (piece.toLowerCase() === 'b') {
        return (dr === dc) && isPathClear(startRow, startCol, endRow, endCol, boardState);
    }

    if (piece.toLowerCase() === 'q') return (dr === dc || startRow === endRow || startCol === endCol) && isPathClear(startRow, startCol, endRow, endCol, boardState);

    if (piece.toLowerCase() === 'k') {
        if (dr <= 1 && dc <= 1) return true;

        if (!ignoreSpecial && dr === 0 && dc === 2) {
            if (isWhite) {
                if (castlingRights.whiteKingMoved) return false;
                if (endCol > startCol) {
                    if (castlingRights.whiteRookKingsideMoved) return false;
                    return isPathClear(startRow, startCol, startRow, 7, boardState);
                } else {
                    if (castlingRights.whiteRookQueensideMoved) return false;
                    return isPathClear(startRow, startCol, startRow, 0, boardState);
                }
            } else {
                if (castlingRights.blackKingMoved) return false;
                if (endCol > startCol) {
                    if (castlingRights.blackRookKingsideMoved) return false;
                    return isPathClear(startRow, startCol, startRow, 7, boardState);
                } else {
                    if (castlingRights.blackRookQueensideMoved) return false;
                    return isPathClear(startRow, startCol, startRow, 0, boardState);
                }
            }
        }
        return false;
    }

    return false;
}

createBoard();