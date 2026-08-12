#!/usr/bin/env bash
# start.sh — Launch all Assignment Management services at once.
# Usage: ./start.sh
# Kills any existing instances first, then starts PHP, Python, Collab, Vite.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Assignment Management — Starting all services ===${NC}"

# Kill any existing instances
echo -e "${RED}Killing existing processes...${NC}"
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 8002/tcp 2>/dev/null || true
fuser -k 8003/tcp 2>/dev/null || true
fuser -k 8004/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "php -S localhost:8001" 2>/dev/null || true
pkill -f "collab/src/main.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start PHP backend (port 8001)
echo -e "${GREEN}Starting PHP backend on :8001...${NC}"
php -d display_errors=1 -S localhost:8001 -t public public/router.php > /tmp/php-8001.log 2>&1 &
PHP_PID=$!

# Start Python analyzer (port 8002)
echo -e "${GREEN}Starting Python analyzer on :8002...${NC}"
cd "$PROJECT_DIR/analyzer"
uvicorn main:app --port 8002 --host 0.0.0.0 > /tmp/analyzer-8002.log 2>&1 &
PYTHON_PID=$!
cd "$PROJECT_DIR"

# Start realtime collaboration server (WS 8003, internal API 8004)
echo -e "${GREEN}Starting collab server on :8003 (internal :8004)...${NC}"
cd "$PROJECT_DIR/collab"
COLLAB_WS_PORT=8003 COLLAB_INTERNAL_PORT=8004 node src/main.js > /tmp/collab-8003.log 2>&1 &
COLLAB_PID=$!
cd "$PROJECT_DIR"

# Start Vite dev server (port 3000)
echo -e "${GREEN}Starting Vite frontend on :3000...${NC}"
npm run dev > /tmp/vite-3000.log 2>&1 &
VITE_PID=$!

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 3

# Health checks
echo -e "${BLUE}Health checks:${NC}"

if curl -s http://localhost:8001/api/login.php -X POST -H 'Content-Type: application/json' -d '{}' 2>/dev/null | grep -q 'error'; then
    echo -e "  ${GREEN}✓ PHP backend:${NC} http://localhost:8001"
else
    echo -e "  ${RED}✗ PHP backend failed${NC} — check /tmp/php-8001.log"
fi

if curl -s http://localhost:8002/health 2>/dev/null | grep -q 'ok'; then
    echo -e "  ${GREEN}✓ Python analyzer:${NC} http://localhost:8002"
else
    echo -e "  ${RED}✗ Python analyzer failed${NC} — check /tmp/analyzer-8002.log"
fi

if curl -s -H 'X-Internal-Secret: local-dev-internal-secret' http://localhost:8004/health 2>/dev/null | grep -q 'ok'; then
    echo -e "  ${GREEN}✓ Collab server:${NC} ws://localhost:8003 (internal :8004)"
else
    echo -e "  ${RED}✗ Collab server failed${NC} — check /tmp/collab-8003.log"
fi

if curl -s http://localhost:3000 2>/dev/null | grep -q 'root'; then
    echo -e "  ${GREEN}✓ Vite frontend:${NC} http://localhost:3000"
else
    echo -e "  ${YELLOW}~ Vite still starting...${NC} — check /tmp/vite-3000.log"
fi

echo ""
echo -e "${GREEN}=== All services launched ===${NC}"
echo -e "  Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "  PHP API:   ${BLUE}http://localhost:8001${NC}"
echo -e "  Analyzer:  ${BLUE}http://localhost:8002${NC}"
echo -e "  Collab:    ${BLUE}ws://localhost:8003${NC}"
echo ""
echo "  PIDs: PHP=$PHP_PID  Python=$PYTHON_PID  Collab=$COLLAB_PID  Vite=$VITE_PID"
echo "  Logs: /tmp/php-8001.log  /tmp/analyzer-8002.log  /tmp/collab-8003.log  /tmp/vite-3000.log"
echo ""
echo "  Press Ctrl+C to stop all services."

# Trap Ctrl+C and kill all children
trap "echo ''; echo 'Stopping all services...'; kill $PHP_PID $PYTHON_PID $COLLAB_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

# Keep script alive
wait