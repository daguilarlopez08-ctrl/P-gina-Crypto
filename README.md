# Meridiano — Terminal de análisis de mercado

Aplicación web de una sola página para analizar criptomonedas y acciones: panorama del mercado, ficha con gráfico de velas e indicadores, resumen técnico con puntaje, escenarios de precio, noticias, fundamentales, screener, comparador, watchlist con alertas, plataformas para comprar desde Chile y herramientas de riesgo. Todo en español.

> Herramienta de análisis, no asesoría financiera. Los niveles de precio son escenarios posibles, no predicciones.

## Cómo usarla

No requiere instalación ni build: abre `index.html` en el navegador, o publícala con GitHub Pages (Settings → Pages → rama principal, carpeta raíz).

Para servirla en local:

```bash
python3 -m http.server 8000
```

## Datos

| Dato | Fuente | Clave |
|---|---|---|
| Mercado cripto, fichas, búsqueda | CoinGecko | No (opcional) |
| Velas y precios cripto | API pública de Binance | No |
| Fear & Greed | Alternative.me | No |
| Cotizaciones de acciones, índices (vía ETF), fundamentales, noticias, resultados | Finnhub | Gratuita |
| Velas de acciones | Twelve Data o Alpha Vantage | Gratuita |
| USD → CLP | open.er-api.com | No |

Las claves se pegan en **Configuración** y se guardan solo en el navegador (localStorage). Si una fuente no responde, la app muestra datos simulados con la insignia **DATOS DE EJEMPLO** o el texto "no disponible"; nunca los presenta como reales.

## Estructura

- `index.html`, `css/styles.css` — estructura y estilos (modo oscuro, glassmorphism, tilt 3D).
- `js/core.js` — estado, formato de números, USD/CLP, watchlist y alertas.
- `js/api.js` — fuentes de datos, caché y respaldo de ejemplo.
- `js/indicators.js` — RSI, MACD, Estocástico, EMA, Bollinger, ATR, OBV, VWAP, pivotes.
- `js/analysis.js` — puntaje técnico, soportes/resistencias, Fibonacci, divergencias, escenarios y zonas.
- `js/chart.js` — gráfico de velas (TradingView Lightweight Charts v5).
- `js/hero3d.js` — escena Three.js del panorama.
- `js/views-*.js` — los módulos de la interfaz. `js/app.js` — navegación, buscador y alertas.
- `vendor/` — Three.js y Lightweight Charts (incluidas para no depender de un CDN).

Las fechas del calendario macro y la comparativa de plataformas están cargadas a mano en `js/views-asset.js` y deben verificarse en las fuentes oficiales.
