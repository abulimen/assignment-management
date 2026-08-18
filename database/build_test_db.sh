#!/usr/bin/env bash
# Rebuild assignment_mgmt_test from schema + migrations.
# The SQL files hardcode "USE assignment_mgmt", so those lines are stripped
# and the target test database is passed explicitly to mysql.
set -e
DB="${1:-assignment_mgmt_test}"
DIR="$(cd "$(dirname "$0")" && pwd)"

mysql -h 127.0.0.1 -u root -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

apply() {
  sed -e "s/assignment_mgmt/$DB/g" "$1" | mysql -h 127.0.0.1 -u root "$DB"
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

echo "Test database '$DB' rebuilt."
