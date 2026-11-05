# RestaurantOS — bucle de calidad. Reglas en docs/DEV_WORKFLOW.md.
# Web siempre se construye contra dev: el guard de vite rechaza `production`.
DEV_MODE := restaurant-os-dev-49096
WEB_APPS := admin_app customer_web waiter_web kitchen_web
BFF_TESTS :=

.PHONY: check verify e2e e2e-dev e2e-dev-cleanup web-% functions bff

# Bucle rápido mientras trabajas: tipos + tests unitarios (sin emulador).
check: functions bff

# Antes de pedir revisión, una vez: todo lo anterior + build de las 4 webs.
verify: check $(addprefix web-,$(WEB_APPS))

# Reglas de Firestore/RTDB y flujos de pago contra emuladores (requiere JDK 21+).
e2e:
	scripts/test-emulators.sh

# Recorridos Playwright contra las apps DESPLEGADAS en dev (Pick & Eat). Crea y borra
# usuarios temporales; requiere gcloud con admin@aiudalabs.com. NO está en CI. Ver e2e/README.md.
e2e-dev:
	cd e2e && npm ci && npx playwright test

# Deshace a mano los restos de una corrida interrumpida.
e2e-dev-cleanup:
	cd e2e && npm ci && npm run cleanup

functions:
	cd functions && npm run test:unit

bff:
	cd apps/fastapi_bff && python3.12 -m pytest -q $(BFF_TESTS)

web-%:
	cd apps/$* && npm run --if-present test && npm run build -- --mode $(DEV_MODE)
