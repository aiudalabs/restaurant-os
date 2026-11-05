# Google Wallet — pase del Club (issue #77)

El botón «Añadir a Google Wallet» de Mi Club abre un enlace `pay.google.com/gp/v/save/<JWT>`.
El JWT lo firma la Cloud Function `googleWalletLink` con la cuenta de servicio del emisor y trae
la clase y el pase (saldo de puntos, sellos, nivel, QR del socio). No hay llamadas a la API ni
dependencias nuevas. Código: `functions/src/loyalty/google-wallet.ts`.

## Qué hay que configurar por proyecto (dev / prod)

1. **Emisor**: Google Pay & Wallet Console (pay.google.com/business/console) → crear el perfil de
   negocio → sección Google Wallet API → copiar el **Issuer ID**. Mientras no se pida acceso de
   producción el emisor está en *modo demo*: solo los Gmail agregados en «Cuentas de prueba» pueden
   guardar el pase.
2. **Cuenta de servicio**: en Google Cloud (cualquier proyecto) habilitar *Google Wallet API*, crear
   una cuenta de servicio y una clave JSON. En la consola de Wallet, dar acceso a ese correo de la
   cuenta de servicio como usuario del emisor.
3. `functions/.env.<projectId>`:
   ```
   GOOGLE_WALLET_ISSUER_ID=<Issuer ID>
   CUSTOMER_URL=https://<sitio-customer>.web.app
   ```
4. Secret Manager (nunca en el repo): `firebase functions:secrets:set GOOGLE_WALLET_KEY --project <projectId>`
   y pegar el JSON completo de la clave.
5. `apps/customer_web/.env.<projectId>`: `VITE_GOOGLE_WALLET=1`.
6. `scripts/deploy.sh dev "functions:googleWalletLink,hosting:customer"`.

## Límites de v1

- El pase muestra el saldo del momento en que se añade. Mantenerlo al día requiere la REST API de
  Wallet (PATCH del objeto en `onOrderPaid`): pendiente.
- Apple Wallet: pendiente (Apple Developer Program + Pass Type ID + servicio web de actualización).
