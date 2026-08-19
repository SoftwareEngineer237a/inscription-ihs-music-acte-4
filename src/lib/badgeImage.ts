import QRCode from "qrcode";
import { CONFIG } from "../config";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function downloadBadgeImage(nom: string, code: string): Promise<void> {
  await document.fonts.ready;

  const width = 1080;
  const height = 1760;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  const qrUrl = await QRCode.toDataURL(code, {
    width: 560,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0c0a09", light: "#ffffff" },
  });
  const [qrImage, logo] = await Promise.all([loadImage(qrUrl), loadImage(CONFIG.logoUrl)]);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#161210");
  bg.addColorStop(0.45, "#0c0a09");
  bg.addColorStop(1, "#140e0d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width / 2, 220, 20, width / 2, 180, 520);
  glow.addColorStop(0, "rgba(201,168,76,0.20)");
  glow.addColorStop(1, "rgba(201,168,76,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 700);

  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 4;
  roundRect(ctx, 56, 56, width - 112, height - 112, 36);
  ctx.stroke();
  ctx.strokeStyle = "rgba(232,213,163,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, 76, 76, width - 152, height - 152, 28);
  ctx.stroke();

  if (logo) {
    ctx.drawImage(logo, width / 2 - 64, 130, 128, 128);
  }

  ctx.fillStyle = "#e8d5a3";
  ctx.font = "600 28px Cinzel, serif";
  ctx.textAlign = "center";
  ctx.fillText(CONFIG.organization.toUpperCase(), width / 2, 310);

  ctx.fillStyle = "#c9a84c";
  ctx.font = "700 92px Cinzel, serif";
  ctx.fillText(CONFIG.eventName, width / 2, 420);

  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, 456);
  ctx.lineTo(width / 2 + 120, 456);
  ctx.stroke();

  ctx.fillStyle = "#f4eee3";
  ctx.font = "500 26px Outfit, sans-serif";
  ctx.fillText("INSCRIPTION CONFIRMÉE", width / 2, 520);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 56px Outfit, sans-serif";
  const nameLines = wrapText(ctx, nom, 820);
  nameLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, 620 + index * 64);
  });

  const qrTop = 620 + nameLines.length * 64 + 40;
  const qrSize = 520;
  const qrX = (width - qrSize) / 2;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 24, qrTop - 24, qrSize + 48, qrSize + 48, 28);
  ctx.fill();
  if (qrImage) {
    ctx.drawImage(qrImage, qrX, qrTop, qrSize, qrSize);
  }

  ctx.fillStyle = "#e8d5a3";
  ctx.font = "600 34px Outfit, sans-serif";
  ctx.fillText(code, width / 2, qrTop + qrSize + 100);

  ctx.fillStyle = "rgba(244,238,227,0.72)";
  ctx.font = "400 26px Outfit, sans-serif";
  ctx.fillText("Présentez ce QR code à l'entrée", width / 2, qrTop + qrSize + 154);
  ctx.fillText("Concert gratuit  ·  " + CONFIG.organization, width / 2, qrTop + qrSize + 200);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Image impossible à générer."));
    }, "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${code}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
