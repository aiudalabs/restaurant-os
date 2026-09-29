# Ambientes: dev y producción

RestaurantOS corre en **dos proyectos de Firebase/GCP separados**. Cada uno tiene sus propios datos, usuarios, functions, BFF y sitios web. Nada de lo que hagas en dev toca producción.

| Alias | Proyecto | Para qué | Quién lo usa |
|---|---|---|---|
| `prod` | `restaurant-os-68c79` | Clientes reales (Pick & Eat, …) | Restaurantes y sus clientes |
| `dev` | `restaurant-os-dev-49096` | Probar antes de publicar | El equipo |

URLs de cada ambiente:

| App | prod | dev |
|---|---|---|
| Admin | restaurant-os-68c79.web.app | restaurant-os-dev-49096.web.app |
| Pedidos (cliente) | restaurant-os-pedir.web.app | restaurant-os-dev-pedir.web.app |
| KDS (cocina) | restaurant-os-cocina.web.app | restaurant-os-dev-cocina.web.app |
| Mesero | restaurant-os-mesero.web.app | restaurant-os-dev-mesero.web.app |
| Landing | restaurant-os-inicio.web.app | restaurant-os-dev-inicio.web.app |
| BFF (Cloud Run) | restaurantos-bff-839468636765.us-central1.run.app | restaurantos-bff-807685538005.us-central1.run.app |

> Dev se creó el 2026-09-29 con `scripts/bootstrap-env.sh dev restaurant-os-dev-49096 restaurant-os-dev` (el ID `restaurant-os-dev` estaba tomado; Firebase agregó `-49096`). La fuente de verdad de sitios y proyectos es `.firebaserc`.

---

## 1. Cómo funciona la configuración

- **Una config por proyecto:**
  - `apps/<app>/.env.<projectId>` tiene la config web de Firebase y las URLs del ambiente (admin, customer_web, kitchen_web, waiter_web y landing).
  - La config web de Firebase es **pública** (la lee cualquier navegador; la seguridad está en las reglas), así que estos archivos se versionan.
- **Se elige sola al desplegar:**
  - los `predeploy` de `firebase.json` construyen con `vite build --mode $GCLOUD_PROJECT`;
  - `$GCLOUD_PROJECT` es el ID real del proyecto, aunque despliegues con el alias (`--project prod` → `restaurant-os-68c79`);
  - por eso `firebase deploy --project dev` solo puede subir builds de dev, y al revés.
- **Guardia de build** (`scripts/vite-env-guard.ts`, usada por cada `vite.config.ts`). Se niega a construir si:
  - no se pasó `--mode <proyecto>`, porque un `npm run build` pelado no sabe a qué ambiente va;
  - falta el archivo `.env.<proyecto>` o le faltan variables;
  - el archivo dice ser de otro proyecto.
- **Desarrollo local** (`npm run dev`): usa `apps/<app>/.env.development`, que es una copia de la config de **dev**. Localmente trabajas contra dev, nunca contra producción. Tu `.env.local`, si lo tienes, pierde frente a `.env.development`.
- **BFF:**
  - `deploy/env/<alias>.env` (versionado, sin secretos) tiene el proyecto, el servicio y sus variables;
  - los secretos van en `deploy/env/<alias>.secrets.env` (**gitignored**; la plantilla es `deploy/env/example.secrets.env`).
- **`.firebaserc`:**
  - aliases `prod` y `dev`, cada uno con sus 5 sitios de Hosting;
  - **no hay proyecto `default`**: todo deploy tiene que nombrar su ambiente.
- **Scripts de `tools/`:** exigen `ROS_PROJECT=<proyecto>`, por ejemplo `ROS_PROJECT=restaurant-os-dev-49096 python3 tools/debug_kds_routing.py`. Sin eso no corren, para que nadie toque producción por accidente.

---

## 2. Crear un ambiente nuevo (dev, o cualquier otro)

### Pasos en la consola (solo la primera vez, los haces tú)

