# RestaurantOS — Roadmap hacia SaaS

**Ultima actualizacion:** 2026-03-30

---

## Estado actual

El flujo end-to-end esta **funcionando**:
- QR → menu → orden → KDS → admin (ciclo completo)
- 3 apps operativas (admin React, client Flutter, kitchen Flutter)
- Multi-tenant por diseno (orgId/branchId en todo)
- i18n (espanol + ingles) en client app

### Que falta para ser un producto usable

| Bloqueo | Impacto | Estado |
|---|---|---|
| No hay pagos | No hay cierre comercial | Pendiente |
| No hay cliente registrado | No hay retencion | Pendiente |
| No hay onboarding self-service | Cada restaurante requiere setup manual | Pendiente |
| No hay billing | No se puede cobrar por el servicio | Pendiente |
| Audio KDS | Operador no se entera de nuevas ordenes | Pendiente (menor) |
| QR baja resolucion | QR impreso se ve mal | Pendiente (menor) |

---

## Fase 1: Completar lo pendiente menor

| Tarea | App | Tamano |
|---|---|---|
| Audio real para alertas KDS (reemplazar placeholder 0-byte) | Kitchen | S |
| QR descargable alta resolucion | Admin | S |

---

## Fase 2: Pagos y checkout

**Prerequisito para que el sistema tenga valor comercial.**

| Tarea | App | Tamano | Notas |
|---|---|---|---|
| UI seleccion propina (opciones de org.defaultTipOptions) | Client | M | Pantalla entre carrito y submit |
| Seleccion metodo de pago (efectivo, tarjeta) | Client | L | |
| Flujo efectivo ("pagar en mesa", admin marca pagado) | Client + Admin | M | |
| Estado de pago en tracking ("Pago recibido") | Client | S | |
| Vista recibo (desglose itemizado) | Client | M | |
| Integracion Yappy | Client + Functions | L | Requiere API keys de Banco General |

---

## Fase 3: Identidad de cliente y retencion

**Objetivo: que el cliente tenga razon para volver.**

### Registro progresivo (NO obligatorio)

El cliente puede ordenar sin registrarse (anonymous auth, como hoy).
El registro se ofrece en momentos naturales:
- Al pagar ("guarda tu metodo de pago")
- Al terminar ("guarda tu pedido para la proxima")
- En la segunda visita ("bienvenido de nuevo")

### Implementacion

| Tarea | Tamano | Detalle |
|---|---|---|
| Phone auth (OTP SMS) | M | Firebase Phone Auth, pantalla de verificacion |
| Link anonymous → phone | S | `linkWithCredential` de Firebase Auth |
| Coleccion `customers` en Firestore | M | phone, email, visitCount, totalSpent, favoriteProducts[], loyaltyPoints |
| Historial de pedidos por cliente | M | Query orders donde customerId == X |
| Favoritos persistentes | M | Guardar en customer doc, mostrar en menu |
| Re-order ("pedir lo mismo") | M | Boton en historial que llena carrito |
| Loyalty points basico | L | 1 punto por $1, canjear por descuento |

### Incentivos para instalar/registrarse

| Incentivo | Sin registro | Con registro |
|---|---|---|
| Ver menu y ordenar | Si | Si |
| Pagar | Si (efectivo) | Si + metodo guardado |
| Historial de pedidos | Solo sesion actual | Todas las visitas |
| Favoritos | Se pierden | Persistentes |
| Re-ordenar en 1 tap | No | Si |
| Loyalty/puntos | No | Acumula puntos |
| Push notifications | No | "Tu comida esta lista" |
| Ofertas exclusivas | No | "10% en tu proxima visita" |

### Estrategia de canal

| Canal | Usuario | Como |
|---|---|---|
| Deep link (browser) | Cliente casual, primera visita | QR → abre en browser → ordena → se va |
| PWA "Add to Home Screen" | Cliente que repite | Prompt despues de 2da visita |
| App nativa (Play Store) | Clientes frecuentes, loyalty | Para acumular puntos, re-ordenar |

**La mayoria de clientes NO van a instalar una app para comer.** El flujo principal debe funcionar sin instalar nada (deep link → browser).

---

