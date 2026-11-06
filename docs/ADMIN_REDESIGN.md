# Rediseño del portal de administración — plan de diseño

Fecha: 2026-11-05. Decisión del responsable: rediseñar `admin_app` por completo, sin respetar la identidad anterior («El pase», verde albahaca sobre Material 3). Objetivo: un portal **vendible, moderno y novedoso** que un dueño de restaurante quiera enseñar. Caso de prueba: Pick & Eat en dev.

## Sujeto, audiencia y trabajo de la página

- **Quién:** dueños y gerentes de restaurantes en Panamá y LATAM, de 1 a 10 sucursales. Entran desde el portátil en la oficina y desde el teléfono durante el servicio.
- **Trabajo principal:** saber en dos segundos cómo va el servicio ahora y qué necesita su atención; después, gestionar menú, equipo, estaciones, facturación y reportes.
- **Primera impresión (también vende):** la pantalla de inicio es lo que ve un prospecto en una demo. Debe parecer un producto de una empresa seria, no una plantilla.

## Concepto: «La jornada»

El portal no se organiza por tablas de la base de datos sino por el reloj del restaurante. El inicio es una sola vista viva de la jornada: la curva de ventas de hoy contra el mismo día de la semana pasada, con una línea de «ahora» y los avisos que importan marcados en el momento del día en que ocurrieron. Todo lo demás cuelga de ahí.

**Lo memorable (la única apuesta fuerte):** el gráfico de la jornada. Es una silueta de barras por cada 15 minutos entre la apertura y el cierre de la sucursal, con la semana pasada como contorno fantasma, la hora actual como línea fija y marcadores para sucesos (pedido retrasado, factura con error, estación sin atender). El título de la página es una frase calculada, no un rótulo: «Almuerzo en marcha. 12 pedidos activos; el más antiguo lleva 14 min.» Todo lo demás se mantiene callado.

## Paleta (tokens, claro y oscuro)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--ground` | `#EDEFF4` | `#10131A` | fondo de la app |
| `--surface` | `#FFFFFF` | `#181C26` | paneles de trabajo (sin sombra, borde de 1 px muy suave) |
| `--ink` | `#101A33` | `#EEF0F7` | texto y estructura (azul marino, no negro) |
| `--ink-soft` | `#5A6480` | `#98A1BA` | texto secundario |
| `--accent` | `#FFB000` | `#FFB93D` | mango: lo vivo, lo que pide atención, la línea de «ahora» |
| `--action` | `#101A33` | `#EEF0F7` | botones primarios (marino sobre claro) |
| `--good` / `--late` | `#1B9A6C` / `#E5484D` | `#3DD39A` / `#FF6B70` | estados semánticos; no son acento de marca |

Neutros con matiz azulado hacia la tinta. Mango solo en tres usos: la línea de «ahora», los avisos y el indicador «en vivo». Nada de degradados decorativos.

## Tipografía

- **Títulos y cifras grandes:** *Bricolage Grotesque* (Google Fonts, eje de ancho y de tamaño óptico). Carácter propio sin ser caricatura.
- **Texto e interfaz:** *Hanken Grotesk*.
- Cifras de dinero y tablas con `font-variant-numeric: tabular-nums`.
- Escala: 12, 14, 16, 20, 28, 44. Frases en minúscula normal (sin etiquetas en mayúsculas ni «eyebrows»). Líneas de texto de menos de 70 caracteres.

## Disposición

```
Escritorio                                         Teléfono
┌──┬────────────────────────────────────────┐      ┌─────────────────────┐
│  │ [Pick & Eat ▾]   [ Pregunta o busca ⌘K ]  ◐ MN │ [Pick & Eat ▾]   ⌘  │
│R │──────────────────────────────────────────│     │ Almuerzo en marcha. │
│a │  Almuerzo en marcha.                      │     │ 12 activos · 14 min │
│i │  12 pedidos activos; el más antiguo       │     │ ▁▂▅▇█▆▃│▁ (jornada) │
│l │  lleva 14 min.                            │     │ pedidos activos     │
│  │  ▁▂▃▅▇██▆▅▃▂│▁░░  (la jornada)            │     │  #P-4F2A  8 min     │
│6 │         ahora                              │     │  #P-91C0  14 min    │
│  │  ┌ activos ────────┐ ┌ ahora ─────────┐  │     ├─────────────────────┤
│  │  │ lista compacta  │ │ estaciones,    │  │     │ Inicio Pedidos Menú │
│  │  │ con tiempo      │ │ pagos, avisos  │  │     │ Equipo  Más         │
└──┴────────────────────────────────────────┘      └─────────────────────┘
```

