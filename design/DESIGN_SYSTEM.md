# DESIGN_SYSTEM.md
# Sistema de diseño RestaurantOS
# Extraído de los mockups HTML de referencia.
# 
# AGENTES: Este archivo define TODOS los valores visuales del proyecto.
# No inventes colores, fuentes ni espaciados. Usa EXACTAMENTE estos valores.
# Los mockups de referencia están en design/mockups/ — léelos si necesitas
# contexto visual de una pantalla específica.

---

## Paleta de colores

### Marca
```
Rojo principal:  #C8392B  →  Color(0xFFC8392B)  kBrandRed
Rojo oscuro:     #9E2A1F  →  Color(0xFF9E2A1F)  kBrandRedDark
Rojo claro:      #F5E6E4  →  Color(0xFFF5E6E4)  kBrandRedLight
Dorado acento:   #D4A853  →  Color(0xFFD4A853)  kGoldAccent
```

### Superficies (Client App — tema claro cálido)
```
Surface base:    #FEFAF7  →  Color(0xFFFEFAF7)  kSurface
Surface 2:       #F5EDE8  →  Color(0xFFF5EDE8)  kSurface2
Border:          #EDE0D8  →  Color(0xFFEDE0D8)  kBorder
Blanco:          #FFFFFF  →  Colors.white
```

### Texto (Client App)
```
Texto primario:  #1A1008  →  Color(0xFF1A1008)  kTextPrimary
Texto secundario:#5C4033  →  Color(0xFF5C4033)  kTextSecondary
Texto hint:      #9E8070  →  Color(0xFF9E8070)  kTextHint
```

### Semánticos (compartidos)
```
Verde éxito:     #2D7A4F  →  Color(0xFF2D7A4F)  kSuccess
Verde claro:     #E8F5EE  →  Color(0xFFE8F5EE)  kSuccessLight
Ámbar warning:   #F59E0B  →  Color(0xFFF59E0B)  kWarning
Rojo error:      #EF4444  →  Color(0xFFEF4444)  kError
Azul info:       #3B82F6  →  Color(0xFF3B82F6)  kInfo
```

### KDS — modo oscuro (Kitchen App)
```
Fondo:           #0D0D0F  →  Color(0xFF0D0D0F)  kKdsBg
Surface:         #161618  →  Color(0xFF161618)  kKdsSurface
Surface2:        #1F1F22  →  Color(0xFF1F1F22)  kKdsSurface2
Border:          #2E2E33  →  Color(0xFF2E2E33)  kKdsBorder
Texto:           #F0EFE8  →  Color(0xFFF0EFE8)  kKdsText
Verde ticket:    #22C55E  →  Color(0xFF22C55E)  kKdsGreen
Ámbar ticket:    #F59E0B  →  Color(0xFFF59E0B)  kKdsAmber
Rojo ticket:     #EF4444  →  Color(0xFFEF4444)  kKdsRed
```

### Admin React — CSS variables
```css
--brand:       #C8392B
--brand-dark:  #9E2A1F
--brand-light: #FEF2F1
--gold:        #D4A853
--sidebar:     #1A1008   /* sidebar oscuro */
--surface:     #FEFAF7
--surface2:    #F5EDE8
--surface3:    #EDE0D8
--border:      #EDE0D8
--text:        #1A1008
--text2:       #5C4033
--text3:       #9E8070
--green:       #2D7A4F
--green-bg:    #E8F5EE
--amber:       #92400E
--amber-bg:    #FEF3C7
--blue:        #1E40AF
--blue-bg:     #EFF6FF
--red:         #991B1B
--red-bg:      #FEF2F2
```

---

## Tipografía

### Client App y Admin
```
Display / Títulos:  Fraunces (serif)     — Google Fonts
Body / UI:          DM Sans (sans-serif) — Google Fonts

Flutter:
  displayLarge:  Fraunces, 28sp, w600
  headlineMedium:Fraunces, 22sp, w600
  titleLarge:    Fraunces, 18sp, w600
  titleMedium:   DM Sans,  16sp, w600
  bodyLarge:     DM Sans,  16sp, w400
  bodyMedium:    DM Sans,  14sp, w400
  bodySmall:     DM Sans,  12sp, w400
  labelSmall:    DM Sans,  11sp, w500, letterSpacing: 1.5
```

