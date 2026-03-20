# ESTADO — Dashboard Escalamos.io
_Última actualización: 2026-03-19_

---

## ¿Qué es esto?

Dashboard interno de Escalamos.io. React 18 + Vite en frontend, Vercel serverless en backend. Lee de dos Google Sheets via service account y los combina en una SPA con 4 módulos.

**URL producción:** https://dashboard-escalamosio.vercel.app

---

## Arquitectura

```
src/
  App.jsx                  — Layout principal, estado global, top bar, ChatPanel
  components/
    Sidebar.jsx            — Navegación lateral colapsable (4 módulos)
    ChatPanel.jsx          — Chat flotante con Claude, contexto automático por módulo
    KPI.jsx                — Componente KPI con delta, ring, highlight
    MiniChart.jsx          — Gráfico de línea SVG con hover (acepta prop height)
    DataTable.jsx          — Tabla sorteable/filtrable reutilizable
    DateRangePicker.jsx    — Selector de rango de fechas con presets
    MetricModal.jsx        — Modal de detalle de métrica
    tabs/
      AdsTab.jsx           — Tabla de Meta Ads con framework Andrómeda
      InstagramTab.jsx     — Métricas de Instagram Orgánico
      SeoTab.jsx           — Métricas de Search Console
      UxTab.jsx            — Métricas de Clarity + GA4
      Overview.jsx         — (legacy, no usado actualmente)
      AdquisicionTab.jsx   — (legacy, no usado actualmente)
      RetencionTab.jsx     — (placeholder)
  modules/
    OverviewModule.jsx     — P&L del mes + KPIs servicios + evolución 12m + desglose modelo
    MarketingModule.jsx    — Vista única sin sub-tabs (5 secciones, ver abajo)
    FulfillmentModule.jsx  — Tabla clientes activos + churn reciente + LTV
    FinanzasModule.jsx     — P&L histórico + sub-tab Egresos (fijos/variables)
  lib/
    cohorts.js             — buildCohorts, buildMetaAds, buildInstagram, buildSeo, buildUx
    maestro.js             — parseServicios, parseEgresos, parseER, computeOverviewKPIs, etc.
    dates.js               — PRESETS (Este mes, Último mes, 12 meses, Seleccionar)
    formatters.js          — monthLabel, fmt helpers

api/
  sheets.js                — Lee Marketing Sheets + Registro Maestro en paralelo
  insights.js              — Genera análisis con Claude (botón "Generar análisis")
  chat.js                  — Chat multi-turn con Claude Sonnet, contexto automático
  debug.js                 — (temporal, debería eliminarse en producción)
```

---

## Fuentes de datos

### Marketing Sheets (`SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `meta_ads_ads` | A2:U | Tabla de ads Meta con métricas creativas |
| `ghl_leads` | A2:J | Leads GHL con fuente y stage |
| `ghl_ventas` | A2:J | Ventas cerradas con nombre y valor |
| `costos_y_margenes` | A2:G | Gasto ads + equipo + margen bruto por mes |
| `instagram_org` | A2:J | Métricas orgánicas Instagram |
| `clarity_ux` | A2:H | Datos Clarity (scroll, rage clicks) |
| `search_console` | A2:H | Datos Search Console |
| `ga4_trafico` | A2:L | Tráfico GA4 + conversiones |

### Registro Maestro (`REGISTRO_MAESTRO_SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `1- Servicios 🔄` | A2:P | Todos los servicios (activos e históricos) |
| `2- Egresos 🫰` | A2:H | Gastos fijos y variables |
| `3- E.R 📒` | A2:AA | Estado de resultados mensual |

---

## Módulos

### Overview
- KPIs fila 1: MRR (de servicios, highlighted) · Cash Collected · Ganancia · Margen neto
- KPIs fila 2: Revenue del mes · Clientes activos · AOV · LTV promedio
- KPIs fila 3: Permanencia · Churn este mes · Servicios activos · Serv/cliente
- Charts 2×2: Facturación · Ganancia · Cash Collected · Margen % (últimos 12 meses de E.R)
- Desglose por modelo (Boutique/Agencia/Soft/Financiera)
- Análisis ejecutivo con Claude