- **Raíl izquierdo (64 px):** 6 destinos con icono y rótulo al pasar el cursor: Inicio, Pedidos, Menú, Equipo, Sucursales, Ajustes. Reportes, Facturación, Estaciones, Mesas y Asistente se alcanzan desde la barra de comandos y desde Ajustes. En teléfono es una barra inferior de 5 destinos.
- **Barra superior:** selector de sucursal a la izquierda, **barra de comandos** centrada. La barra de comandos (`⌘K` / `Ctrl K`) es la navegación principal y absorbe al Asistente de IA: busca pedidos por código, salta a cualquier pantalla y, si lo escrito no coincide, lo envía al Asistente («Pregunta o pide algo»). Se implementa con el diálogo de Radix que ya existe; sin dependencias nuevas.
- **Alineación:** contenido alineado a la izquierda; el título de la jornada a la izquierda; sin centrados decorativos.
- **Sin cuadrícula de tarjetas idénticas.** Las zonas se separan con espacio y con el cambio de tono entre `--ground` y `--surface`. Un solo radio de borde para controles (10 px) y otro para paneles (16 px).

## Pantallas del primer corte

1. **Shell:** raíl, barra superior, barra de comandos, tema claro/oscuro, adaptación a teléfono.
2. **Inicio (La jornada):** frase de estado, gráfico de la jornada, pedidos activos, panel «ahora» (carga por estación, mezcla de pagos, avisos operativos).
3. **Pedidos:** lista con filtros por estado a la izquierda y detalle fijo a la derecha; en teléfono el detalle es una hoja a pantalla completa. Acciones: confirmar pago, imprimir factura, reintentar factura, cancelar.
4. **Inicio de sesión y alta:** es la puerta del producto; recibe el mismo tratamiento.

Las demás pantallas (Menú, Equipo, Sucursales, Estaciones, Mesas, Reportes, Ajustes, Asistente) heredan los tokens y el shell nuevos en este corte y se rediseñan una por una en cortes siguientes.

## Reglas de implementación

- Solo `apps/admin_app`. Sin dependencias nuevas (Radix, Recharts y lucide ya están). Fuentes por Google Fonts.
- Mantener los hooks y servicios existentes (`use-orders`, `report.service`, etc.): el rediseño es de presentación. No se cambian reglas, callables ni el modelo de datos.
- Tailwind 4 con tokens en `@theme`/variables CSS; el remapeo actual `orange`→primario y `gray`→neutro se reemplaza para que las pantallas aún no rediseñadas sigan funcionando y se vean coherentes.
- Accesibilidad: foco visible, contraste AA en ambos temas, `prefers-reduced-motion` respetado, objetivos táctiles de 44 px.
- Movimiento: una sola secuencia al cargar el gráfico de la jornada; el resto responde a acciones de la persona.
- Copys en español de Panamá, voz activa, botones con el verbo exacto («Confirmar pago», «Imprimir factura»), errores que dicen qué pasó y cómo arreglarlo.

## Revisión contra los valores por defecto

Se descartó: crema con serif y terracota; negro con un acento ácido; maquetación de periódico; cuadrícula de tarjetas con sombra; degradado violeta-azul; etiquetas en mayúsculas sobre cada título; flechas «→» en botones. Se descartó también repetir el «pase» de tickets en carril que tenía la identidad anterior: la jornada (reloj) es la idea nueva. Riesgo aceptado: marino y mango se parecen a varias marcas de fintech; lo que lo hace propio es la silueta de la jornada y la frase de estado, no la paleta.
