# ESTADO — Dashboard Escalamos.io
_Última actualización: 2026-04-08_

---

## ¿Qué es esto?

Dashboard interno de Escalamos.io. React 18 + Vite en frontend, Vercel serverless en backend. Lee de dos Google Sheets via service account y los combina en una SPA con 4 módulos.

**URL producción:** https://dashboard-escalamosio.vercel.app

---

## Arquitectura

```
src/
  App.jsx                  — Layout principal, estado global, top bar
  components/
    Sidebar.jsx            — Navegación lateral fija, rounded card, bg #F5F7FC, width 220
    ChatPanel.jsx          — Chat flotante con Claude, contexto automático por módulo
    KPI.jsx                — Componente KPI con delta, ring, highlight
    MiniChart.jsx          — Gráfico de línea SVG con hover
    DataTable.jsx          — Tabla sorteable/filtrable reutilizable
    DateRangePicker.jsx    — Selector de rango de fechas con presets
    MetricModal.jsx        — Modal de detalle de métrica
    tabs/
      AdsTab.jsx           — Tabla Meta Ads con framework Andrómeda
      InstagramTab.jsx     — Métricas Instagram Orgánico
      SeoTab.jsx           — Métricas Search Console
      UxTab.jsx            — Métricas Clarity + GA4
  modules/
    OverviewModule.jsx     — 5 métricas norte + evolución + desglose modelo + análisis
    MarketingModule.jsx    — Vista única sin sub-tabs (cohortes, pipeline, canales)
    FulfillmentModule.jsx  — Métricas de retención del Histórico + tabla clientes + churn
    FinanzasModule.jsx     — 4 sub-tabs: ER Proyectado | P&L | Cobros Pendientes | Anexo BMR (admin)
  lib/
    cohorts.js             — buildCohorts, buildMetaAds, buildInstagram, buildSeo, buildUx
    maestro.js             — parseServicios, parseEgresos, parseER, parseERUnificado, parseHistorico, computeCollectionPace, parsePendingInvoices
    dates.js               — PRESETS (Este mes, Último mes, 12 meses, Seleccionar)

api/
  sheets.js                — Lee Marketing Sheets + Xero Sheet (5 tabs) + Registro Maestro (1 tab), cache 60s
  insights.js              — Análisis con Claude (botón "Generar análisis")
  chat.js                  — Chat multi-turn con Claude Sonnet
  debug.js                 — (temporal — eliminar en producción)
```

---

## Layout visual

- Fondo exterior: `#E8EDF8`, padding: 12, gap: 12
- Sidebar: `#F5F7FC`, width 220, borderRadius 20, sticky top, sin colapso
- Contenido: blanco + gradiente sutil azul/violeta, borderRadius 20
- Top bar: `#1a1f36`, height 60, zIndex 10
- Selector de mes E.R: visible en Overview y Fulfillment, oculto en Marketing y Finanzas
- Filtro de modelo (Todos/Boutique/Agencia/Soft/Financiera/Consultoría): siempre visible
- Cache API: `s-maxage=60, stale-while-revalidate=30` (reducido de 300 para evitar datos stale)

---

## Fuentes de datos

### Marketing Sheets (`SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `meta_ads_ads` | A2:U | Ads Meta con métricas creativas |
| `ghl_leads` | A2:J | Leads GHL |
| `ghl_ventas` | A2:J | Ventas cerradas |
| `costos_y_margenes` | A2:G | Gasto ads + margen bruto |
| `instagram_org` | A2:J | Métricas Instagram orgánico |
| `clarity_ux` | A2:H | Clarity + GA4 UX |
| `search_console` | A2:H | Search Console |
| `ga4_trafico` | A2:L | Tráfico GA4 |

### Xero Sheet (`XERO_SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `Estado de Resultados` | A5:U | E.R. Unificado por modelo×mes (desde Xero Raw Data) |
| `Xero - Raw Data` | A2:O | Transacciones individuales de Xero |
| `Libro Diario` | A6:J | Vista filtrada del Raw Data (QUERY, filtrado por mes en sheet) |
| `1- Servicios` | A2:S | Todos los servicios (col P=PM para BMR) |
| `2- Egresos` | A2:K | Gastos fijos y variables (col K=PM para BMR) |

### Registro Maestro (`REGISTRO_MAESTRO_SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `4- Histórico` | A1:AZ | Métricas de retención/unidad por modelo×mes (Fulfillment) |

---

## Módulos