### Kitchen App (KDS)
```
Títulos de mesa:  Fraunces, 18sp, w600
Timers:           DM Mono (monospace) — Google Fonts
Body:             DM Sans, 13sp, w500
Labels:           DM Sans, 11sp, w600

Los timers SIEMPRE usan DM Mono para que los números no salten.
```

### React Admin
```css
font-family: 'DM Sans', sans-serif;  /* body */
font-family: 'Fraunces', serif;       /* headings */
/* Importar desde Google Fonts en index.html */
```

---

## Espaciado — Sistema de 4pt

```
xs:   4px   →  4.0
sm:   8px   →  8.0
md:  12px   →  12.0
lg:  16px   →  16.0
xl:  20px   →  20.0
2xl: 24px   →  24.0
3xl: 32px   →  32.0
4xl: 40px   →  40.0

Padding de pantalla:  horizontal 20px
Padding de card:      14-16px
Gap entre cards:      12px
Gap entre elementos:  8px
```

---

## Border Radius

```
Pequeño (chips, badges):   8px   →  BorderRadius.circular(8)
Mediano (cards, inputs):  12px   →  BorderRadius.circular(12)
Grande (cards principales):16px  →  BorderRadius.circular(16)
Extra (phone frame):       20px  →  BorderRadius.circular(20)
Circular (avatares):       999px →  BorderRadius.circular(999)
```

---

## Sombras

### Client App
```dart
// Card normal
BoxShadow(
  color: Color(0x0F000000),  // 6% opacidad
  blurRadius: 12,
  offset: Offset(0, 2),
)

// Cart FAB
BoxShadow(
  color: Color(0x73C8392B),  // rojo 45% opacidad
  blurRadius: 24,
  offset: Offset(0, 8),
)

// Botón primario
BoxShadow(
  color: Color(0x59C8392B),  // rojo 35% opacidad
  blurRadius: 20,
  offset: Offset(0, 6),
)
```

### KDS (sin sombras — modo oscuro usa bordes)
```dart
// Los cards del KDS no usan sombras.
// Usan border: Border(top: BorderSide(color: urgencyColor, width: 3))
// para indicar el estado de urgencia.
```

---

## Componentes — Especificaciones exactas

### Botón primario (client + kitchen)
```dart
height: 52px
borderRadius: 16px
background: kBrandRed
textStyle: DM Sans 14sp w600 blanco
padding: horizontal 18px
boxShadow: rojo 35% a 6px
Estado disabled: opacity 0.6, sin sombra
```

### Card de producto (client)
```dart
background: Colors.white
borderRadius: 16px
border: Border.all(color: kBorder, width: 1)
shadow: 2px blur 12px opacity 6%
Imagen: height 90px, border-radius top 16px
Info padding: 10px
```

### Ticket card (KDS oscuro)
```dart
background: kKdsSurface   // #161618
borderRadius: 14px
border: Border.all(color: kKdsBorder, width: 1)
borderTop: 3px de color según urgency
  normal   → kKdsGreen  (#22C55E)
  warning  → kKdsAmber  (#F59E0B)
  critical → kKdsRed    (#EF4444)
```

### Timer badge (KDS)
```dart
borderRadius: 8px
padding: horizontal 10px, vertical 4px
fontFamily: DM Mono
fontSize: 13px w500
Colores según urgency:
  normal   → background: rgba(22C55E, 12%)  text: #22C55E
  warning  → background: rgba(F59E0B, 12%)  text: #F59E0B
  critical → background: rgba(EF4444, 12%)  text: #EF4444
```

### Item row (KDS) — tap targets con guantes
```dart
minHeight: 64px  // MÍNIMO ABSOLUTO para operación con guantes
borderRadius: 9px
padding: EdgeInsets.all(9)
States:
  queued     → transparent background
  in_progress→ Color(0x14F59E0B) // ámbar 8%
  done       → Color(0x0F22C55E) // verde 6%, opacity 0.5 en el texto
```

### Cart FAB (client)
```dart
borderRadius: 16px
background: kBrandRed
padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14)
shadow: rojo 45% blur 24 offset (0,8)
Counter badge:
  background: Colors.white
  color: kBrandRed
  size: 22x22
  borderRadius: 7px
  fontSize: 11sp w700
```

