# Next Steps — RestaurantOS

## Factura Fiscal (Nota Fiscal)

**Contexto**: Odoo 17 Community no expone el botón "Invoice" en la UI de POS. La factura se genera llamando `action_pos_order_invoice` via API, lo que crea un `account.move` en el módulo de Contabilidad.

**Trabajo pendiente**:

- [ ] Endpoint `POST /orders/{id}/invoice` en el BFF
  - Llama `pos.order.action_pos_order_invoice` en Odoo
  - Devuelve la URL del PDF: `/report/pdf/account.report_invoice/{invoice_id}`
  - Requiere que la orden tenga `partner_id` (cliente) asignado para que la factura sea válida
- [ ] Capturar nombre/email del cliente en el flujo de pago de `client_app`
  - Agregar campo opcional "¿Quieres factura?" en `PaymentScreen`
  - Si el cliente lo pide, enviar nombre + email al BFF junto con `order_id`
  - BFF asigna/crea el `res.partner` en Odoo antes de generar la factura
- [ ] Botón "Solicitar factura" en `waiter_app` (para pedidos en mesa)
  - El mesero ingresa los datos del cliente cuando lo pide
  - Llama al mismo endpoint `POST /orders/{id}/invoice`
- [ ] Envío del PDF por email (opcional)
  - Usar `account.move.action_send_and_print` o el endpoint de email de Odoo

**Notas técnicas**:
- `to_invoice = True` ya se envía en todos los `pos.order` creados por el BFF
- El `account.move` generado queda en estado `Posted` listo para imprimir
- La factura aparece en Odoo bajo **Accounting > Customers > Invoices**
- En la BD: `pos_order.account_move` referencia el `account.move.id`
