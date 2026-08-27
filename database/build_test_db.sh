#!/usr/bin/env bash
# Rebuild test database from schema and migrations.
set -e

DB="${1:-${COLLAB_TEST_DB:-assignment_mgmt_test}}"
DIR="$(cd "$(dirname "$0")" && pwd)"

MYSQL_HOST="${DB_HOST:-127.0.0.1}"
MYSQL_PORT="${DB_PORT:-3306}"
MYSQL_USER="${DB_USER:-root}"
MYSQL_PASS="${DB_PASS:-}"

MYSQL_ARGS=(-h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER")
if [ -n "$MYSQL_PASS" ]; then
  MYSQL_ARGS+=("-p$MYSQL_PASS")
fi

mysql "${MYSQL_ARGS[@]}" -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

apply() {
  sed -e "s/assignment_mgmt/$DB/g" "$1" | mysql "${MYSQL_ARGS[@]}" "$DB"
}

apply "$DIR/schema.sql"
apply "$DIR/migration_groups.sql"
apply "$DIR/migration_merge.sql"
apply "$DIR/migration_steps.sql"
apply "$DIR/migration_analytics.sql"
apply "$DIR/migration_realtime.sql"
apply "$DIR/migration_events_received_at.sql"
apply "$DIR/migration_auth_production.sql"
apply "$DIR/migration_courses.sql"
apply "$DIR/migration_student_id.sql"

echo "Test database '$DB' rebuilt successfully."
