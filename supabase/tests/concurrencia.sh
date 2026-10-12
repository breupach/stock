#!/usr/bin/env bash
# Dos ventas simultáneas de la última unidad: una pasa, la otra recibe stock_insuficiente.
set -euo pipefail
PSQL=("$@")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
ADMIN="set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';"
"${PSQL[@]}" -q -c "$ADMIN insert into public.products (sku, name, price) values ('CONC-1', 'Concurrencia', 1);
  select public.registrar_movimiento((select id from public.products where sku = 'CONC-1'), 'stock_inicial', 1);" >/dev/null
VENTA="$ADMIN begin; select public.registrar_movimiento((select id from public.products where sku = 'CONC-1'), 'salida', 1); select pg_sleep(1); commit;"
( "${PSQL[@]}" -q -c "$VENTA" >/dev/null 2>&1 && echo ok || echo error ) > "$TMP/a" &
sleep 0.2
( "${PSQL[@]}" -q -c "$VENTA" >/dev/null 2>&1 && echo ok || echo error ) > "$TMP/b" &
wait
RES=$(sort "$TMP/a" "$TMP/b" | tr '\n' ' ')
STOCK=$("${PSQL[@]}" -tA -c "select stock from public.products where sku = 'CONC-1'")
if [[ "$RES" != "error ok " || "$STOCK" != "0.000" ]]; then
  echo "FALLO concurrencia: resultados=[$RES] stock=$STOCK"; exit 1
fi
echo "concurrencia.sh: una venta pasó, la otra fue rechazada, stock final 0"
