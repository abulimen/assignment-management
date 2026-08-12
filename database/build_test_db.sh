#!/usr/bin/env bash
# Rebuild assignment_mgmt_test from schema + migrations.
# The SQL files hardcode "USE assignment_mgmt", so those lines are stripped
# and the target test database is passed explicitly to mysql.
set -e
DB="${1:-assignment_mgmt_test}"
DIR="$(cd "$(dirname "$0")" && pwd)"

mysql -u root -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

apply() {
  sed -e '/^CREATE DATABASE IF NOT EXISTS/d' \
      -e '/^  CHARACTER SET utf8mb4$/d' \
      -e '/^  COLLATE utf8mb4_unicode_ci;$/d' \
      -e '/^USE assignment_mgmt;/d' "$1" | mysql -u root "$DB"
}

apply "$DIR/schema.sql"
apply "$DIR/migration_groups.sql"
apply "$DIR/migration_merge.sql"
apply "$DIR/migration_steps.sql"
apply "$DIR/migration_analytics.sql"
apply "$DIR/migration_realtime.sql"
apply "$DIR/migration_events_received_at.sql"

echo "Test database '$DB' rebuilt."
