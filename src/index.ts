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

var selectedTile: paper.Group | null = null;
var keydown = false;
var player1 = true;

function roundPoint(point: paper.Point) {
  return new paper.Point([Math.round(point.x), Math.round(point.y)])
}

function getBoard(): [paper.Group, string[][]] {
  var boardPaths = []
  var gamestate: string[][] = [] // 2d array of 0's, initial empty
  for (var rowi = 0; rowi < 14; rowi++) {
    var row = []
    for (var coli = 0; coli < 14; coli++) {
      var topleft = new paper.Point([coli * edgeSize, rowi * edgeSize])
      if ((rowi == 4 && coli == 4) || (rowi == 9 && coli == 9)) {
        var startingCircle = new paper.Path.Circle(
          topleft.add(new paper.Point([edgeSize / 2, edgeSize / 2])), 
          edgeSize / 3);
        boardPaths.push(startingCircle);
      }
      boardPaths.push(new paper.Path.Rectangle(topleft, new paper.Size([edgeSize, edgeSize])))
      row.push('0');
    }
    gamestate.push(row);
  }
  var board = new paper.Group(boardPaths)
  return [board, gamestate];
}

function getTileCode(tiles1: paper.Group[], tiles2: paper.Group[], tile: paper.Group) {
  let tileCode: string;
  if (tiles1.indexOf(tile) >= 0) {
    tileCode = 'r' + (tiles1.indexOf(tile) + 1) // r for red
  } else {
    tileCode =  'b' + (tiles2.indexOf(tile) + 1) // b for blue
  }
  return tileCode;
}

function drawBoard(board: paper.Group) {
  board.strokeColor = new paper.Color('gainsboro');
  board.position = boardCenter;
}

function getInfoText() {
  var infoText = new paper.PointText(new paper.Point(boardCenter.x, 600));
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
  var tileIndex = +tileCode.slice(1) - 1;
  var gridx = 4;
  var colNumber = tileIndex % gridx;
  var rowNumber = Math.floor(tileIndex / gridx);
  var xCenter = colNumber * 3.5 * edgeSize + 2 * edgeSize;
  var yCenter = rowNumber * 5 * edgeSize + 2.5 * edgeSize;
  var offset = 0;
  if (tileCode[0] == 'b') {
    offset = 990;
  }
  return new paper.Point([xCenter + offset, yCenter]);
}

function getTiles() {
  var tileStrings = [
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

  var getTile = function (tileString: string) {
    var coorStrings = tileString.split(',');
    return new paper.Group(coorStrings.map(function (coorString: string) {
      return new paper.Path.Rectangle(new paper.Point(+coorString[0] * edgeSize, +coorString[1] * edgeSize), new paper.Size(edgeSize, edgeSize));
    }));
  };

  var tiles = tileStrings.map(getTile);
  return tiles;
}

function drawTiles(tiles1: paper.Group[], tiles2: paper.Group[]) {
  var allTiles = tiles1.concat(tiles2);
  for (var tileIndex = 0; tileIndex < 42; tileIndex++) {
    var tile = allTiles[tileIndex];
    var tileCode = getTileCode(tiles1, tiles2, tile);
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
    var topLeftPoints: paper.Point[] = []
    for (var i = 0; i < tile.children.length; i++) {
      var path = tile.children[i] as paper.Path;
      var topleftPoint = path.segments[1].point;
      topLeftPoints.push(topleftPoint);
    }
    return topLeftPoints;
  }

  var topLeftPoints = extractTopLeftPoints(tile);

  function getIndexPoints(topLeftPoints: paper.Point[]) {
    var boardTopLeft = new paper.Point((boardCenter.x) - (14 * edgeSize / 2), (boardCenter.y) - (14 * edgeSize / 2));
    var indexPoints = [];
    for (var i = 0; i < topLeftPoints.length; i++) {
      var topLeftPoint = topLeftPoints[i];
      var indexPoint = roundPoint((topLeftPoint.subtract(boardTopLeft)).divide(edgeSize));
      indexPoints.push(indexPoint);
    }
    return indexPoints;
  }

  var indexPoints = getIndexPoints(topLeftPoints);
  var tileCode = getTileCode(tiles1, tiles2, tile);

  for (var i = 0; i < indexPoints.length; i++) {
    var indexPoint = indexPoints[i];
    if (indexPoint.x > 0 && indexPoint.y > 0 && indexPoint.x < 14 && indexPoint.y < 14) {
      gamestate[indexPoint.y][indexPoint.x] = tileCode;
    }
  }

  return true;
}

function addListeners(tiles1: paper.Group[], tiles2: paper.Group[], gamestate: string[][], board: paper.Group, infoText: paper.PointText) {
  function rotateAnim(tile: paper.Group, positive: boolean) {
    var counter = 0;
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
          var tileCode = getTileCode(tiles1, tiles2, selectedTile);
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

  paper.view.on('mousedown', function () {
    if (selectedTile) {
      var path = selectedTile.children[0] as paper.Path;
      var tilePoint = path.segments[0].point;
      var x = tilePoint.x;
      var y = tilePoint.y;
      var snapPoint = new paper.Point([getSnap(x), getSnap(y)]);
      selectedTile.translate(snapPoint.subtract(tilePoint));
      var valid = updateGamestate(tiles1, tiles2, selectedTile, gamestate);
      selectedTile = null;
      if (valid) {
        player1 = !player1;
        drawInfoText(infoText, player1);
      }
    } else {
      var targetTile: paper.Group;
      for (let i = 0; i < 42; i++) {
        const tile = tiles1.concat(tiles2)[i];
        if (tile.contains(mousePos)) {
          targetTile = tile;
          break;
        }
      }

      if (targetTile) {
        var tileCode = getTileCode(tiles1, tiles2, targetTile);
        var rightColor = (tileCode[0] == 'r' && player1) || (tileCode[0] == 'b' && !player1);
        var path = targetTile.children[0] as paper.Path;
        var tilePlaced = board.contains(path.segments[0].point);
        if (rightColor && !tilePlaced) {
          selectedTile = targetTile;
        }
      }
    }
  });
}

var [board, gamestate] = getBoard();
drawBoard(board);

var infoText = getInfoText();
drawInfoText(infoText, player1); 

(function () {
  var controls = new paper.PointText(new paper.Point(boardCenter.x, 700));
  controls.justification = 'center';
  controls.content = 'Left click to select tile, move mouse to move tile, left click again to place tile.\nFor selected tile: A and D to rotate, S to mirror across y, W to mirror across x, F to return.'
  controls.fillColor = new paper.Color('black');
})();

var tiles1 = getTiles();
var tiles2 = getTiles();
drawTiles(tiles1, tiles2);

addListeners(tiles1, tiles2, gamestate, board, infoText);
