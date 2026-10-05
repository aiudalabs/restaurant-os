#!/usr/bin/env bash
# Run the Firebase emulator suites (functions/test/emulator) against the real
# rules and Cloud Functions. Never touches dev or prod (project demo-ros-test).
#
#   scripts/test-emulators.sh            # every suite
#   scripts/test-emulators.sh yappy      # one suite: rules | counter | yappy
#
# Needs a JDK ≥ 21 (Firestore emulator). Uses a private, patched copy of
# firebase-tools: its functions emulator wraps admin.firestore with .bind() and
# loses static members, so functions calling admin.firestore.Timestamp.now()
# crash in the emulator (not in production). The copy lives in $TMPDIR.
source "$(dirname "$0")/_common.sh"

FT_VERSION="15.30.2"
FT_DIR="${TMPDIR:-/tmp}/ros-firebase-tools-$FT_VERSION"
FT_BIN="$FT_DIR/node_modules/firebase-tools/lib/bin/firebase.js"
RUNTIME="$FT_DIR/node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime.js"

JAVA_HOME="$(/usr/libexec/java_home -v 21+ 2>/dev/null || true)"
[ -n "$JAVA_HOME" ] || die "Falta un JDK 21 o superior (el emulador de Firestore lo exige)."
export JAVA_HOME PATH="$JAVA_HOME/bin:$PATH"

want_node="$(python3 -c "import json; print(json.load(open('functions/package.json'))['engines']['node'])")"
have_node="$(node -p 'process.versions.node.split(".")[0]')"
[ "$want_node" = "$have_node" ] || printf '  ⚠ Las functions piden Node %s y tienes %s: el emulador usa el tuyo.\n' "$want_node" "$have_node"

if [ ! -f "$FT_BIN" ]; then
  step "Preparando firebase-tools $FT_VERSION (copia privada en $FT_DIR)"
  npm install --prefix "$FT_DIR" --no-save --no-audit --no-fund --silent "firebase-tools@$FT_VERSION"
fi
python3 - "$RUNTIME" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
if "ros-patch" in s:
    sys.exit(0)
a = """        else {
            return value.bind(target);
        }"""
b = """        else {
            // ros-patch: keep static members such as admin.firestore.Timestamp.
            const bound = value.bind(target);
            for (const name of Object.getOwnPropertyNames(value)) {
                if (name in bound) continue;
                Object.defineProperty(bound, name, { get: () => value[name], configurable: true });
            }
            return bound;
        }"""
if s.count(a) != 1:
    sys.exit("No encontré el punto a parchear en firebase-tools; revisa la versión.")
open(p, "w").write(s.replace(a, b))
PY

step "Compilando functions"
(cd functions && npm run build >/dev/null)

SUITES="${1:-rules counter yappy}"
failed=""
for suite in $SUITES; do
  case "$suite" in
    rules) only="firestore"; file="rules.test.mjs" ;;
    counter) only="auth,firestore,database,functions"; file="counter.e2e.mjs" ;;
    yappy) only="auth,firestore,database,functions"; file="yappy.e2e.mjs" ;;
    *) die "Suite desconocida: $suite (rules | counter | yappy)" ;;
  esac
  step "Suite $suite"
  log="$(mktemp)"
  node "$FT_BIN" emulators:exec --only "$only" --project demo-ros-test "node functions/test/emulator/$file" >"$log" 2>&1 || true
  grep -E '^(PASS|FAIL)|all passed|failed$|timeout' "$log" || tail -20 "$log"
  grep -q '^all passed' "$log" || failed="$failed $suite"
  rm -f "$log"
done

[ -z "$failed" ] || die "Fallaron:$failed"
ok "Todas las suites pasaron: $SUITES"
