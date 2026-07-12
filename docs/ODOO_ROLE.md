# El rol real de Odoo — decisión diferida

**Estado (2026-07-12): DIFERIDO.** Odoo NO está en el camino crítico. El bucle
"vender + facturar legalmente" se cierra **sin Odoo**:

```
menú → orden → pago → factura fiscal (CAFE vía PAC)   — cero Odoo
```

## Por qué se difiere
Casi todo lo que Odoo iba a resolver ya se reemplazó nativamente:

| Rol original de Odoo | Hoy |
|---|---|
| Catálogo / menú | ✅ Se gestiona en el **admin** (menús/categorías/productos por sucursal) |
| Empleados / auth | ✅ **Firebase Auth** (operadores, provisionBranch) |
| Órdenes / tiempo real / KDS | ✅ **Firebase** (nunca fue Odoo) |
| Factura fiscal (CAFE) | ✅ La emite un **PAC** (Alanube, REST) directo desde el BFF |

## La necesidad REAL de Odoo (lo que sí resuelve, para DESPUÉS)
Odoo se justifica **solo** como **backoffice contable/ERP** — asíncrono, no es el
day-to-day de la app, lo usa el dueño/contador:

- **Contabilidad de verdad:** libro mayor, estados financieros, **declaración de ITBMS**, cierres.
- **Inventario / costos:** valuación de stock, mermas.
- **Compras a proveedores** y cuentas por pagar.
- **Nómina / planilla.**

## Cómo queda preparado
- El BFF ya es **multi-tenant con Odoo por-org** (P3): `organizations/{orgId}` guarda
  `odooUrl/odooDb/odooUser/odooPassword`, y `_sync_to_odoo` es **non-blocking** y **se
  salta** si la org no tiene Odoo. Es decir, una org opera y factura **sin Odoo**, y se
  activa cuando su contabilidad lo requiera.
- La factura fiscal se hace por **PAC** (ver decisión de facturación electrónica / Alanube),
  no por un módulo de Odoo. Odoo, si se conecta, recibe el `pos.order` para la contabilidad.

## Cuándo activarlo
Cuando un cliente necesite contabilidad/inventario/nómina reales → desplegar su Odoo
(VM en GCP, ver `docs/DEPLOYMENT.md`) y registrar sus credenciales en la org.
