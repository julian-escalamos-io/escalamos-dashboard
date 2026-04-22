# ESTADO — Dashboard Escalamos.io
_Última actualización: 2026-04-21_

---

## ¿Qué es esto?

Dashboard interno de Escalamos.io. React 18 + Vite en frontend, Vercel serverless en backend. Lee de tres Google Sheets via service account y los combina en una SPA con 4 módulos.

**URL producción:** https://dashboard.escalamos.io
**Repo:** https://github.com/julian-escalamos-io/escalamos-dashboard
**Ubicación local:** `Escalamos.io/Dashboard/` (antes estaba en `Escalamos.io/Marketing/Dashboard/`, movido 2026-04-15)

---

## Arquitectura

```
src/
  App.jsx                  — Layout principal, estado global, top bar, filtros
  components/
    Sidebar.jsx            — Navegación lateral fija, rounded card, bg #F5F7FC, width 220
    ChatPanel.jsx          — Chat flotante con Claude, contexto automático por módulo
    KPI.jsx                — Componente KPI con delta, ring, highlight
    MiniChart.jsx          — Gráfico de línea SVG con hover
    DataTable.jsx          — Tabla sorteable/filtrable reutilizable
    DateRangePicker.jsx    — Selector de rango de fechas con presets
    FunnelBar.jsx          — Funnel horizontal (usado en ChatPanel)
    MetricModal.jsx        — Modal de detalle de métrica
    LoginScreen.jsx        — Login screen custom dark mode con Clerk
    tabs/
      AdsTab.jsx           — Listado Meta Ads con thumbnails y métricas creativas
      GoogleAdsTab.jsx     — KPIs Google Ads + lista campañas (NUEVO)
      InstagramTab.jsx     — KPIs Social Media + listado contenido publicado (ACTUALIZADO)
      SeoTab.jsx           — Métricas Search Console
      UxTab.jsx            — Métricas Clarity + GA4
  modules/
    OverviewModule.jsx     — 5 métricas norte + evolución + desglose modelo
    MarketingModule.jsx    — Cohortes, pipeline, canales, evolución (REESTRUCTURADO)
    FulfillmentModule.jsx  — Métricas de retención del Histórico + tabla clientes + churn
    FinanzasModule.jsx     — 4 sub-tabs: ER Proyectado | P&L | Cobros Pendientes | Anexo BMR (admin)
  lib/
    cohorts.js             — buildCohorts, aggregateCohorts, buildMetaAds, buildGoogleAds, buildInstagram, buildInstagramContent, buildSeo, buildUx
    maestro.js             — parseServicios, parseEgresos, parseER, parseERUnificado, parseHistorico, computeCollectionPace, parsePendingInvoices
    dates.js               — PRESETS (Este mes, Mes anterior, 12 meses, Seleccionar)
    formatters.js          — money, monthLabel, formatDateRange, deltaColor

api/
  sheets.js                — Lee Marketing Sheets (9 tabs) + Xero Sheet (5 tabs) + Registro Maestro (1 tab), cache 60s
  chat.js                  — Chat multi-turn con Claude Sonnet
```

---

## Layout visual

- Fondo exterior: `#E8EDF8`, padding: 12, gap: 12
- Sidebar: `#F5F7FC`, width 220, borderRadius 20, sticky top, sin colapso
- Contenido: blanco + gradiente sutil azul/violeta, borderRadius 20
- Top bar: `#1a1f36`, height 60, zIndex 10
- Selector de mes E.R: visible en Overview y Fulfillment, oculto en Marketing y Finanzas
- Filtro de modelo: dropdown (antes pills), oculto si modelo bloqueado
- Login: dark mode, fondo con orbs azules/violeta + grid, Clerk en español (esES)
- Cache API: `s-maxage=60, stale-while-revalidate=30`

---

## Fuentes de datos

### Marketing Sheets (`SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `meta_ads_ads` | A2:U | Ads Meta con métricas creativas |
| `ghl_leads` | A2:J | Leads GHL |
| `ghl_ventas` | A2:J | Ventas cerradas |
| `costos_y_margenes` | A2:G | Gasto ads + margen bruto |
| `instagram_org` | A2:H | Métricas Instagram orgánico (fecha, followers, reach, views, interacciones, nuevos, perdidos, netos) |
| `instagram_content` | A2:S | Contenido publicado (fecha, tipo, caption, thumbnail, reach, views, interacciones, likes, comments, shares, saved, ER, save_rate, share_rate, nuevos_seg) |
| `google_ads` | A2:N | Google Ads (fecha, campaign, spend, impressions, clicks, ctr, cpc, search_is, is_lost_rank, is_lost_budget, wa_conv, wa_cpa, form_conv, form_cpa) |
| `clarity_ux` | A2:H | Clarity + GA4 UX |
| `search_console` | A2:H | Search Console |
| `ga4_trafico` | A2:L | Tráfico GA4 |

