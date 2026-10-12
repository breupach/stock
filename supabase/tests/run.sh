#!/usr/bin/env bash
# Prueba las migraciones contra un Postgres común (sin Supabase).
# Uso: supabase/tests/run.sh "postgresql://postgres@localhost:5432/postgres"
set -euo pipefail
cd "$(dirname "$0")/../.."
BASE_URL="${1:?Pasá la URL de un Postgres de prueba}"
DB="stock_test_$$"
psql "$BASE_URL" -q -v ON_ERROR_STOP=1 -c "create database $DB" >/dev/null
trap 'psql "$BASE_URL" -q -c "drop database if exists $DB" >/dev/null' EXIT
TEST_URL="${BASE_URL%/*}/$DB"
P=(psql "$TEST_URL" -v ON_ERROR_STOP=1)
"${P[@]}" -q -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do "${P[@]}" -q -f "$f"; done
"${P[@]}" -q -f supabase/tests/reglas.test.sql
bash supabase/tests/concurrencia.sh "${P[@]}"
