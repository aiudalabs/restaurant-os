# RestaurantOS — bucle de calidad. Reglas en docs/DEV_WORKFLOW.md.
# Web siempre se construye contra dev: el guard de vite rechaza `production`.
DEV_MODE := restaurant-os-dev-49096
WEB_APPS := admin_app customer_web waiter_web kitchen_web
BFF_TESTS := --ignore=tests/test_auth.py --ignore=tests/test_catalog_sync.py

.PHONY: check verify e2e web-% functions bff

# Bucle rápido mientras trabajas: tipos + tests unitarios (sin emulador).
check: functions bff

# Antes de pedir revisión, una vez: todo lo anterior + build de las 4 webs.
verify: check $(addprefix web-,$(WEB_APPS))

# Reglas de Firestore/RTDB y flujos de pago contra emuladores (requiere JDK 21+).
e2e:
	scripts/test-emulators.sh

functions:
	cd functions && npm run test:unit

bff:
	cd apps/fastapi_bff && python3.12 -m pytest -q $(BFF_TESTS)

web-%:
	cd apps/$* && npm run build -- --mode $(DEV_MODE)
