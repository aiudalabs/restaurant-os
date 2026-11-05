# Diseño: marca y configuración por restaurante

Fecha: 2026-11-05. Estado: propuesta para aprobación. Principio del responsable: **la plataforma es siempre multi-tenant y todo lo que cambie de un restaurante a otro es configuración, no código.** Pick & Eat es el primer caso y debe quedar como una configuración más.

## 1. Situación actual (verificada)

| Qué | Dónde | Problema |
|---|---|---|
| Paleta Pick & Eat (`brand`, `gold`, `surface`, `ink`…) | `apps/customer_web/tailwind.config.js` | Colores fijos en tiempo de build. ~57 usos de `brand-*` y ~35 de `gold-*` en las pantallas |
| Logo | `public/brand/logo.png`, `EntryScreen.tsx:66`, `ClubScreen.tsx:57` | Un solo logo para todos |
| Título y colores de la PWA | `index.html` (`theme-color`, `<title>Pick &amp; Eat</title>`, íconos fijos) | Fijos |
| Manifest | `functions/src/customer/customer-manifest.ts` | Nombre sí viene de la sucursal; `theme_color`/`background_color` e íconos son fijos y el nombre por defecto es «Pick & Eat» |
| Programa del Club | `functions/src/loyalty/program.ts` (+ copia en `customer_web/src/lib/club.ts`) | Niveles, premios («Bowl del día») y reglas fijos para toda org |
| Wallet | `functions/src/loyalty/google-wallet.ts:64-65` | Texto «Pick & Eat Club» fijo |
| Moneda y zona | `club.ts` (B/., UTC-5) | Fijas |
| Ya configurable bien | `branch.yappyHandle`, `branch.allowPayAtPickup`, ITBMS, descuentos (`organizations.discounts[]`), fiscal por org | Patrón a imitar |

Dato clave de las reglas: `organizations/{id}` solo lo leen miembros de la org (`firestore.rules:37`), pero `branches/{id}` lo lee cualquier usuario autenticado, incluido el cliente anónimo (`:48`). Por eso la configuración pública que ya existe (Yappy, pago al retirar) vive en la sucursal.

## 2. Opciones

| Opción | Cómo | Veredicto |
|---|---|---|
| **A. Tema en tiempo de ejecución** (recomendada) | Un solo build de `customer_web`. Los colores son variables CSS que se cargan desde la configuración del restaurante; logo e íconos desde Storage | Un deploy sirve a todos. El dueño cambia su marca desde el admin sin pedir nada |
| B. Un build por restaurante | Un `.env` y un sitio de Hosting por cliente | No escala: cada alta exige un deploy y un sitio. Rechazada |
| C. Apps nativas por cliente (Capacitor) | Envolver `customer_web` por restaurante | Solo si un cliente exige estar en la tienda de apps; se apoya en A. Fuera de alcance |

## 3. Diseño de la opción A

### 3.1 Datos

Campo nuevo `branding` en el documento de la **sucursal** (legible por el cliente anónimo, sin colección nueva):

```
branches/{branchId}.branding = {
  displayName: string,            // nombre en título, PWA y Wallet
  primary: "#RRGGBB",             // color de marca
  accent: "#RRGGBB",              // color de realce (hoy «gold»)
  fontPreset: "classic" | "modern" | "rounded",
  logoUrl: string,                // Storage: orgs/{orgId}/brand/logo.png
  iconUrl: string,                // Storage: orgs/{orgId}/brand/icon-512.png
  tagline?: string
}
```

- La marca es de la organización, así que el admin la edita **una vez por organización** y una callable `setBranding` la aplica a todas sus sucursales (con opción de sobreescribir una sucursal). Es la misma forma en que ya viajan `yappyHandle` y `allowPayAtPickup`.
- Si falta `branding`, `customer_web` usa el tema neutro de la plataforma, **no** el de Pick & Eat. Pick & Eat se migra a datos con un script (`tools/clients/pick_and_eat/seed_branding.py`) que reproduce sus colores actuales sin cambio visual.
- Validación **en servidor** (`setBranding`): colores solo `#RRGGBB`, URLs solo del bucket propio, textos con largo máximo, contraste mínimo (3.2). Nada de CSS libre: evita inyección y marcas ilegibles.

### 3.2 Paleta derivada

El dueño elige **dos colores**; el sistema calcula el resto (`primary-dark`, `primary-tint`, `primary-mist`, `accent-dark/light/tint/ink`) en OKLCH y comprueba contraste WCAG AA para texto sobre cada superficie (blanco sobre `primary`, `ink` sobre tints). Si no cumple, el admin lo avisa y propone el ajuste más cercano. Esa función es pura y vive en el paquete compartido (`packages/ts-core`, Fase 2) con pruebas unitarias; mientras tanto, en `customer_web/src/lib/theme.ts`.

