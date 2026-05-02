# ESTADO — Dashboard Escalamos.io
_Última actualización: 2026-05-02_ (Overview = snapshot del "hoy" — todo proyectado salvo chart 12m)

---

## Último cambio (2026-05-02 PM) — Fix MoM/YoY del card grande + columna MoM Ganancia en tabla

**Bug detectado:** el MoM del card grande "MRR Proyectado" no coincidía con el de la tabla Desglose. Dos causas:
1. **Mes incorrecto:** card usaba `prevER.revenue` (anteúltimo mes del ER, ej: marzo si abril es el último cierre), comparando `mayo proyectado vs marzo` en lugar de vs abril.
2. **Sin filtro de modelo:** `prevER.revenue` toma revenue total del mes; con `modelFilter='Boutique'` el card mezclaba MRR de Boutique vs revenue total.

**Fix:** ambos KPIs (MoM y YoY) ahora usan helper `revenueModeloEn(mk)` que filtra por modelo. MoM compara contra `lastClosedERMonthKey`; YoY contra mismo mes calendario hace 1 año.

**UI tabla Desglose:**
- Columna `MoM MRR` movida al lado de MRR (antes al final).
- Nueva columna `MoM Ganancia` al final: ganancia proyectada del modelo vs ganancia neta del modelo en el último cierre. Maneja gananciaPrev negativa con `Math.abs` en el denominador.

---

## Cambio anterior (2026-05-02 AM) — Overview como snapshot del "hoy"

**Filosofía:** Overview es la imagen del estado actual del negocio, no un módulo histórico. Toda métrica del mes en curso se calcula proyectada (Servicios activos + Egresos). El ER de Xero solo aporta histórico (chart 12m + último cierre para LTR/Churn/NRR).

**Síntoma resuelto:** en el mes en curso, columnas Ganancia/Margen/MoM de la tabla Desglose aparecían vacías ("—" / "-100%") porque leían fila del ER que aún no estaba cargada. Idem otras métricas con `filterMonthKey === mes en curso`.

**Cambios:**
- [App.jsx:340-341](src/App.jsx) — `DateRangePicker` oculto cuando `activeModule === 'overview'`. Filtro deja de tener sentido en una vista "hoy".
- [OverviewModule.jsx](src/modules/OverviewModule.jsx):
  - **Nuevo helper `lastClosedERMonthKey`**: última fila del ER que NO sea el mes calendario actual. Si el ER tiene mayo 2026, devuelve abril; si solo tiene hasta abril, devuelve abril. Reutilizado por LTR, NRR, Churn, MoM.
  - **Helper `costoForModel(modelName)`**: replica el patrón de `costosDelMes` para CUALQUIER modelo — directos del modelo + indirectos generales ponderados por share del MRR del modelo en el total.
  - **Tabla Desglose** (`modelos` useMemo): `ganancia = mrrModelo − costoForModel(model)`, `margen = ganancia / mrrModelo`. MoM compara `mrrModelo (servicios activos)` vs `mrrModelo del último cierre del ER`.
  - **LTR** (`ltrFromER`): usa `lastClosedERMonthKey`. Sub-label cambiado a `"del último cierre (mes año)"`.
  - **Pulso por frente Retención**: Life Span pasa a usar `serviciosKPIs.permanencia` (proyectado desde Servicios). Churn/NRR/MRR Neto/C.Bajas siguen del ER pero del último cierre.
  - **Pulso por frente Adquisición**: usa `latestCohort = allCohorts[allCohorts.length - 1]` (snapshot "hoy"), ignora `selectedCohort`.
  - **Cleanup**: removidos `filterMonthKey`, `filterER`, `prevFilterER` (sin uso tras el refactor).

**Aprendizaje:** la pieza clave es que el ER de Xero se carga al cierre de cada mes — durante el mes en curso esa fila no existe, y cualquier métrica que dependa de `filterMonthKey === mes en curso` queda vacía. Para vistas "snapshot del hoy" hay que separar lo proyectable (Servicios + Egresos) de lo histórico (último cierre del ER + chart 12m).

