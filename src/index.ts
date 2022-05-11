import * as paper from 'paper';

paper.setup('canvas');

const edgeSize = 25;
const xMax = 1350;
const yMax = 750;
const boardCenter = new paper.Point(xMax / 2, yMax / 2);

let mousePos: paper.Point;
paper.view.on('mousemove', function(event: paper.ToolEvent) {
  mousePos = event.point;
});

let selectedTile: paper.Group = null;
let keydown = false;
let player1 = true;

function roundPoint(point: paper.Point) {
  return new paper.Point([Math.round(point.x), Math.round(point.y)])
}

function getBoard(): [paper.Group, string[][]] {
  const boardPaths = []
  const gamestate: string[][] = [] // 2d array of 0's, initial empty
  for (let rowi = 0; rowi < 14; rowi++) {
    const row = []
    for (let coli = 0; coli < 14; coli++) {
      const topleft = new paper.Point([coli * edgeSize, rowi * edgeSize])
      if ((rowi == 4 && coli == 4) || (rowi == 9 && coli == 9)) {
        const startingCircle = new paper.Path.Circle(
          topleft.add(new paper.Point([edgeSize / 2, edgeSize / 2])), 
          edgeSize / 3);
        boardPaths.push(startingCircle);
      }
      boardPaths.push(new paper.Path.Rectangle(topleft, new paper.Size([edgeSize, edgeSize])))
      row.push('0');
    }
    gamestate.push(row);
  }
  const board = new paper.Group(boardPaths)
  return [board, gamestate];
}

function getTileCode(tiles1: paper.Group[], tiles2: paper.Group[], tile: paper.Group) {
  const index1 = tiles1.indexOf(tile);
  const index2 = tiles2.indexOf(tile);
  return index1 >= 0 ? 'r' + (index1 + 1) : 'b' + (index2 + 1);
}

function drawBoard(board: paper.Group) {
  board.strokeColor = new paper.Color('gainsboro');
  board.position = boardCenter;
}

function getInfoText() {
  const infoText = new paper.PointText(new paper.Point(boardCenter.x, 600));
  infoText.justification = 'center';
  return infoText;
}

function drawInfoText(infoText: paper.PointText, player1: boolean) {
  if (player1) {
    infoText.fillColor = new paper.Color('red');
    infoText.content = 'Red player\'s turn';
  } else {
    infoText.fillColor = new paper.Color('#2076e6');
    infoText.content = 'Blue player\'s turn';
  }
}

function getSpawnPoint(tileCode: string) {
  const tileIndex = +tileCode.slice(1) - 1;
  const gridx = 4;
  const colNumber = tileIndex % gridx;
  const rowNumber = Math.floor(tileIndex / gridx);
  const xCenter = colNumber * 3.5 * edgeSize + 2 * edgeSize;
  const yCenter = rowNumber * 5 * edgeSize + 2.5 * edgeSize;
  const offset = tileCode[0] == 'b' ? 990 : 0;
  return new paper.Point([xCenter + offset, yCenter]);
}

function getTiles() {
  const tileStrings = [
    "00",
    "00,01",
    "00,01,02",
    "00,01,11",
    "00,01,02,03",
    "00,01,02,12",
    "00,01,02,11",
    "00,01,10,11",
    "00,01,11,12",
    "00,01,02,03,04",
    "00,01,02,03,13",
    "00,01,02,12,13",
    "00,01,02,11,12",
    "00,01,02,10,12",
    "00,01,02,03,11",
    "10,11,12,02,22",
    "00,01,02,12,22",
    "00,10,11,21,22",
    "00,01,11,21,22",
    "00,01,11,21,12",
    "10,01,11,21,12",
  ];

  function getTile(tileString: string) {
    const coorStrings = tileString.split(',');
    return new paper.Group(coorStrings.map(function (coorString: string) {
      return new paper.Path.Rectangle(new paper.Point(+coorString[0] * edgeSize, +coorString[1] * edgeSize), new paper.Size(edgeSize, edgeSize));
    }));
  };

  const tiles = tileStrings.map(getTile);
  return tiles;
}

function drawTiles(tiles1: paper.Group[], tiles2: paper.Group[]) {
  const allTiles = tiles1.concat(tiles2);
  for (let tileIndex = 0; tileIndex < 42; tileIndex++) {
    const tile = allTiles[tileIndex];
    const tileCode = getTileCode(tiles1, tiles2, tile);
    tile.fillColor = new paper.Color('red');
    if (tileCode[0] == 'b') {
      tile.fillColor = new paper.Color('#2076e6');
    }
    tile.strokeColor = new paper.Color('black');
    tile.position = getSpawnPoint(tileCode)
  }
}