### Xero Sheet (`XERO_SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `Estado de Resultados` | A5:U | E.R. Unificado por modelo×mes (desde Xero Raw Data) |
| `Xero - Raw Data` | A2:O | Transacciones individuales de Xero |
| `Libro Diario` | A6:J | Vista filtrada del Raw Data |
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
2. **Crecimiento** — MoM + YoY del E.R, colores verde/rojo
3. **Ganancia Neta** — monto + % margen con color según salud
4. **CAC vs LTV** — CAC del último cohort, LTV de servicios, ratio LTV/CAC
5. **Clientes y AOV** — clientes activos + AOV + churn del mes

Luego: evolución 12m (Revenue + Ganancia), desglose por modelo.

### Marketing (vista unificada — reestructurada 2026-04-16)

**Filtros de fecha:**
- Este mes | Mes anterior | 12 meses | Seleccionar (custom con calendario)
- "12 meses" genera cohorte agregada sumando todos los meses cerrados
- Comparativa: período anterior equivalente (12m vs 12m previos, mes vs mes anterior)

**Cohortes / KPIs (todos con delta vs período anterior):**
- Ingresos nuevos clientes | Inversión total (publicidad + equipo con deltas) | MER
- AOV | CAC (inversa) | 30D Gross Profit | Payback (inversa)
- Tabla clientes cerrados con monto y ciclo

**Pipeline y fuentes:**
- Leads | CPL (inversa) | Tasa conversión | Ciclo ventas (inversa) — todos con delta
- Funnel: barras horizontales proporcionales centradas
- Donuts: Leads por fuente + Ventas por fuente

**Evolución 12 meses:**
- Charts: Ingresos nuevos clientes + CAC (últimos 12 meses cerrados, excluye mes actual)

**Detalle por canal:**
Tabs: Todos | Meta Ads | Google Ads | Social Media | SEO / Referido

- **Tabla resumen (Todos):** Canal · Inversión · Leads · CPL · Ventas · Revenue · MER
  - Meta Ads: leads = registrations + mensajes del Ads Manager
  - Google Ads: leads = conversiones, datos del sheet google_ads
  - Social Media: leads atribuidos a "Instagram / Social Media" en GHL
  - SEO / Referido: agrupa Google + Organic Search + Referido + Direct traffic
  - Revenue y MER por canal usando `salesRevenueBySource` (atribución GHL)

- **Meta Ads tab:** listado con thumbnails, Hook/Hold/CTR/Freq/CPM, Regs/Msjs/Gasto
  - CPM calculado ponderado por impresiones (spend/imp*1000, no promedio simple)
  - Label "Msjs" (mensajes iniciados, antes "Convos")

- **Google Ads tab:** KPIs (Inversión, Conversiones, CPA, Clicks, CPC, Impresiones, CTR, Impression Share) + lista campañas

- **Social Media tab:** KPIs con delta vs período anterior (Total seguidores, Seg. netos, Nuevos, Perdidos, Alcance, Vistas, Interacciones) + listado contenido publicado ordenado por interacciones (thumbnail, tipo badge, caption clickeable, ER/Save rate/Share rate, alcance/vistas/interacciones)
  - followers_count toma el último registro por fecha dentro del rango
  - Sheet `instagram_org` columnas: A:fecha B:followers C:reach D:views E:interacciones F:nuevos G:perdidos H:netos

- **SEO / Referido tab:** SeoTab (clicks, impresiones, CTR, posición, top queries) + UxTab (sesiones, scroll, rage clicks, bounce, conversiones form/whatsapp) combinados

### Fulfillment — Métricas norte del Histórico
**5 norte**: Clientes activos · AOV · Life Span · NRR (semáforo) · LTGP
**Movimiento**: Entradas/Salidas (nuevos, upsells, perdidos, downsells)
**Churn & Retention**: 6 stats
**Charts 12m**: Clientes activos + NRR
**Tabla clientes activos + Churn reciente**

### Finanzas — 4 sub-tabs
- ER Proyectado | P&L | Cobros Pendientes | Anexo BMR (admin-only)

---

## Estado global (App.jsx)

| State | Default | Descripción |
|-------|---------|-------------|
| `activeModule` | `'overview'` | Módulo activo |
| `modelFilter` | `'todos'` | Filtro de modelo (dropdown) |
| `selectedERMonth` | mes actual | Mes E.R (Overview + Fulfillment) |
| `finanzasSubTab` | `'proyeccion'` | Sub-tab activo en Finanzas |
| `dateRange` | Este mes | Rango fechas (sincroniza Marketing) |
| `rangeMonthKeys` | derivado | `{ startKey, endKey, isMultiMonth }` para lógica multi-mes |
| `selectedCohortMonth` | endKey | Mes cohorte: endKey para multi-mes, startKey para single |

