# RestaurantOS — Estrategia SaaS

**Ultima actualizacion:** 2026-03-30

---

## Que bloquea el SaaS hoy

| Bloqueante | Por que importa | Esfuerzo |
|---|---|---|
| **No hay pagos** | Sin cobrar al comensal, no hay cierre comercial para el restaurante | Medio |
| **No hay onboarding** | Cada restaurante nuevo requiere que aiudalabs lo configure manualmente | Grande |
| **No hay billing** | No podemos cobrar por el servicio | Grande |
| **No hay cliente registrado** | Sin retencion, cada visita es un usuario nuevo | Medio |

---

## Modelo de negocio propuesto

### Revenue streams

1. **Suscripcion mensual** (principal)
   - Plans: Starter ($29), Growth ($79), Chain ($149)
   - Limites por plan: branches, mesas, productos, estaciones

2. **Comision por transaccion** (futuro)
   - 1-2% sobre pagos digitales procesados via la plataforma
   - Solo aplica cuando integremos pagos directos (Yappy, tarjeta)

3. **Add-ons** (futuro)
   - Analytics avanzado: +$20/mes
   - Loyalty program: +$15/mes
   - Multi-servicio (takeout + delivery): +$30/mes

### Unit economics objetivo

| Metrica | Target |
|---|---|
| CAC (costo adquisicion) | < $50 (marketing digital LATAM) |
| MRR promedio por cliente | $50-80 |
| Churn mensual | < 5% |
| LTV | > $600 (12+ meses) |

---

## Mercado objetivo

### Segmento primario: Panama

**Por que Panama primero:**
- Mercado conocido (aiudalabs esta ahi)
- Yappy es el metodo de pago dominante
- Pocos competidores locales en este nicho
- Restaurantes creciendo post-pandemia

**Perfil de cliente ideal:**
- Restaurante con 10-50 mesas
- 1-3 sucursales
- Usa tablets/celulares que ya tiene
- No quiere invertir en hardware POS
- Quiere modernizar el pedido sin app propia

### Expansion futura
- Costa Rica, Colombia, Mexico (mercados similares, espanol)
- Adaptacion de metodos de pago locales por pais

---

## Estrategia de adquisicion

### Fase inicial (primeros 20 clientes)
1. **Demo en vivo**: llevar tablet a restaurantes, mostrar el flujo completo
2. **Free trial 30 dias**: setup incluido por aiudalabs
3. **Referidos**: restaurante contento → recomienda a otro → 1 mes gratis

### Escala
1. **Landing page** con signup self-service
2. **Content marketing**: "Como reducir errores de pedido 80% sin hardware"
3. **Partnerships**: distribuidores de tablets, consultores de restaurantes
4. **Marketplace**: integraciones con delivery apps (Pedidos Ya, Uber Eats)

---

## Diferenciadores competitivos

### vs POS tradicionales (Square, Toast, Lightspeed)
- **Cero hardware**: no necesitan comprar terminales, impresoras, nada
- **QR ordering nativo**: el cliente ordena desde su celular
- **Costo 5-10x menor**: sin cuota por terminal, sin hardware fees
- **Setup en minutos**: no en semanas

### vs Apps de delivery (Pedidos Ya, Uber Eats)
- **Sin comision por pedido**: cobro fijo mensual
- **Para dine-in**: no compite con delivery, lo complementa
- **El restaurante es dueno de la relacion**: datos del cliente son suyos

### vs Soluciones artesanales (WhatsApp, papel)
- **Sin errores de transcripcion**: pedido digital directo a cocina
- **Tiempo real**: KDS con colores de urgencia, tracking para el cliente
- **Datos**: reportes de ventas, tiempos de preparacion, product mix

---

## Riesgos principales

| Riesgo | Mitigacion |
|---|---|
| Restaurantes no quieren tecnologia | Demo en vivo, trial gratuito, setup incluido |
| WiFi inestable en restaurantes | Offline mode para KDS (Fase 6) |
| Competidores copian el modelo | Velocidad de ejecucion + features inteligentes (Fase 7) |
| Dependencia de Firebase | Arquitectura permite migrar a otro backend si necesario |
| Churn alto si el producto no es sticky | Loyalty program = stickiness para el restaurante |

---

## Metricas de exito (primer ano)

| Metrica | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| Restaurantes activos | 5 | 15 | 30 | 50 |
| MRR | $250 | $1,000 | $2,500 | $4,000 |
| Ordenes procesadas/mes | 500 | 3,000 | 10,000 | 25,000 |
| NPS | > 40 | > 50 | > 50 | > 60 |