---

## Cambio anterior (2026-04-29 PM) — Fix P&L "Sin datos" por nueva columna en sheet "Estado de Resultados"

El sheet de Xero agregó una columna **C "Aux Orden"** (numérico de mes para sorting) entre B y la antigua C. Todas las columnas de datos se corrieron una posición a la derecha. El código seguía leyendo modelo de col C → veía números/vacío → filtraba toda la data → P&L mostraba "Sin datos del período" para cualquier filtro.

**Cambios:**
- [maestro.js — `parseERUnificado`](src/lib/maestro.js): shift +1 en todos los índices. Modelo ahora en `r[3]` (col D), revenue en `r[4]` (col E), etc. El filtro de filas vacías ahora chequea `r[3]` (modelo) en lugar de `r[2]`.
- [api/sheets.js](api/sheets.js): rango ampliado de `A5:AH` → `A5:AI` para capturar LTR del ER (col AI tras el shift).
- [maestro.js — `normalizeModelo`](src/lib/maestro.js): agregado mapeo `Agencia - Bangher` → `Agencia - Juan Bangher`. Xero usa solo apellido pero el dashboard mantiene nombre+apellido por compatibilidad con `1- Servicios`.

**Aprendizaje:** cuando se toca la estructura del sheet "Estado de Resultados" (agregar/quitar/renombrar columnas), hay que actualizar a la vez `parseERUnificado` y el rango en `api/sheets.js`. No hay test de smoke todavía — si pasa de nuevo, el síntoma es "Sin datos del período" en P&L para todos los filtros.

---

## Cambio anterior (2026-04-29 AM) — Renombre Consultoría → "Agencia - Barchiessi"

- Renombrado el modelo `Consultoría` → `Agencia - Barchiessi` (solo apellido, mismo patrón que `Agencia - Bangher` en Xero). Refleja la transición a estructura por unidades de negocio con líderes — ver `Escalamos.io/decisiones_y_contexto_operativo.md`.
- **Convención de naming:** apellido sin nombre, sin tilde. En el dashboard el modelo Juan Bangher conserva el label completo "Agencia - Juan Bangher" por compatibilidad con datos previos; esa diferencia entre Xero (apellido) y dashboard (nombre + apellido) para Juan es deuda menor — no hace falta arreglarla ahora.
- Color asignado: **cyan `#06B6D4`** (mismo que Juan Bangher por decisión de Julián).
- **Red de seguridad en `normalizeModelo`** ([maestro.js:177-187](src/lib/maestro.js)) — mapea formas viejas a `Agencia - Barchiessi`:
  - `Consultoría` / `Consultoria` (datos pre-rename)
  - `Agencia - Tomas Barchiessi` / `Agencia - Tomás Barchiessi` (iteración intermedia deprecada el mismo día — solo precaución por si se filtró en algún lado)
- **Aplicación de `normalizeModelo` extendida:** ahora también pasa por `parseServicios.tipo` y `parseEgresos.modelo` (antes solo `parseERUnificado` y `parsePending/Incobrables`). Garantiza matching consistente entre datos del Sheet y filtros del dashboard.
- **Bonus fix:** `computeLTVByModel` ahora incluye explícitamente al modelo nuevo (antes Consultoría faltaba — bug pre-existente).
- Archivos tocados: [App.jsx](src/App.jsx) (dropdown), [maestro.js](src/lib/maestro.js) (normalizeModelo + 2 listas), [OverviewModule.jsx](src/modules/OverviewModule.jsx), [FulfillmentModule.jsx](src/modules/FulfillmentModule.jsx), [FinanzasModule.jsx](src/modules/FinanzasModule.jsx) (MODELO_ORDER, MODELO_COLORS, 3 listas, 2 inits).
- **Estado de acciones manuales (vos hiciste):**
  1. ✅ Xero — renombrado el Tracking Category option a "Agencia - Barchiessi".
  2. ✅ Sheet `1- Servicios` — filas con `tipo = Consultoría` actualizadas.
  3. ⏸ Clerk — Tomás aún no necesita acceso al dashboard. Cuando lo necesite: setear `publicMetadata.models = ["Agencia - Barchiessi"]`.
