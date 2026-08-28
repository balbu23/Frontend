import React, { useEffect, useRef } from 'react';

// Polígono trazado con precisión basada en el contorno del mapa satelital real de Chiapas
const CHIAPAS_DETAILED_POLY = [
  // Límite Oeste con Oaxaca
  [0.17, 0.40], [0.12, 0.35], [0.20, 0.25],

  // Pico Norte (Zona Juárez / Pichucalco)
  [0.24, 0.16], [0.27, 0.05], [0.34, 0.06], [0.37, 0.16],

  // Norte (Frontera con Tabasco)
  [0.45, 0.18], [0.50, 0.06], [0.59, 0.04], [0.60, 0.10], [0.68, 0.17],

  // Selva Lacandona (Extremo Oriental / Río Usumacinta)
  [0.76, 0.23], [0.83, 0.30], [0.91, 0.38], [0.98, 0.47],

  // Línea Recta Sureste (Frontera con Guatemala)
  [0.65, 0.58], [0.57, 0.79],

  // Pico del Soconusco y Tapachula (Extremo Sur)
  [0.55, 0.88], [0.53, 0.98], [0.46, 0.92], [0.40, 0.82],

  // Costa del Pacífico (Diagonal hacia el Noroeste)
  [0.30, 0.70], [0.22, 0.58], [0.13, 0.47], [0.03, 0.43],

  // Cierre en el Istmo
  [0.08, 0.40]
];

// Puntos clave de ciudades / regiones para destellos (normalizados respecto al mapa)
const KEY_BEACONS = [
  { x: 0.32, y: 0.38, name: 'Tuxtla Gutiérrez', size: 3.5 },
  { x: 0.44, y: 0.36, name: 'San Cristóbal', size: 3.0 },
  { x: 0.58, y: 0.86, name: 'Tapachula', size: 3.2 },
  { x: 0.70, y: 0.18, name: 'Palenque', size: 2.8 },
  { x: 0.18, y: 0.48, name: 'Arriaga', size: 2.6 },
  { x: 0.55, y: 0.52, name: 'Comitán', size: 2.8 },
];

function isInsidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function FondoAnimado({ isDarkMode = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let chiapasPoints = [];
    let beaconPoints = [];

    function initChiapasMatrix() {
      chiapasPoints = [];
      beaconPoints = [];

      const mapWidth = Math.min(width * 0.42, 460);
      const mapHeight = mapWidth * 1.03;

      const offsetX = width * 0.52;
      const offsetY = height * 0.14;

      const step = 6;

      for (let px = 0; px <= mapWidth; px += step) {
        for (let py = 0; py <= mapHeight; py += step) {
          const nx = px / mapWidth;
          const ny = py / mapHeight;

          if (isInsidePolygon(nx, ny, CHIAPAS_DETAILED_POLY)) {
            chiapasPoints.push({
              x: offsetX + px,
              y: offsetY + py,
              baseRadius: 1.4,
              phase: (px * 0.015) + (py * 0.015),
              speed: 0.025,
            });
          }
        }
      }

      for (let b of KEY_BEACONS) {
        beaconPoints.push({
          x: offsetX + b.x * mapWidth,
          y: offsetY + b.y * mapHeight,
          size: b.size,
          name: b.name,
          ringRadius: 0,
        });
      }
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initChiapasMatrix();
    };

    window.addEventListener('resize', handleResize);
    initChiapasMatrix();

    // ================= BUCLE PRINCIPAL DE ANIMACIÓN =================
    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // --- 1. ONDAS DE SEDA TRIDIMENSIONALES (RIBBONS) ---
      renderSilkRibbons(ctx, width, height, time, isDarkMode);

      // --- 2. SILUETA LUMINOSA Y MATRIZ DE CHIAPAS ---
      renderChiapasMap(ctx, chiapasPoints, beaconPoints, time, isDarkMode);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// ================= RENDERIZADO DE LAS CINTAS DE SEDA (WAVES) =================
function renderSilkRibbons(ctx, width, height, time, isDarkMode) {
  const ribbons = [
    {
      baseY: height * 0.46,
      thickness: 140,
      amplitude: 75,
      freq: 0.0016,
      speed: 0.9,
      phase: 0,
      colorTop: isDarkMode ? 'rgba(201, 161, 90, 0.40)' : 'rgba(210, 165, 95, 0.35)',
      colorBottom: isDarkMode ? 'rgba(201, 161, 90, 0.0)' : 'rgba(210, 165, 95, 0.0)',
      edgeGlow: isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(195, 145, 70, 0.55)',
    },
    {
      baseY: height * 0.50,
      thickness: 160,
      amplitude: 85,
      freq: 0.0019,
      speed: 0.7,
      phase: 2.2,
      colorTop: isDarkMode ? 'rgba(65, 125, 140, 0.38)' : 'rgba(75, 135, 150, 0.30)',
      colorBottom: isDarkMode ? 'rgba(65, 125, 140, 0.0)' : 'rgba(75, 135, 150, 0.0)',
      edgeGlow: isDarkMode ? 'rgba(130, 200, 220, 0.60)' : 'rgba(60, 120, 135, 0.50)',
    },
    {
      baseY: height * 0.55,
      thickness: 170,
      amplitude: 95,
      freq: 0.0014,
      speed: 0.8,
      phase: 4.5,
      colorTop: isDarkMode ? 'rgba(130, 30, 48, 0.32)' : 'rgba(150, 40, 60, 0.22)',
      colorBottom: isDarkMode ? 'rgba(130, 30, 48, 0.0)' : 'rgba(150, 40, 60, 0.0)',
      edgeGlow: isDarkMode ? 'rgba(190, 65, 90, 0.50)' : 'rgba(130, 25, 45, 0.40)',
    },
  ];

  for (let r of ribbons) {
    ctx.save();
    const t = time * r.speed + r.phase;
    const grad = ctx.createLinearGradient(0, r.baseY - r.amplitude, 0, r.baseY + r.thickness);
    grad.addColorStop(0, r.colorTop);
    grad.addColorStop(1, r.colorBottom);

    const topPoints = [];
    const bottomPoints = [];
    const step = 16;

    for (let x = 0; x <= width + step; x += step) {
      const wave = Math.sin(x * r.freq + t) * r.amplitude + Math.cos(x * r.freq * 0.6 + t * 0.7) * (r.amplitude * 0.4);
      topPoints.push({ x, y: r.baseY + wave });
      bottomPoints.push({ x, y: r.baseY + r.thickness + wave * 0.85 + Math.sin(t * 0.5) * 20 });
    }

    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.strokeStyle = r.edgeGlow;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
  }
}

// ================= RENDERIZADO DEL MAPA DE CHIAPAS =================
function renderChiapasMap(ctx, points, beacons, time, isDarkMode) {
  for (let pt of points) {
    const pulse = (Math.sin(time * 1.8 + pt.phase) + 1) / 2;
    const alpha = isDarkMode ? 0.35 + pulse * 0.55 : 0.28 + pulse * 0.50;
    const r = pt.baseRadius * (0.88 + pulse * 0.25);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isDarkMode
      ? `rgba(228, 201, 138, ${alpha})`
      : `rgba(180, 140, 70, ${alpha})`;
    ctx.fill();

    if (pulse > 0.88) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode
        ? `rgba(201, 161, 90, ${(pulse - 0.88) * 1.8})`
        : `rgba(180, 140, 70, ${(pulse - 0.88) * 1.5})`;
      ctx.fill();
    }
  }

  for (let b of beacons) {
    b.ringRadius = (time * 30 + b.x) % 36;
    const ringAlpha = Math.max(0, 1 - b.ringRadius / 36) * (isDarkMode ? 0.6 : 0.45);

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fillStyle = isDarkMode ? '#ffffff' : '#741b2a';
    ctx.shadowColor = isDarkMode ? '#7f5e11ff' : '#741b2a';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isDarkMode
      ? `rgba(228, 201, 138, ${ringAlpha})`
      : `rgba(116, 27, 42, ${ringAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}