### Overview — 5 métricas norte
1. **MRR Total** — card azul highlight, clientes y servicios como sub
2. **Crecimiento** — MoM (`pctMensual`) + YoY (`pctAnual`) del E.R, colores verde/rojo
3. **Ganancia Neta** — monto + % margen con color según salud (>25% azul, >10% gris, <10% rojo)
4. **CAC vs LTV** — CAC del último cohort de marketing, LTV de servicios, ratio LTV/CAC con badge
5. **Clientes y AOV** — clientes activos + AOV + churn del mes

Luego: evolución 12m (Revenue + Ganancia), desglose por modelo, análisis Claude.

CAC se pasa desde App.jsx como `selectedCohort?.cac`.

### Marketing (vista unificada)
- Cohortes: Ingresos nuevos / Inversión / MER / AOV / CAC / Gross Profit / Payback
- Pipeline: Leads, CPL, tasa conversión, ciclo ventas, funnel, fuentes
- Evolución 12m
- Detalle por canal (Meta Ads, Instagram, SEO, UX)
- Análisis Claude

### Fulfillment — Métricas norte del Histórico
Recibe: `servicios`, `modelFilter`, `historico`, `selectedERMonth`

**5 norte**: Clientes activos (azul) · AOV · Life Span · NRR (semáforo) · LTGP

**Movimiento del mes** (2 cards):
- Entradas: C. Nuevos, Upsells, $ Nuevos, $ Upsells
- Salidas: C. Perdidos, Downsells, $ Perdidos, $ Downsells

**Churn & Retention** (6 stats): % Churn Tri · % Churn A · % MRR Neto · NRR · Life Retention · Life Span

**Charts 12m**: Clientes activos + NRR (del Histórico, filtrado por modelo)

**Tabla clientes activos** (de Servicios): nombre, modelo, servicios, MRR, meses, LTR

**Churn reciente** (últimos 3 meses, solo si hay bajas)

### Finanzas — 4 sub-tabs (default: ER Proyectado)

**ER Proyectado:**
- MRR con cards desplegables por modelo (Boutique, Agencia, Soft, Financiera, Consultoría)
- Costos Directos (gastos de la unidad) + card Margen Bruto (naranja)
- Costos Indirectos (generales ponderados por % MRR) + card Margen Neto (azul)
- Ambos expandibles con detalle fijos/variables

**P&L:** (fuente: E.R. Unificado de Xero)
- Selector de mes inline (últimos 6 meses)
- 5 KPI cards: Revenue · Cash Collected (% efic cobro + benchmark ritmo día X) · Ganancia Bruta · Ganancia Neta · % Margen Neto
- Benchmark de cobro: "vs $X mes ant. ▲/▼ $Y" (solo mes en curso, lee de Xero Raw Data)
- Deltas % solo en meses cerrados (ocultos en mes en curso)
- CxC acumulada: "Deuda activa (meses anteriores)" como sub-item gris
- P&L waterfall: Ingresos → Gastos Directos (Op + Stripe) → Ganancia Bruta → Gastos Indirectos (Admin prorr.) → Ganancia Neta + Margen del mes
- Desglose por modelo (solo filtro Todos)
- Evolución 12m: Revenue vs Cash (barras+línea) + Ganancia Neta

**Cobros Pendientes:** (fuente: Xero Raw Data)
- Total pendiente + Incobrable + Antigüedad promedio
- Aging: 0-30d / 31-60d / 61-90d / 90+d
- Desglose por modelo
- Tabla de facturas pendientes: cliente, modelo, fecha, días, monto

**Anexo BMR:** (admin-only, fuente: Xero Raw Data + Servicios PM=BMR)
- Liquidación Juan Bangher (33% ganancia neta de clientes BMR)
- KPIs: MRR BMR · Revenue · Cash
- Cards: Costos Directos · Costos Indirectos (ponderados) · 33% Real (azul) · 33% Proyectado (verde)
- P&L lado a lado: Real (cash) vs Proyectado (MRR)
- Tabla clientes BMR activos
- Tabla histórica mensual

---

## Histórico — Mapeo de columnas

Cada fila = (modelo × mes). Columnas desde A:

| Campo | Índice | Col | Descripción |
|-------|--------|-----|-------------|
| year | 0 | A | Año |
| month | 1 | B | Mes (texto "ene 26", "feb 26"...) |
| modelo | 3 | D | Boutique / Agencia / Soft / Financiera |
| clientesActivos | 5 | F | |
| cNuevos | 7 | H | Clientes nuevos |
| upsells | 8 | I | |
| mNuevos | 9 | J | $ nuevos |
| mUpsells | 10 | K | $ upsells |
| cPerdidos | 11 | L | |
| downsells | 12 | M | |
| mDownsells | 13 | N | $ downsells |
| mPerdidos | 14 | O | $ perdidos |
| pctChurnTri | 15 | P | % Churn trimestral |
| pctChurnA | 16 | Q | % Churn anual |
| pctMRRNeto | 17 | R | % MRR Neto |
| nrr | 18 | S | Net Revenue Retention (**era r[17], corregido**) |
| lifeRetention | 19 | T | |
| lifeSpan | 20 | U | Life Span promedio |
| aov | 21 | V | AOV |
| ltgp | 22 | W | LTGP |
| ltgpActual | 23 | X | LTGP Actual |
| mrr | 24 | Y | MRR |
| cashCollected | 25 | Z | |
| comisiones | 28 | AC | |
| extraccion | 29 | AD | |
| gastosDirectos | 32 | AG | |
| gastosIndirectos | 33 | AH | |
| gananciaBruta | 34 | AI | |
| gastosAdm | 36 | AK | |
| totalGastosAdm | 37 | AL | |
| margenNeto | 39 | AN | |
| pctNeto | 40 | AO | |

Revenue (E.R col D) no está en Histórico — viene del E.R siempre.

`aggregateHistorico`: suma campos de movimiento/monto, promedia ratios y métricas de retención.

---

## Estado global (App.jsx)

| State | Default | Descripción |
|-------|---------|-------------|
| `activeModule` | `'overview'` | Módulo activo |
| `modelFilter` | `'todos'` | Filtro de modelo |
| `selectedERMonth` | mes actual | Mes E.R (Overview + Fulfillment) |
| `finanzasSubTab` | `'proyeccion'` | Sub-tab activo en Finanzas |
| `dateRange` | Este mes | Rango fechas (sincroniza Marketing) |

---

## Cache (issue recurrente resuelto)

`s-maxage=60, stale-while-revalidate=30` — reducido de 300s. Si igual hay datos stale:
1. Cmd+Shift+R (hard refresh)
2. `npx vercel --prod --yes --force`

---

## Variables de entorno (Vercel)

```
GOOGLE_CREDENTIALS_JSON             — Service account JSON
SPREADSHEET_ID                      — Google Sheet Marketing
REGISTRO_MAESTRO_SPREADSHEET_ID     — Google Sheet Registro Maestro (solo Histórico)
XERO_SPREADSHEET_ID                 — Google Sheet Xero (E.R., Raw Data, Servicios, Egresos)
ANTHROPIC_API_KEY                   — Para insights y chat
```

Service account: `reporting-mkt-claude@escalamos-reporting-mkt.iam.gserviceaccount.com`

---

## Autenticación (Clerk)

Implementado con `@clerk/clerk-react` (frontend) + `@clerk/backend` (APIs).

**Roles** — almacenados en `user.publicMetadata.role` desde el dashboard de Clerk:
| Rol | Módulos accesibles | Módulo inicial |
|-----|--------------------|----------------|
| `admin` | Overview, Marketing, Fulfillment, Finanzas | Overview |
| `ops` | Marketing, Fulfillment | Marketing |
| `finanzas` | Finanzas | Finanzas |

Sin rol asignado → cae como `ops` por default.

**Archivos modificados:**
- `src/main.jsx` — ClerkProvider envuelve la app
- `src/App.jsx` — SignedIn/SignedOut, roles, authedFetcher con Bearer token
- `src/components/Sidebar.jsx` — filtra nav por allowedModules, muestra usuario real, botón cerrar sesión
- `api/_auth.js` — helper compartido de verificación JWT (nuevo)
- `api/sheets.js`, `api/insights.js`, `api/chat.js` — protegidos con requireAuth
- `vercel.json` — `public: false`

**Variables de entorno requeridas:**
- `VITE_CLERK_PUBLISHABLE_KEY` — en Vercel (Production + Preview) y en `.env.local`
- `CLERK_SECRET_KEY` — en Vercel (Production + Preview)

**Estado actual:** Modo test (keys `pk_test_` / `sk_test_`). Para pasar a live: Clerk dashboard → Upgrade to production → reemplazar keys en Vercel.

**Modelo bloqueado por usuario:** campo `model` en `publicMetadata` de Clerk (ej: `{ "role": "admin", "model": "Agencia" }`). Si está presente, el filtro de modelo queda fijo y las pills desaparecen del top bar.

---

## Cambios sesión 2026-04-08