- **Deuda heredada:** reporte Slack WF12 sigue sin saber del modelo nuevo (mismo patrón que Juan Bangher — ver §2026-04-28 y `Administracion/decisiones_y_contexto_operativo.md §11`).

---

## Cambio anterior (2026-04-28) — Eliminación sub-tab "Anexo BMR" en Finanzas

- Eliminado el sub-tab **Anexo BMR** del módulo Finanzas (función `BMRTab` y render condicional). El sub-tab existía como solución provisoria para transparentar la liquidación de Juan Bangher (33% sobre ganancia neta de sus clientes) cuando todavía no había modelo propio. Ahora redundante: el filtro `Agencia - Juan Bangher` muestra el mismo PnL aislado.
- Limpieza: removida prop `role` de `FinanzasModule` (solo se usaba para gatear el tab BMR — los demás sub-tabs son visibles para todos los roles que ya pueden ver Finanzas).
- Bundle bajó ~9 kB.

## Cambio previo (2026-04-28) — Modelo "Agencia - Juan Bangher" + acceso multi-modelo

- Nuevo modelo **"Agencia - Juan Bangher"** agregado como **modelo independiente core** (suma a promedios ponderados, MRR Neto, conteo "Todos" igual que Boutique/Agencia/Consultoría).
- Color asignado: **cyan `#06B6D4`** (label en dropdown: "Agencia · J. Bangher").
- Listas hardcodeadas actualizadas: [App.jsx:264-274](src/App.jsx) (dropdown), [maestro.js:454](src/lib/maestro.js) (`computeModelBreakdown`), [maestro.js:556](src/lib/maestro.js) (`computeLTVByModel`), [FinanzasModule.jsx:129](src/modules/FinanzasModule.jsx) (modelos), [FinanzasModule.jsx:448-457](src/modules/FinanzasModule.jsx) (`MODELO_ORDER` + `MODELO_COLORS`), [OverviewModule.jsx:135-141](src/modules/OverviewModule.jsx) (colors + `MODELOS_CORE`), [FulfillmentModule.jsx:32, 50](src/modules/FulfillmentModule.jsx) (colors + `MODELOS_CORE`).
- **Acceso Clerk multi-modelo:** [App.jsx:48-77, 220-223, 273-289](src/App.jsx). `lockedModel` (string) → `lockedModels` (array). Soporta `publicMetadata.models = ["Agencia", "Agencia - Juan Bangher"]` (nuevo, preferido) y mantiene retrocompat con `publicMetadata.model = "X"` (legacy, single).
  - 0 modelos bloqueados (admin) → dropdown muestra los 7 (Todos + 6 modelos).
  - 1 modelo bloqueado → dropdown oculto, filtro fijo (igual que antes).
  - 2+ modelos bloqueados → dropdown muestra solo esos modelos (sin "Todos") y permite switcheo.
- **Acción manual pendiente:** en Clerk dashboard, setear `publicMetadata.models = ["Agencia", "Agencia - Juan Bangher"]` en el usuario de Juan.
- **Deuda conocida:** Sheet `Estado de Resultados` (Xero) todavía no tiene fila para "Agencia - Juan Bangher" en columnas V-AH. Hasta que se cargue, Fulfillment muestra métricas en 0 para ese modelo (AOV, Life Span, Churn, NRR, LTR del ER). Overview/Marketing funcionan normal porque vienen de `1- Servicios`, `2- Egresos`, `ghl_*`. Cuando se cargue la fila ER, las métricas aparecen automáticamente sin redeploy (próximo refresh SWR de 5 min).
- **Fuera de alcance:** reporte Slack WF12 sigue sin saber del modelo nuevo (deuda heredada de Partners — ver §2026-04-23).

---

## Cambio anterior (2026-04-23) — Exclusión de Partners de promedios