1. **Crear el proyecto:** en [console.firebase.google.com](https://console.firebase.google.com) → *Agregar proyecto* → nombre `restaurant-os-dev`.
   - Si el ID está tomado, Firebase propone uno con sufijo. Anota el **ID final** y úsalo en lugar de `restaurant-os-dev` en todo lo que sigue.
   - Google Analytics no hace falta.
2. **Plan Blaze:** *Configuración del proyecto → Uso y facturación → Modificar plan → Blaze*, con la misma cuenta de facturación de producción. Las Cloud Functions y Cloud Run lo exigen.
3. Tener sesión en las dos CLIs con una cuenta dueña del proyecto:
   ```bash
   gcloud auth login
   npx -y firebase-tools@15.30.2 login
   ```

### Bootstrap (el script hace el resto)

```bash
DRY_RUN=1 scripts/bootstrap-env.sh dev restaurant-os-dev   # primero: muestra qué haría
scripts/bootstrap-env.sh dev restaurant-os-dev             # lo hace
```

Replica la configuración de producción:

| Paso | Qué hace |
|---|---|
| 0 | Verifica que el proyecto existe, tiene facturación y Firebase |
| 1 | Habilita las APIs (Firestore, RTDB, Storage, Hosting, Functions, Cloud Run, Eventarc, Vertex AI, …) |
| 2 | Firestore en `nam5` |
| 3 | Realtime Database por defecto en `us-central1` (la misma llamada que hace `firebase init database`) |
| 4 | Storage: bucket por defecto en `US-EAST1` |
| 5 | Authentication: correo/contraseña y anónimo |
| 6 | Registra la app web y obtiene su config pública |
| 7 | Crea los 5 sitios de Hosting (`<proyecto>`, `-pedir`, `-cocina`, `-mesero`, `-inicio`) |
| 8 | Da a la cuenta `firebase-adminsdk-…` los mismos roles que tiene el BFF en producción |
| 9 | Escribe `apps/*/.env.<proyecto>`, `apps/*/.env.development`, `.firebaserc` y `deploy/env/dev.env` |

Otros detalles:
- **Es idempotente:** si un paso falla, arreglas la causa y lo vuelves a correr; lo que ya existe se salta.
- **Si el paso 4 o el 5 falla** (algunos proyectos piden «Comenzar» en la consola la primera vez), el script te dice exactamente qué tocar.
- **Si un nombre de sitio del paso 7 está tomado** (son globales), usa otro prefijo: `scripts/bootstrap-env.sh dev restaurant-os-dev ros-dev`.

### Después del bootstrap

```bash
git status                           # revisa los archivos generados y commitéalos (PR)
scripts/deploy.sh dev all            # reglas, índices, functions y los 5 sitios
scripts/deploy.sh dev bff            # el BFF en Cloud Run
```

Luego entra a la **landing de dev** y regístrate como un restaurante nuevo. Ese flujo crea la organización, el admin y la primera sucursal. **Dev empieza sin datos**, y no se copian datos de clientes reales.

### Problemas del primer deploy en un proyecto nuevo

Estos problemas salieron al crear dev (2026-09-29). Los tres primeros ya los resuelve el bootstrap (paso 8b); el cuarto hay que revisarlo tras el primer deploy.

| Síntoma | Causa | Arreglo |
|---|---|---|
| `We failed to modify the IAM policy for the project` | El agente de servicio de Pub/Sub aún no existe | 8b: crea los agentes de Pub/Sub y Eventarc y da los roles que pide la CLI |
| `Build failed: Access to bucket gcf-sources-… denied` | La cuenta Compute por defecto (la que usa Cloud Build) ya no tiene acceso en proyectos nuevos | 8b: `roles/cloudbuild.builds.builder` a `<número>-compute@developer.gserviceaccount.com` |
| `Permission denied while using the Eventarc Service Agent` | Los permisos del agente tardan en propagarse | 8b: `roles/eventarc.serviceAgent`; si persiste, espera unos minutos y reintenta |
| Functions responden pero fallan con `PERMISSION_DENIED` en Firestore (p. ej. crear la organización) | Los proyectos nuevos no dan roles a las cuentas con las que corren las functions | 8c: los mismos roles que en producción para `<proyecto>@appspot` y `<número>-compute` |
| Functions desplegadas pero **403** (manifest, login, PIN…) | Si el primer intento falló, los deploys siguientes no hacen públicas las functions HTTP | Ver el comando de abajo |
| `could not set up cleanup policy` | Falta la política de limpieza de imágenes (necesita un deploy exitoso previo) | `npx -y firebase-tools@15.30.2 functions:artifacts:setpolicy --project <alias> --days 1 --force` |

Hacer públicas las functions HTTP, como están en producción (las callables validan la autenticación en su código):

```bash
P=<proyecto>
for name in $(gcloud functions list --project $P --format="value(name)" | xargs -n1 basename); do
  [ -n "$(gcloud functions describe $name --region us-central1 --project $P --format='value(httpsTrigger.url)')" ] &&
    gcloud functions add-iam-policy-binding $name --region us-central1 --project $P --member=allUsers --role=roles/cloudfunctions.invoker
done
```

Si una function **nueva** se despliega por primera vez con éxito, la CLI ya la hace pública sola; esto solo hace falta tras un primer deploy fallido.

---

## 3. Desplegar

```bash
scripts/deploy.sh <dev|prod> [qué]
```

| `qué` | Despliega |
|---|---|
| `all` (default) | Reglas e índices de Firestore, reglas de RTDB y Storage, todas las functions y los 5 sitios |
| `web` | Los 5 sitios de Hosting (cada uno se construye para ese proyecto) |
| `functions` | Todas las Cloud Functions |
| `rules` | Firestore (reglas + índices), RTDB y Storage |
| `bff` | El BFF en Cloud Run (`scripts/deploy-bff.sh`) |
| cualquier otra cosa | Se pasa tal cual a `--only`, p. ej. `"hosting:customer,functions:customerManifest"` |

Ejemplos:

```bash
scripts/deploy.sh dev web
scripts/deploy.sh dev "hosting:waiter,functions:confirmManualPayment"
DRY_RUN=1 scripts/deploy.sh dev all          # muestra el comando sin ejecutarlo
scripts/deploy.sh prod "hosting:customer"    # producción: ver abajo
```

**Producción tiene candados.** `scripts/deploy.sh prod …` y `scripts/deploy-bff.sh prod` se niegan a desplegar si:
- no estás en `main`;
- `main` local no es igual a `origin/main` (haz `git pull` o `push`);
- hay cambios sin commitear en lo que se despliega.

Además te piden escribir **`prod`** para confirmar.

En producción, prefiere nombrar lo que cambió (`"hosting:admin,functions:x"`) en lugar de `all`. Al desplegar índices, si la CLI ofrece **borrar** índices que no están en `firestore.indexes.json`, responde **No** (el archivo ya tiene todos los de producción al 2026-09-29).

Usa siempre **`npx -y firebase-tools@15.30.2`** (los scripts ya lo hacen): la CLI global 14.x no puede desplegar las reglas de RTDB.

---

## 4. Flujo de trabajo

```
rama feat/issue-N-…  ──►  scripts/deploy.sh dev …  ──►  probar en dev
        │
        └──►  PR a main  ──►  merge  ──►  git checkout main && git pull  ──►  scripts/deploy.sh prod …
```

- Dev se puede desplegar desde **cualquier rama**, para probar antes del PR.
- Producción **solo desde `main`**: lo que está en producción siempre es lo que está en `main`.
- Cambios de esquema, reglas o functions: pruébalos primero en dev con datos de prueba.

---

## 5. Secretos

| Qué | Dónde | ¿Al repo? |
|---|---|---|
| Config web de Firebase, URLs | `apps/*/.env.<proyecto>` | Sí (es pública) |
| Variables no secretas del BFF | `deploy/env/<alias>.env` | Sí |
| Secretos del BFF (CCLW de PagueloFácil, tokens) | `deploy/env/<alias>.secrets.env` | **No** (gitignored) |
| `apps/fastapi_bff/.env`, `serviceAccountKey.json`, `apps/*/.env.local` | Local | **No** |

`deploy-bff.sh` **actualiza** variables y nunca las reemplaza todas. Si no existe el archivo de secretos, el servicio conserva los que ya tiene en Cloud Run. Por eso desplegar el BFF de producción sin `prod.secrets.env` no borra la CCLW.

---

## 6. Volver atrás (rollback)

- **Hosting:** consola de Firebase → *Hosting* → el sitio → *Historial de versiones* → **Revertir** en la versión anterior. Es inmediato y no hace falta construir nada.
- **BFF (Cloud Run):** manda el tráfico a la revisión anterior:
  ```bash
  gcloud run revisions list --service restaurantos-bff --region us-central1 --project restaurant-os-68c79
  gcloud run services update-traffic restaurantos-bff --to-revisions <REVISION>=100 --region us-central1 --project restaurant-os-68c79
  ```
- **Functions y reglas:** no tienen «revertir». Haz `git revert` del commit en una rama, PR a `main`, merge y vuelve a desplegar lo afectado.

---

## 7. Qué comparten los dos ambientes

- **Código:** el mismo repo. Solo cambian los archivos de config de arriba.
- **PagueloFácil:** los dos en **sandbox** hasta tener la cuenta de producción (`PAGUELOFACIL_ENV` en `deploy/env/<alias>.env`, y `VITE_PAYMENTS_ENABLED` en la customer web).
- **Odoo:** opcional y por organización (en el documento de la org). Dev no lo necesita.
- **Vertex AI (asistente del admin):** cada ambiente lo usa en su propio proyecto; el bootstrap habilita la API y da el rol.
