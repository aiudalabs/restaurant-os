# Admin M3 «verde albahaca» — diseño

Issue #41 · Rama `feat/issue-41-admin-m3-green` · Aprobado por el usuario tras el prototipo
https://claude.ai/artifact/8xStG8M13HyAU1g69zmnsE

## Regla principal

**Ninguna función actual se pierde.** Cada sección se rediseña visualmente; toda lógica, hook,
servicio, validación y flujo existente se conserva. Si un cambio visual obliga a tocar lógica,
se mantiene el mismo comportamiento.

## Tema (ya implementado en `src/index.css`)

- Esquema M3 TonalSpot de `#386A20` (material-color-utilities 0.4.0), claro + `.dark`.
- En código nuevo usar **roles M3**: `var(--md-sys-color-primary)`, `…-on-surface`, `…-on-surface-variant`,
  `…-surface-container-{lowest,low,,high,highest}`, `…-secondary-container`, `…-tertiary-container`,
  `…-error`, `…-error-container`, `…-outline`, `…-outline-variant`. Siempre en pares (`on-X` sobre `X`).
- Las clases Tailwind `orange-*`, `gray-*`, `red-*` están remapeadas al esquema (siguen funcionando),
  pero al rediseñar una página, **reemplazarlas por roles M3**. `green/blue/amber/yellow/purple/emerald`
  NO están remapeadas: sustituirlas por `StatusChip` o roles M3 (no dejar colores de Tailwind crudos).
- Tipografía: clases `t-display-small`, `t-headline-{medium,small}`, `t-title-{large,medium,small}`,
  `t-body-{large,medium,small}`, `t-label-{large,medium,small}` (escala M3). No `text-sm font-bold` sueltos.
- Formas: botones full; chips de filtro 8px; cards 12px (usar `Card`, no redondeos a mano);
  diálogos 28px; side sheet 16px; campos 4px.
- Sin sombras salvo FAB (tonal surfaces). Sin emojis. Sin gradientes.

## Componentes (en `src/components/ui/`)

| Import | Uso |
|---|---|
| `Icon` (`icon.tsx`) | `<Icon name="receipt_long" filled? size? label? />` — Material Symbols. Reemplaza lucide-react. |
| `Button`, `IconButton` (`button.tsx`) | `variant`: `primary` (filled) · `tonal` · `outlined` · `ghost` (text) · `destructive`; `icon="add"` agrega ícono. `IconButton icon label variant?` |
| `Input`, `Select`, `Textarea` (`input.tsx`) | Campos M3 outlined con label en la muesca; props `label error isRequired supporting`. |
| `Dialog` (`dialog.tsx`) | Igual API que antes (`title onClose footer onSubmit className`). |
| `ConfirmDialog` | Igual API que antes. |
| `Card` (`m3.tsx`) | `variant`: `outlined` (default) · `filled` · `elevated`. |
| `FilterChip`, `TagChip` | Filtros (`selected onClick icon`) y etiquetas no interactivas. |
| `StatusChip` | `tone`: `success` (listo) · `info` (en cocina/preparando) · `error` (por cobrar/alerta) · `neutral` · `outline`. |
| `Switch` | `id checked onChange label?` (52×32 M3). |
| `Segmented` | Botón segmentado de selección única. |
| `SideSheet` | Panel lateral modal (detalle de pedido, etc.). |
| `EmptyState` | Estado vacío con ícono, título, texto y acción. |
| `PageHeader` | Titular + subtítulo + acciones bajo la top app bar. |
| `ExtendedFab` | FAB extendido fijo (ya despeja la barra inferior en celular). |

El shell (`layouts/admin-layout.tsx`) ya pone la top app bar con el nombre de la sección, el
contenedor `max-w-[1200px]` y el padding. Las páginas NO repiten el título de la sección como h1.

## Secciones (objetivo visual = prototipo)

- **Hoy** (`dashboard/`): tarjetas de resumen (filled), pedidos por hora (SVG con tokens), por cobrar, estado de estaciones. Mismos datos que hoy.
- **Pedidos** (`orders/`): `FilterChip`s de estado + búsqueda; lista en `Card` outlined; clic → `SideSheet` con detalle, ítems, notas, totales, pago y **todas** las acciones actuales de estado.
- **Menú** (`menu/`): selector de menú, categorías a la izquierda (lista con selección), productos en cards con `Switch` de disponible; CRUD de menús/categorías/productos, modificadores, fotos y cascada intactos.
- **Estaciones** (`stations/`): card por estación con `TagChip`s de categorías, PIN, link KDS; alerta si no tiene categorías.
- **Equipo** (`users/`): lista con `StatusChip` de rol; diálogos crear/editar; activar/desactivar/borrar.
- **Sucursales, Mesas, Reportes, Asistente IA, Login**: restyle M3 con los mismos componentes.

## Verificación

`npm run build` pasa · `npx tsc -p tsconfig.app.json --noEmit` sin errores NUEVOS (hay 11 previos) ·
`npx eslint <archivos tocados>` sin problemas nuevos · ningún `lucide-react` en archivos tocados.