function updateGamestate(tiles1: paper.Group[], tiles2: paper.Group[], tile: paper.Group, gamestate: string[][]) {
  function extractTopLeftPoints(tile: paper.Group) {
    const topLeftPoints: paper.Point[] = []
    for (let i = 0; i < tile.children.length; i++) {
      const path = tile.children[i] as paper.Path;
      const topleftPoint = path.segments[1].point;
      topLeftPoints.push(topleftPoint);
    }
    return topLeftPoints;
  }

  const topLeftPoints = extractTopLeftPoints(tile);

  function getIndexPoints(topLeftPoints: paper.Point[]) {
    const boardTopLeft = new paper.Point((boardCenter.x) - (14 * edgeSize / 2), (boardCenter.y) - (14 * edgeSize / 2));
    const indexPoints = [];
    for (let i = 0; i < topLeftPoints.length; i++) {
      const topLeftPoint = topLeftPoints[i];
      const indexPoint = roundPoint((topLeftPoint.subtract(boardTopLeft)).divide(edgeSize));
      indexPoints.push(indexPoint);
    }
    return indexPoints;
  }

  const indexPoints = getIndexPoints(topLeftPoints);
  const tileCode = getTileCode(tiles1, tiles2, tile);

  for (let i = 0; i < indexPoints.length; i++) {
    const indexPoint = indexPoints[i];
    if (indexPoint.x > 0 && indexPoint.y > 0 && indexPoint.x < 14 && indexPoint.y < 14) {
      gamestate[indexPoint.y][indexPoint.x] = tileCode;
    }
  }

  return true;
}

function addListeners(tiles1: paper.Group[], tiles2: paper.Group[], gamestate: string[][], board: paper.Group, infoText: paper.PointText) {
  function rotateAnim(tile: paper.Group, positive: boolean) {
    let counter = 0;
    if (!paper.view.onFrame) {
      paper.view.onFrame = function () {
        if (positive) {
          tile.rotate(5);
        } else {
          tile.rotate(-5);
        }
        counter++;
        if (counter == 90 / 5) {
          paper.view.onFrame = undefined;
        }
      };
    }
  }

  function getSnap(val: number) {
    return edgeSize * Math.round(val / edgeSize)
  }

  paper.view.on('keyup', function() {
    keydown = false;
  })

  paper.view.on('keydown', function (event: paper.KeyEvent) {
    if (!keydown) {
      if (selectedTile) {
        if (event.key == 'a') {
          rotateAnim(selectedTile, false)
        }
        else if (event.key == 'd') {
          rotateAnim(selectedTile, true)
        }
        else if (event.key == 's') {
          if (!paper.view.onFrame) {
            selectedTile.scale(-1, 1);
          }
        }
        else if (event.key == 'w') {
          if (!paper.view.onFrame) {
            selectedTile.scale(1, -1);
          }
        }
        else if (event.key == 'f') {
          const tileCode = getTileCode(tiles1, tiles2, selectedTile);
          selectedTile.position = getSpawnPoint(tileCode);
          selectedTile = null;
        }
      }
      keydown = true;
    }
  });

  paper.view.on('mousemove', function (event: paper.ToolEvent) {
    if (selectedTile) {
      selectedTile.position = selectedTile.position.add(event.delta);
    }
  });

  function findAtPoint(tiles: paper.Group[], point: paper.Point) {
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      if (tile.contains(point)) {
        return tile;
      }
    }
  }

  paper.view.on('mousedown', function () {
    if (selectedTile) {
      const path = selectedTile.children[0] as paper.Path;
      const tilePoint = path.segments[0].point;
      const x = tilePoint.x;
      const y = tilePoint.y;
      const snapPoint = new paper.Point([getSnap(x), getSnap(y)]);
      selectedTile.translate(snapPoint.subtract(tilePoint));
      const valid = updateGamestate(tiles1, tiles2, selectedTile, gamestate);
      selectedTile = null;
      if (valid) {
        player1 = !player1;
        drawInfoText(infoText, player1);
      }
    } 
    else {
      const targetTile = findAtPoint(tiles1.concat(tiles2), mousePos);
      if (targetTile) {
        const tileCode = getTileCode(tiles1, tiles2, targetTile);
        const rightColor = (tileCode[0] == 'r' && player1) || (tileCode[0] == 'b' && !player1);
        const path = targetTile.children[0] as paper.Path;
        const tilePlaced = board.contains(path.segments[0].point);
        if (rightColor && !tilePlaced) {
          selectedTile = targetTile;
        }
      }
    }
  });
}

const [board, gamestate] = getBoard();
drawBoard(board);

const infoText = getInfoText();
drawInfoText(infoText, player1); 

(function () {
  const controls = new paper.PointText(new paper.Point(boardCenter.x, 700));
  controls.justification = 'center';
  controls.content = 'Left click to select tile, move mouse to move tile, left click again to place tile.\nFor selected tile: A and D to rotate, S to mirror across y, W to mirror across x, F to return.'
  controls.fillColor = new paper.Color('black');
})();

const tiles1 = getTiles();
const tiles2 = getTiles();
drawTiles(tiles1, tiles2);

addListeners(tiles1, tiles2, gamestate, board, infoText);