### 3.3 Aplicación en `customer_web`

1. Tailwind pasa a variables: `brand: 'rgb(var(--brand) / <alpha-value>)'`, igual para los demás. Los **nombres de clase no cambian**, así que las ~90 clases existentes siguen funcionando.
2. Un script en `index.html` aplica antes del primer render el tema guardado en `localStorage` (el mismo mecanismo con el que ya se resuelve el manifest), para evitar el destello de colores equivocados. Luego `App.tsx` refresca desde la sucursal y guarda.
3. Se reemplazan los textos fijos «Pick & Eat» (`EntryScreen`, `ClubScreen`, `<title>`) por `branding.displayName`.
4. Colores semánticos (`danger`, estados de pedido, grises de texto) **no** se personalizan.
5. Tipografía: tres combinaciones precargadas (no fuentes arbitrarias, por rendimiento y consistencia).

### 3.4 PWA

- `customerManifest` lee `branding` y emite `name`, `theme_color`, `background_color` e íconos de la marca. El manifest se cachea 5 minutos (`max-age=300`), aceptable.
- Íconos: el admin sube **un** PNG cuadrado; el navegador genera 192, 512 y la versión maskable con margen de seguridad (igual que ya se reducen las fotos de productos en `storage.service.ts`) y los sube a `orgs/{orgId}/brand/`.
- `apple-touch-icon` y `theme-color` se ajustan por JavaScript al cargar la marca.

### 3.5 Storage y reglas

`orgs/{orgId}/brand/*`: lectura pública (igual que fotos de producto), escritura solo `admin`/`manager` de esa org, solo imágenes, máximo 1 MB. Prueba de reglas: la organización A no escribe en la B.

### 3.6 Admin

Pantalla **Marca** en Configuración: nombre, logo, ícono, dos colores con vista previa en vivo de la pantalla de pedido y aviso de contraste, tipografía. El admin mismo conserva la identidad de la plataforma (no se tematiza por cliente).

### 3.7 El resto de lo configurable (mismo principio)

| Eje | Hoy | Objetivo |
|---|---|---|
| Programa del Club | Constantes en `program.ts` | `organizations/{org}.loyalty`: niveles, premios, sellos, encendido/apagado. El servidor sigue siendo el único que decide qué gana un socio |
| Texto y marca de Wallet | Fijo | Sale de `branding` |
| Moneda, zona horaria, idioma | B/., UTC-5, es | `organizations.locale` (Panamá por defecto) |
| Módulos activos (Club, factura, Wallet, pago con tarjeta) | Banderas de build o código | `organizations.modules` según plan |
| Dominio propio | Enlace `?org&branch` | Después: mapa dominio→org en Hosting |

## 4. Análisis adversarial

- **Contraste ilegible por gusto del dueño** → validación en servidor y en la vista previa; no se guarda una paleta bajo el mínimo.
- **Destello de tema (FOUC)** → tema cacheado aplicado antes del render; la primera visita usa el tema neutro y se refresca.
- **Marca falsa o ilegítima** (usar el logo de otro) → es el escaparate propio de cada restaurante; se acepta, con términos de uso. No hay ruta que muestre la marca de una organización dentro de otra.
- **Inyección** → solo hex validado y URLs del propio bucket; nunca HTML ni CSS libre.
- **Coste** → una lectura extra por sesión (el documento de la sucursal ya se lee); logo e íconos desde CDN con caché.
- **Regresión de Pick & Eat** → fase 1 entrega exactamente su aspecto actual desde datos, con captura de pantalla antes y después.
- **Datos de Pick & Eat en prod** → solo se añade un campo a sus sucursales (script con dry-run, export previo). No cambia ningún dato existente.

## 5. Fases

1. **Tema por datos, sin UI.** Variables CSS en Tailwind, `lib/theme.ts` con derivación y contraste (con pruebas), lectura de `branding`, script de siembra de Pick & Eat. Aceptación: Pick & Eat se ve igual que hoy; una org de prueba con otros colores se ve distinta.
2. **Pantalla Marca en el admin** y callable `setBranding` con validación y subida de logo/íconos.
3. **Manifest y PWA** con la marca.
4. **Club configurable** (`organizations.loyalty`) y Wallet con la marca.
5. **Prueba de aceptación multi-tenant:** crear una segunda organización de prueba en dev, con su marca y su Club, y recorrer pedido → cobro → factura sin tocar código.

## 6. Decisiones que necesito del responsable

1. Aprobar el campo `branding` en `branches` (cambio en `FIREBASE_SCHEMA.md`) y la regla de Storage `orgs/{orgId}/brand/*`.
2. ¿Dos colores (primario + realce) o también se permite elegir el fondo? Recomiendo dos: el fondo cálido y el texto quedan neutros para garantizar legibilidad.
3. ¿Las tres combinaciones tipográficas bastan, o hay una marca que exija otra?
