const calculateX = (square: string, isFlipped: boolean, squareSize: number) => {
  let columnIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  if (isFlipped) {
    columnIndex = 7 - columnIndex;
  }
  return columnIndex * squareSize + squareSize / 2;
};

const calculateY = (square: string, isFlipped: boolean, squareSize: number) => {
  let rowIndex = 8 - parseInt(square[1]);
  if (isFlipped) {
    rowIndex = 7 - rowIndex;
  }
  return rowIndex * squareSize + squareSize / 2;
};

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  start: string,
  end: string,
  isFlipped: boolean,
  squareSize: number
) => {
  const startX = calculateX(start, isFlipped, squareSize);
  const startY = calculateY(start, isFlipped, squareSize);
  const endX = calculateX(end, isFlipped, squareSize);
  const endY = calculateY(end, isFlipped, squareSize);

  // Draw arrow
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = '#EC923F';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowheadSize = 15;
  const arrowheadX1 = endX - arrowheadSize * Math.cos(angle - Math.PI / 6);
  const arrowheadY1 = endY - arrowheadSize * Math.sin(angle - Math.PI / 6);
  const arrowheadX2 = endX - arrowheadSize * Math.cos(angle + Math.PI / 6);
  const arrowheadY2 = endY - arrowheadSize * Math.sin(angle + Math.PI / 6);

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrowheadX1, arrowheadY1);
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrowheadX2, arrowheadY2);
  ctx.strokeStyle = '#EC923F';
  ctx.lineWidth = 2;
  ctx.stroke();
};