### Finanzas — Migración a Xero + 4 mejoras
- **Fuente de datos migrada**: todo Finanzas lee del sheet Xero (XERO_SPREADSHEET_ID) en vez del Registro Maestro
- **E.R. Unificado**: parser `parseERUnificado` con 20 columnas (A-U) incluyendo Deuda histórica
- **Consultoría**: agregado como modelo en pills, parsers y tablas (con normalización Consultoria→Consultoría)
- **Servicios**: parser actualizado al nuevo orden de columnas (Tipo en C, Estado en D, Monto en K, PM en P)
- **Fix timezone UTC**: fechas Excel se parsean con getUTC* (Argentina UTC-3 corría fechas 1 día)
- **ER Proyectado**: reestructurado MRR → Costos Directos → Margen Bruto → Indirectos → Margen Neto
- **Benchmark de cobro**: ritmo al día X vs mes anterior desde Xero Raw Data
- **CxC acumulada**: deuda activa de meses anteriores como sub-item gris
- **Deltas condicionales**: ocultos en mes en curso (datos parciales distorsionan)
- **Cobros Pendientes**: facturas reales de Xero Raw Data con aging y desglose por modelo
- **Anexo BMR**: tab admin-only para liquidación Juan Bangher (33% gan. neta, real vs proyectado)

---

## Cambios sesión 2026-04-01

### Login Screen custom (estilo Arko/startup)
- Nuevo componente `src/components/LoginScreen.jsx` — reemplaza `RedirectToSignIn` de Clerk
- Diseño dark mode premium: fondo #060609, orbs azules animados, grilla sutil con fade, textura noise
- Card glassmorphism centrado: borde sutil, backdrop-blur, border-radius 24
- Logo Escalamos blanco con efecto fade degradado hacia abajo
- Tagline: "Transformando business en centros de inteligencia"
- Clerk `<SignIn />` embebido con header/logo propios ocultos — un solo flujo visual
- Tipografía Manrope (Google Fonts) en todo el login
- Botón "Continue" gris oscuro con borde sutil (estilo Arko)
- Copyright dinámico en footer
- Archivos modificados: `index.html` (Manrope font), `src/App.jsx` (LoginScreen en vez de RedirectToSignIn), `src/index.css` (animaciones float), `src/components/LoginScreen.jsx` (nuevo)

---

## Cambios sesión 2026-03-23

### Overview — Gráfico Revenue & Cash Collected
- Nuevo componente `src/components/RevenueCollectedChart.jsx` — barras (Revenue) + línea suavizada (Cash Collected)
- Siempre últimos 12 meses, **independiente del filtro de modelo**
- Layout: gráfico (70%) + 3 cards a la derecha (Revenue 12m, Cash Collected 12m, % Cobrado)
- Sin labels estáticos — valores aparecen en tooltip al hover
- X-axis abreviado ("abr 25" en vez de "abr 25 2025")
- Reemplazó el mini chart de "Revenue mensual". Ganancia Neta permanece debajo.

### Finanzas — Proyección
- `ModeloIngresosCard`: textos más grandes (badge 13px, monto 16px, clientes/servicios 13px)
- `GastosGeneralesCard` y "Gastos de la Unidad": monto ya no está al extremo derecho, aparece al lado del título
- `ModeloBadge`: acepta prop `size` (default 11)

### Overview — Desglose por modelo
- Filtrado por `modelFilter`: solo muestra el modelo del usuario si tiene modelo bloqueado

### Auth — modelo bloqueado
- `App.jsx`: lee `user.publicMetadata.model`, fija el filtro y bloquea el setter
- Pills de modelo ocultas si el modelo está bloqueado

---

## Errores conocidos / decisiones técnicas

- NRR estaba mapeado a r[17] — corregido a r[18] (col S del Histórico)
- Ganancia Proyectada usa `Math.abs(total)` — el sheet puede guardar egresos como negativos
- Histórico pre-ene-26 usa modelos legacy — filtro por modelo solo funciona bien desde ene-26
- Fuente de ventas se cruza por nombre de contacto (si no hay match → `sin fuente`)
- Fechas Excel: siempre usar getUTC* para parsear (fix timezone Argentina UTC-3)
- BMR matching por inclusión parcial case-insensitive (nombres Servicios vs Xero Raw Data)
- Libro Diario usa QUERY filtrado por mes → no sirve como fuente de datos multi-mes (usar Xero Raw Data)
- Vercel deploy via CLI no toma env vars del dashboard → usar `npx vercel --prod --force`

---

## Próximos pasos

- [x] Eliminar `api/debug.js`
- [x] Sistema de auth con Clerk (roles: admin, ops, finanzas)
- [x] Modelo bloqueado por usuario (publicMetadata.model)
- [x] Gráfico Revenue & Cash Collected en Overview
- [x] Textos más grandes en cards de modelo (Finanzas → Proyección)
- [x] Dominio propio: dashboard.escalamos.io
- [ ] Google Ads: activar token y conectar datos reales
- [ ] Verificar datos del Histórico en Fulfillment con datos reales (NRR, LTGP, movimiento)
- [ ] Evaluar persistencia del chat en localStorage