- Sheet "1- Servicios" ahora tiene columna **U = `Clasif`**. Valor vacío = cliente comercial. Valor `Partner` = cliente excluido de promedios (hoy: MAS Brokers, Hardcore Suplementos).
- [src/lib/maestro.js](src/lib/maestro.js) expone `esComercial(servicio)` y aplica filtro en `computeOverviewKPIs`, `computeModelBreakdown`, `computeLTVByModel`, `computeTopLTV`, `computeChurn` y `computeRecentChurn`.
- `computeClientTable` **no filtra** (muestra a todos) pero propaga `clasificacion` al row.
- [src/modules/FulfillmentModule.jsx](src/modules/FulfillmentModule.jsx) usa `ClienteCell` para mostrar chip "PARTNER" junto al nombre en tablas de clientes activos y upsells.
- **Fuera de alcance (deuda reconocida):** el Estado de Resultados del Sheet y el reporte Slack WF12 siguen incluyendo a Partners en sus promedios. Documentado en [Administracion/decisiones_y_contexto_operativo.md §11](../Administracion/decisiones_y_contexto_operativo.md).

---

## ¿Qué es esto?

Dashboard interno de Escalamos.io. React 18 + Vite en frontend, Vercel serverless en backend. Lee de Google Sheets via service account y los combina en una SPA con 4 módulos.

**URL producción:** https://dashboard.escalamos.io
**Repo:** https://github.com/julian-escalamos-io/escalamos-dashboard
**Ubicación local:** `Escalamos.io/Dashboard/`
**Auto-deploy:** GitHub → Vercel (reconectado 2026-04-21)

---

## Arquitectura

```
src/
  App.jsx                  — Layout principal, estado global, top bar, filtros
  components/
    Sidebar.jsx            — Navegación lateral fija
    ChatPanel.jsx          — Chat flotante con Claude
    KPI.jsx                — Componente KPI con delta
    MiniChart.jsx          — Gráfico de línea SVG con hover
    DataTable.jsx          — Tabla sorteable/filtrable
    DateRangePicker.jsx    — Selector de rango (Este mes / Mes anterior / 12 meses / Custom)
    RevenueCollectedChart.jsx — Chart barras+líneas (revenue, cash, ganancia)
    LoginScreen.jsx        — Login dark mode con Clerk (español)
    tabs/
      AdsTab.jsx           — Listado Meta Ads con thumbnails
      GoogleAdsTab.jsx     — KPIs Google Ads + campañas
      InstagramTab.jsx     — KPIs Social Media + contenido publicado
      SeoTab.jsx           — Search Console
      UxTab.jsx            — Clarity + GA4
  modules/
    OverviewModule.jsx     — Métricas norte + evolución + desglose modelo
    MarketingModule.jsx    — Cohortes, pipeline, canales (reestructurado abr-16)
    FulfillmentModule.jsx  — Narrativa AOV→Retención→Churn→LTR→MRR (reestructurado abr-22)
    FinanzasModule.jsx     — 3 sub-tabs: ER Proyectado | P&L | Cobros
  lib/
    cohorts.js             — buildCohorts, aggregateCohorts, buildMetaAds, buildGoogleAds, buildInstagram, buildInstagramContent, buildSeo, buildUx
    maestro.js             — parseServicios, parseEgresos, parseERUnificado (con cols V-AH fulfillment), computeOverviewKPIs, computeClientTable, computeRecentChurn
    dates.js               — PRESETS (Este mes, Mes anterior, 12 meses, Seleccionar)
    formatters.js          — money, monthLabel, deltaColor

api/
  sheets.js                — Lee Marketing (10 tabs) + Xero (5 tabs), rango A5:AH para ER
  chat.js                  — Chat multi-turn con Claude Sonnet
```

---

## Fuentes de datos