## Fase 4: Menus multiples y zonas

**Objetivo: flexibilidad para restaurantes con multiples ambientes.**

### Problema actual
Un branch solo tiene un `menuId`. No permite:
- Menu de almuerzo vs cena
- Menu terraza (solo bebidas) vs salon (completo)
- Menu estacional

### Solucion propuesta

```
Branch {
  menuIds: [                    // CAMBIO: de menuId a menuIds[]
    { menuId: "abc", schedule?: { from: "11:00", to: "16:00" } },
    { menuId: "def", schedule?: { from: "18:00", to: "23:00" } },
  ]
}
```

| Tarea | Tamano | Detalle |
|---|---|---|
| Branch.menuIds[] en vez de menuId | M | Migracion de datos + update admin UI |
| Horarios por menu | M | Mostrar menu activo segun hora |
| Floors/Sections como entidad | M | Reemplazar string `zone` con entidad real |
| Menu por zona | L | Table.menuOverride o zone.menuId |

---

## Fase 5: Self-service onboarding + billing

**Objetivo: que un restaurante pueda registrarse solo.**

| Tarea | Tamano | Detalle |
|---|---|---|
| Landing page publica | M | Marketing + signup CTA |
| Signup wizard: crear org → branch → menu → categorias | L | Guiado paso a paso |
| Stripe billing | L | Planes starter/growth/chain con limites |
| Plan limits enforcement | M | Max tables, products, branches por plan |
| Dashboard super-admin para aiudalabs | L | Ver todos los clientes, metricas |

### Planes propuestos

| Plan | Precio | Branches | Mesas | Productos | Estaciones |
|---|---|---|---|---|---|
| Starter | $29/mes | 1 | 20 | 50 | 2 |
| Growth | $79/mes | 3 | 50 | 200 | 5 |
| Chain | $149/mes | 10 | 200 | 500 | 20 |

---

## Fase 6: Excelencia operativa

| Tarea | App | Tamano |
|---|---|---|
| Cancelacion completa (admin → function → RTDB → KDS → client) | All | M |
| Editar usuarios (nombre, rol, branches, password reset) | Admin | M |
| Upload imagenes productos (Firebase Storage) | Admin | M |
| Export CSV/PDF reportes | Admin | M |
| Settings page (tax, tips, horarios, telefono) | Admin | M |
| Void items desde KDS (long-press → cancelar) | Kitchen | M |
| Tiempo estimado espera real | Kitchen + Client | M |
| Filtros dieteticos (chips usando product.tags) | Client | M |
| Push notifications FCM | Client | M |
| Boton llamar mesero | Client + Admin | S |

---

## Fase 7: Ventaja competitiva

### Cocina inteligente
| Tarea | Tamano | Diferenciador |
|---|---|---|
| Auto-priorizacion (tiempo prep real, no solo FIFO) | L | Fresh KDS cobra por esto |
| Timing de cursos ("disparar platos fuertes") | L | Toast cobra $165/mes |
| Dependencias entre estaciones | M | Unico en este rango de precio |

### Analytics
| Tarea | Tamano | Diferenciador |
|---|---|---|
| Floor plan en vivo (mapa de mesas con colores) | XL | LA feature que vende al dueno |
| Metricas cocina (tiempo promedio prep) | L | Datos que nadie barato ofrece |
| Product mix analysis (que se vende junto) | M | Optimizar menu con datos |

---

## Propuesta de valor vs competencia

| Feature | Square | Toast | Loyverse | Fresh KDS | **RestaurantOS** |
|---|---|---|---|---|---|
| QR ordering sin hardware | No | No | No | No | **Si** |
| KDS multi-estacion | Si | Si | Si | Si | **Si** |
| Color urgencia KDS | No | No | Si | Si | **Si** |
| Cero hardware propietario | No | No | No | No | **Si** |
| Auto-priorizacion | No | No | No | Si | Fase 7 |
| Floor plan vivo | No | Parcial | No | No | Fase 7 |
| Costo por terminal | $$$$ | $$$$ | $$ | $$ | **$** |

> **"El poder de Toast + la inteligencia de Fresh KDS, en cualquier tablet Android, sin hardware propietario, a fraccion del costo."**