### Input field (admin React)
```css
background: var(--surface2)
border: 1.5px solid var(--border)
border-radius: 12px
padding: 12px 14px
font-size: 13px
color: var(--text)
focus: border-color: var(--brand)
```

### Sidebar admin
```css
width: 220px (expandido) / 56px (colapsado en tablet)
background: #1A1008
border-right: 1px solid #2E2010
Nav item activo: background: var(--brand), color: white, border-radius: 10px
Nav item hover: background: #2E2010, color: var(--text)
```

---

## Tap Targets — Regla de accesibilidad

```
Client App:  mínimo 48×48dp  (estándar Material)
Kitchen KDS: mínimo 64×64dp  (operación con guantes en cocina)
Admin React: mínimo 44×44px  (estándar web)
```

---

## Animaciones

### Client App
```dart
// Hero del producto: card → detail
Hero(tag: 'product_${product.id}', child: ...)

// Celebración cuando pedido está listo
// Usar confetti o AnimatedCheckmark con duración 800ms

// CartFAB aparece/desaparece
AnimatedSlide + AnimatedOpacity, duration: 300ms, curve: Curves.easeInOut
```

### Kitchen KDS
```dart
// Flash nuevo ticket
AnimatedOpacity → Container verde semitransparente, duration: 500ms

// Dot parpadeante del timer
// CSS: animation: blink con keyframes 0%→100%→0% opacity
// Flutter: AnimationController repeat + FadeTransition

// Timer se actualiza cada 60 segundos
Timer.periodic(Duration(seconds: 60), (_) => setState(() {}))
```

---

## Modo oscuro

### Kitchen App — siempre oscuro
La kitchen_app usa `ThemeMode.dark` hardcodeado.
Los colores kKds* son los únicos que aplican.
El usuario puede cambiar a claro desde Settings (guardar en SharedPreferences).

### Client App — siempre claro
La client_app usa `ThemeMode.light` hardcodeado.
No tiene toggle de tema.

### Admin React — sigue sistema
```css
/* El sidebar siempre es oscuro independientemente del sistema */
/* El contenido principal respeta prefers-color-scheme */
```

---

## Cómo mapear HTML → Flutter/React

### Proceso para cada pantalla

1. Abrir el mockup HTML correspondiente en `design/mockups/`
2. Identificar el componente a implementar
3. Leer el CSS del componente — extraer:
   - `background` → `color` o `decoration`
   - `border-radius` → `BorderRadius.circular()`
   - `padding` → `EdgeInsets`
   - `font-size` → `TextStyle(fontSize:)`
   - `font-weight: 600` → `FontWeight.w600`
   - `gap` → `SizedBox(height/width:)` o `mainAxisSpacing`
   - `box-shadow` → `BoxShadow`
4. Usar los tokens de este archivo en lugar de valores inline

### Ejemplo: `.product-card` del mockup → Flutter
```css
/* HTML */
.product-card {
  background: white;
  border-radius: 16px;
  border: 1px solid var(--border);  /* #EDE0D8 */
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
```
```dart
// Flutter
Container(
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: kBorder, width: 1),
    boxShadow: [BoxShadow(
      color: Colors.black.withOpacity(0.06),
      blurRadius: 12,
      offset: Offset(0, 2),
    )],
  ),
)
```

### Ejemplo: `.ticket-card` del KDS → Flutter
```css
/* HTML */
.ticket { background: var(--surface); border-radius: 14px; }
.ticket-header.red { border-top: 3px solid var(--red); }
```
```dart
// Flutter
Container(
  decoration: BoxDecoration(
    color: kKdsSurface,
    borderRadius: BorderRadius.circular(14),
    border: Border(
      top: BorderSide(color: kKdsRed, width: 3),
    ),
  ),
)
```

---

## Archivos de referencia

| Mockup | Ruta | Pantallas que contiene |
|--------|------|----------------------|
| Client App | `design/mockups/mockup_client_app.html` | Menú, Detalle, Carrito, Tracking |
| Kitchen KDS | `design/mockups/mockup_kitchen_kds.html` | KDS principal, Login, Recall |
| Admin React | `design/mockups/mockup_admin_app.html` | Dashboard, Menú, Mesas/QR |

**Para ver un mockup:** abrir el archivo HTML en cualquier browser.
Los mockups son pixel-perfect — lo que ves ahí es exactamente lo que debe quedar.