### Marketing Sheets (`SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `meta_ads_ads` | A2:U | Ads Meta con métricas creativas |
| `ghl_leads` | A2:J | Leads GHL |
| `ghl_ventas` | A2:J | Ventas cerradas |
| `costos_y_margenes` | A2:G | Gasto ads + margen bruto |
| `instagram_org` | A2:H | IG orgánico (followers, reach, views, interacciones, nuevos, perdidos, netos) |
| `instagram_content` | A2:S | Contenido publicado (tipo, caption, thumbnail, métricas, ER, save/share rate) |
| `google_ads` | A2:N | Google Ads (campaign, spend, clicks, conversiones, CPA, impression share) |
| `clarity_ux` | A2:H | Clarity + GA4 UX |
| `search_console` | A2:H | Search Console |
| `ga4_trafico` | A2:L | Tráfico GA4 |

### Xero Sheet (`XERO_SPREADSHEET_ID`)
| Tab | Rango | Uso |
|-----|-------|-----|
| `Estado de Resultados` | A5:AH | Financiero (A-T) + Fulfillment (V-AH): clientes, nuevos, bajas, $nuevos, $bajas, $upsells, $downsells, MRR neto, %churn, NRR, AOV, life span, LTR |
| `Xero - Raw Data` | A2:O | Transacciones individuales |
| `Libro Diario` | A6:J | Vista filtrada |
| `1- Servicios` | A2:S | Servicios activos/inactivos |
| `2- Egresos` | A2:K | Gastos fijos y variables |

---

## Módulos

### Overview (reestructurado abr-22)
**Filosofía:** vista ejecutiva de 30s. Responde: ¿facturo y gano? ¿estoy creciendo? ¿unidad económica funciona? ¿qué pasa por modelo?

**Layout en 5 secciones:**

1. **Pulso del negocio** (top, no se filtra) — siempre estado actual:
   - **MRR Proyectado** (highlight azul): MRR de servicios activos + MoM/YoY badges + clientes/servicios
   - **Ganancia Proyectada**: MRR − costos del mes (calculados desde egresos como Finanzas: directos del modelo + indirectos generales ponderados por share del MRR)

2. **Desglose por modelo** (filtrable) — tabla 8 cols:
   - Modelo · Clientes · MRR · AOV · LTGP · Ganancia · Margen · Crecimiento MoM
   - LTGP = LTR del modelo × margen bruto del modelo (con fallback a margen del mes)
   - Match case-insensitive del modelo entre `computeModelBreakdown` y filas del ER

3. **Evolución 12 meses** (no se filtra, siempre 12m):
   - Chart combinado: Revenue (barras) + Cash Collected (línea) + Ganancia Neta (línea verde punteada)
   - Tooltip con los 3 valores + % cobrado del mes
   - 5 cards al costado: Revenue 12m · Cash 12m · % Cobrado (gris, sin negrita) · Ganancia 12m · Margen 12m

4. **Unidad económica** (filtrable) — 3 cards:
   - **LTR**: ponderado por clientes activos desde columna AH del ER (modelos core)
   - **CAC**: del cohort de Marketing seleccionado, sub muestra ratio LTR/CAC
   - **Chart Nuevos vs Bajas 12m**: barras dobles (verde nuevos, roja bajas) con tooltip al hover

5. **Pulso por frente** (filtrable) — 2 columnas lado a lado:
   - **Adquisición**: 6 chips (Ventas · MER · Inversión · CAC · Leads · CPL) + sparkline 12m de leads
   - **Retención**: 5 chips (Life Span · Churn · NRR · MRR Neto · C. Bajas) + sparkline 12m de churn

**Comportamiento del filtro de fecha:**
- NO afecta: Top cards (MRR/Ganancia Proyectada), Evolución 12m
- SÍ afecta: Desglose por modelo, Unidad económica, Pulso por frente
- Razón: top cards son "vista actual proyectada", chart es histórico

**Eliminado del Overview viejo:**
- Análisis ejecutivo IA (no aporta en overview)
- Card Cash Collected del top (cortoplacista)
- Cards aisladas de Crecimiento, CAC vs LTV, Clientes y AOV (consolidadas en estructura nueva)
- Chart separado de Ganancia Neta (integrado al combinado)
- Payback, Margen Bruto y NRR del overview (viven en módulos específicos)