### Marketing (vista unificada — sin sub-tabs)
**Sección 1 — Cohortes y KPIs**
- ROW1: Ingresos nuevos clientes | Inversión total (Publicidad + Equipo) | MER
- ROW2: AOV · CAC · 30D Gross Profit · Payback (con subtítulos de fórmula)
- Tabla de clientes cerrados del mes

**Sección 2 — Pipeline y fuentes**
- KPIs: Leads · CPL · Tasa conversión · Ciclo ventas
- Grid 3 columnas: Funnel | Leads por fuente (donut) | Ventas por fuente (donut)
  - Ventas por fuente resuelve la fuente cruzando nombre de contacto con leads

**Sección 3 — Evolución 12 meses**
- Charts: Ingresos nuevos clientes + CAC (altura reducida: 110px)

**Sección 4 — Detalle por canal**
- Filtro: Todos | Meta Ads | Google Ads | Instagram Org. | SEO | Web/UX
- Todos → tabla resumen KPIs por canal
- Canal específico → componente dedicado (AdsTab, InstagramTab, SeoTab, UxTab)
- Google Ads: placeholder "pendiente activación"

**Sección 5 — Análisis**
- InsightsBlock adaptado al canal seleccionado

### Fulfillment
- KPIs: clientes activos, MRR, AOV, permanencia, churn, servicios por cliente
- Tabla clientes activos con servicios como badges
- Churn reciente (últimos 3 meses)
- LTV por modelo + Top 10 LTV

### Finanzas
- Sub-tab P&L: KPIs del mes + tabla 12 meses + evolución + deudas + proyección + análisis
- Sub-tab Egresos: KPIs totales (fijos/variables/total) + dos DataTables con detalle

---

## Estado global (App.jsx)

| State | Valor default | Descripción |
|-------|---------------|-------------|
| `activeModule` | `'overview'` | Módulo activo |
| `modelFilter` | `'todos'` | Filtro Boutique/Agencia/Soft/Financiera |
| `selectedERMonth` | mes actual | Mes del E.R seleccionado (top bar) |
| `dateRange` | Este mes | Rango de fechas (sincroniza cohort de Marketing) |
| `selectedCohortMonth` | derivado de dateRange | YYYY-MM del cohort de marketing (useMemo) |

---

## Chat embebido (ChatPanel)

- Ícono flotante esquina inferior derecha
- Panel lateral 380px, slide-in
- Al abrir: recibe contexto automático del módulo activo + período + KPIs relevantes
- Multi-turn, historial se limpia al cambiar de módulo
- Endpoint `POST /api/chat`: llama a `claude-sonnet-4-6` con system prompt en español
- Requiere `ANTHROPIC_API_KEY` en Vercel env vars

---

## Variables de entorno requeridas (Vercel)

```
GOOGLE_CREDENTIALS_JSON     — JSON completo de la service account
SPREADSHEET_ID              — ID del Google Sheet de Marketing
REGISTRO_MAESTRO_SPREADSHEET_ID — ID del Google Sheet Registro Maestro
ANTHROPIC_API_KEY           — Para insights y chat
```

Service account: `reporting-mkt-claude@escalamos-reporting-mkt.iam.gserviceaccount.com`

---

## Errores conocidos / decisiones técnicas

- Sheet names del Registro Maestro incluyen emojis: usar unicode escapes en api/sheets.js
- `toMonthNum` en maestro.js maneja strings numéricos ("1", "2") además de nombres en español
- Fuente de ventas se resuelve cruzando nombre de contacto con la tabla de leads (no hay columna de fuente en ghl_ventas) — si no hay match, aparece como `(sin fuente)`
- `selectedCohortMonth` es derivado (useMemo de dateRange.start), no state propio
- `api/debug.js` todavía existe — eliminar antes de release público

---

## Próximos pasos pendientes

- [ ] Eliminar `api/debug.js` (endpoint temporal de diagnóstico)
- [ ] Verificar que `ANTHROPIC_API_KEY` esté en Vercel para que funcione el chat y los análisis
- [ ] Google Ads: activar token y conectar datos reales
- [ ] Evaluar si agregar persistencia al chat (localStorage) o mantener solo en memoria