**Cohorte agregada:** cuando `isMultiMonth`, App.jsx usa `aggregateCohorts()` que suma revenue/gasto/leads/closures y recalcula MER/CAC/CPL/AOV. `prevCohort` = período anterior equivalente.

---

## Autenticación (Clerk)

- `@clerk/clerk-react` v5 + `@clerk/backend` + `@clerk/localizations` (esES)
- Localización español completa, placeholder custom "Ingresar su correo electrónico"
- Login screen dark mode custom (`LoginScreen.jsx`)
- Roles: admin (4 módulos), ops (Marketing + Fulfillment), finanzas (solo Finanzas)
- Modelo bloqueado por `publicMetadata.model` → filtro fijo, dropdown oculto

---

## Variables de entorno (Vercel)

```
GOOGLE_CREDENTIALS_JSON             — Service account JSON
SPREADSHEET_ID                      — Google Sheet Marketing
REGISTRO_MAESTRO_SPREADSHEET_ID     — Google Sheet Registro Maestro
XERO_SPREADSHEET_ID                 — Google Sheet Xero
ANTHROPIC_API_KEY                   — Para chat
VITE_CLERK_PUBLISHABLE_KEY          — Clerk (frontend)
CLERK_SECRET_KEY                    — Clerk (APIs)
```

---

## Deploy

- **Producción:** `npx vercel --prod` desde la carpeta del proyecto
- **Desarrollo:** `npm run dev` (solo Vite, sin APIs) o `npm run dev:api` (Vercel dev con APIs)
- **Auto-deploy GitHub → Vercel:** pendiente reconexión (actualmente se hace manual)

---

## Errores conocidos / decisiones técnicas

- NRR estaba mapeado a r[17] — corregido a r[18] (col S del Histórico)
- Fechas Excel: siempre usar getUTC* para parsear (fix timezone Argentina UTC-3)
- Fuente de ventas se cruza por nombre de contacto (si no hay match → `sin fuente`)
- CPM se calcula ponderado (spend/imp*1000), no promedio de CPMs diarios
- `instagram_org` leía columnas incorrectas — corregido (gastoIg no existe, segNetos era row[7] no row[8])
- BMR matching por inclusión parcial case-insensitive
- Libro Diario usa QUERY filtrado por mes → no sirve como fuente multi-mes

---

## Cambios sesión 2026-04-15/16

### Login
- Traducido a español (`@clerk/localizations` esES en ClerkProvider)
- Label "email address" eliminado, placeholder "Ingresar su correo electrónico"
- Tagline: "business" → "negocios"
- Fondo mejorado: orbs más intensos (+3er orb violeta), grid más visible, gradiente azulado, viñeta

### Filtros
- "Último mes" → "Mes anterior"
- "12 meses" genera cohorte agregada (suma 12 meses cerrados, excluye mes actual)
- Filtro de modelo: pills → dropdown
- Comparativas vs período anterior en todos los KPIs de marketing + Social Media

### Marketing
- Funnel: barras horizontales proporcionales en row completa (antes cuadrados fijos en 3-col grid)
- Google Ads integrado: sheet `google_ads` + `buildGoogleAds` + `GoogleAdsTab` con KPIs y campañas
- Instagram → "Social Media": columnas corregidas, listado contenido publicado con thumbnails + métricas
- SEO + Web/UX → "SEO / Referido" (un solo tab, un solo row en resumen)
- Tabla por canal: +Revenue +MER (usando `salesRevenueBySource`)
- `salesRevenueBySource`: tracking de revenue por fuente en `buildCohorts` y `aggregateCohorts`
- SEO/Referido agrupa: Google + Organic Search + Referido + Direct traffic
- CPM ponderado por impresiones (antes era promedio simple)
- "Convos" → "Msjs" en AdsTab
- Sección análisis IA eliminada de Marketing
- Save rate y Share rate visibles en contenido publicado
- Deltas en sub-cards Publicidad y Equipo

### Infra
- Dashboard movido de `Escalamos.io/Marketing/Dashboard/` a `Escalamos.io/Dashboard/`
- Fix recursión `vercel dev`: `"dev": "vite"` en package.json, `devCommand: "vite"` en vercel.json
- `.env.pulled` y `.env.vercel` removidos del tracking + `.gitignore` ampliado a `.env.*`

---

## Próximos pasos

- [x] Google Ads: activar token y conectar datos reales
- [x] Dominio propio: dashboard.escalamos.io
- [ ] Reconectar auto-deploy GitHub → Vercel
- [ ] Verificar datos del Histórico en Fulfillment con datos reales (NRR, LTGP, movimiento)
- [ ] Evaluar persistencia del chat en localStorage