### Marketing (reestructurado abr-16)
**Filtros:** Este mes / Mes anterior / 12 meses (agrega cohorte) / Custom
**Filtro modelo:** dropdown

**KPIs con delta vs período anterior:**
- Ingresos nuevos · Inversión (publicidad + equipo) · MER
- AOV · CAC (inversa) · 30D Gross Profit · Payback (inversa)
- Leads · CPL (inversa) · Tasa conversión · Ciclo ventas (inversa)

**Funnel** barras horizontales proporcionales (row completa)
**Donuts:** Leads por fuente + Ventas por fuente

**Detalle por canal:** Todos / Meta Ads / Google Ads / Social Media / SEO-Referido
- Tabla resumen: Canal · Inversión · Leads · CPL · Ventas · Revenue · MER
- Revenue por canal usa `salesRevenueBySource` (atribución GHL)
- SEO/Referido agrupa: Google + Organic Search + Referido + Direct traffic
- CPM ponderado por impresiones (spend/imp*1000)
- Social Media: contenido publicado con ER, save rate, share rate

### Fulfillment (reestructurado abr-22)
**Narrativa:** AOV → Retención → Churn → LTR → MRR Neto

**Layout por sección:**
1. **Clientes activos** — card azul destacada (excluye Financiera/Soft para "Todos")
2. **AOV** — KPI + sparkline 12m inline
3. **Life Span** — KPI + sparkline + cohortes de antigüedad (0-6m Fidelizar 🟡 / 6-12m Consolidar 🔵 / 12m+ Mantener 🟢)
4. **Churn** — KPI + sparkline + tabla bajas recientes (solo clientes sin servicios activos)
5. **LTR** — KPI + sparkline
6. **MRR Neto** — card dark + NRR + composición (nuevos, upsells, bajas, downsells)
7. **Tabla clientes activos** — ordenada por LTR

**Datos:** todo desde "Estado de Resultados" columnas V-AH (ya no usa "4- Histórico" viejo)
**12 meses:** suma movimientos, último mes para estado
**Promedios ponderados** por clientes core (excluye Financiera/Soft)

### Finanzas — 3 sub-tabs
ER Proyectado | P&L | Cobros Pendientes

---

## Autenticación (Clerk)
- `@clerk/clerk-react` v5 + `@clerk/localizations` (esES)
- Login screen dark mode, placeholder español
- Roles: admin (4 módulos), ops (Marketing + Fulfillment), finanzas (solo Finanzas)
- Modelo bloqueado por `publicMetadata.model`

---

## Deploy
- **Auto-deploy:** `git push` → Vercel detecta y deployea (~30s)
- **Dev local:** `npm run dev` (solo Vite) o `npm run dev:api` (Vercel dev con APIs)
- **Manual (si falla auto):** `npx vercel --prod`

---

## Decisiones técnicas
- NRR viene como decimal del sheet (0.96) → se detecta y multiplica ×100 para mostrar
- $ Bajas y $ Downsells se guardan negativos en sheet → Math.abs() para display
- Clientes activos "Todos" excluye Financiera y Soft (intermediación, duplica clientes core)
- Promedios ponderados por clientesActivos de modelos core
- CPM ponderado (spend/imp*1000), no promedio de CPMs diarios
- Fuente de ventas se cruza por nombre de contacto GHL
- Fechas Excel: siempre getUTC* (fix timezone Argentina UTC-3)
- Churn reciente: solo clientes sin servicios activos restantes (no downgrades)
- LTR en churn: si sheet tiene 0, fallback = monto × meses

---

## Cambios sesión 2026-04-21/22

