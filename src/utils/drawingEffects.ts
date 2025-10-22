export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = source;
  });
}

export async function applyMagicFrame(
  dataUrl: string,
  options: { padding?: number } = {}
): Promise<string> {
  const padding = options.padding ?? 48;
  const image = await loadImageElement(dataUrl);

  const canvas = document.createElement('canvas');
  const width = image.width + padding * 2;
  const height = image.height + padding * 2;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataUrl;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fdf2f8');
  gradient.addColorStop(0.5, '#f5f3ff');
  gradient.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const frameX = padding * 0.35;
  const frameY = padding * 0.35;
  const frameWidth = width - frameX * 2;
  const frameHeight = height - frameY * 2;
  const cornerRadius = Math.min(48, padding);

  ctx.save();
  ctx.shadowColor = 'rgba(148, 93, 214, 0.25)';
  ctx.shadowBlur = padding * 0.6;
  ctx.shadowOffsetY = padding * 0.25;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  drawRoundedRect(ctx, frameX, frameY, frameWidth, frameHeight, cornerRadius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, frameX + padding * 0.2, frameY + padding * 0.2, frameWidth - padding * 0.4, frameHeight - padding * 0.4, cornerRadius - padding * 0.2);
  ctx.clip();
  ctx.filter = 'saturate(1.15) contrast(1.05)';
  ctx.drawImage(image, padding, padding, image.width, image.height);
  ctx.restore();

  ctx.lineWidth = padding * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  drawRoundedRect(ctx, frameX + padding * 0.12, frameY + padding * 0.12, frameWidth - padding * 0.24, frameHeight - padding * 0.24, cornerRadius - padding * 0.25);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