### Fulfillment — Migración y restructure completo
- **Migrado de "4- Histórico" (Registro Maestro viejo) a "Estado de Resultados" (Xero)**
- Rango extendido a A5:AH para leer columnas V-AH (fulfillment)
- Columnas: V:clientesActivos W:clientesNuevos X:clientesBajas Y:$Nuevos Z:$Bajas AA:$Upsells AB:$Downsells AC:$MRRNeto AD:%Churn AE:NRR AF:AOV AG:LifeSpan AH:LTR
- **Restructure narrativo:** AOV → Life Span + Cohortes → Churn + bajas → LTR → MRR Neto
- KPIs con sparkline inline (KPI izq + chart der)
- Cohortes de antigüedad con badges: Fidelizar (amber) / Consolidar (azul) / Mantener (verde)
- MRR Neto card dark destacada + NRR
- Filtro de fechas controla el mes mostrado
- 12 meses agrega movimientos, último mes para estado
- Promedios ponderados por clientes core
- Clientes activos excluye Financiera/Soft
- Fix: $ Bajas/Downsells negativos (Math.abs)
- Fix: NRR decimal×100
- Fix: churn solo clientes sin servicios activos
- Fix: permanencia toma max de meses entre servicios
- Tabla clientes ordenada por LTR
- Eliminada lectura del Registro Maestro

### Overview — Restructure narrativo (sesión cont. abr-22)
- **Filosofía:** vista ejecutiva 30s con narrativa: ¿facturo? → ¿crezco? → ¿unidad económica? → ¿por modelo?
- **Top cards:** MRR Proyectado (highlight con MoM/YoY) + Ganancia Proyectada (proyectada con costos de egresos)
- **Costos proyectados:** mismo cálculo que Finanzas (directos + indirectos ponderados por share MRR)
- **Desglose por modelo arriba** (8 cols: Modelo, Clientes, MRR, AOV, LTGP, Ganancia, Margen, MoM)
- **Evolución 12m:** chart Revenue+Cash+Ganancia con tooltip % cobrado + 5 cards al costado
- **Unidad económica:** LTR (del ER, no Servicios) + CAC + chart Nuevos vs Bajas con hover
- **Pulso por frente:** Adquisición (6 chips: Ventas, MER, Inversión, CAC, Leads, CPL) + Retención (5 chips)
- Sparkline + KPIWithChart extraídos a `src/components/Sparkline.jsx` (reutilizado en Fulfillment)
- Colores de modelos unificados: Boutique amber, Agencia azul, Soft gris, Financiera verde, Consultoría púrpura
- Filtro de fecha: NO afecta top cards/chart 12m, SÍ afecta resto
- Eliminado: análisis ejecutivo IA, Cash Collected del top, chart separado de Ganancia, Payback/Margen/NRR (viven en módulos específicos)
- LTR: ponderado por clientes activos desde columna AH del ER (modelos core)
- LTR fallback en `computeOverviewKPIs` y `computeModelBreakdown`: si sheet tiene 0 → monto × meses
- Consultoría agregada a `computeModelBreakdown`
- % Cobrado en cards de evolución: gris neutral sin negrita (es info, no acción)
- Top bar sticky al scrollear (filtros siempre visibles)
- Tabla bajas: filtrada por rango de fechas seleccionado

### Infraestructura
- Auto-deploy GitHub → Vercel reconectado
- ESTADO.md actualizado
- Selector de meses ER eliminado del top bar

### Sesión anterior (2026-04-15/16) — Marketing
- Login español, fondo mejorado, placeholder
- Filtros: "Mes anterior", 12m agrega cohorte, modelo dropdown
- Google Ads integrado, Social Media con contenido, SEO/Referido unificado
- Revenue + MER por canal, comparativas todos KPIs
- CPM corregido, análisis IA eliminado
- Dashboard movido a Escalamos.io/Dashboard/

---

## Próximos pasos
- [x] Restructure Overview (completado abr-22 con narrativa ejecutiva)
- [x] Margen proyectado por modelo (mes en curso) en tabla Desglose (resuelto 2026-05-02, todo Overview proyectado)
- [ ] Tab dedicado de upsells/downsells con detalle (en vez de notas en sheet)
- [ ] Verificar datos Fulfillment con datos reales completos
- [ ] Evaluar persistencia del chat en localStorage
