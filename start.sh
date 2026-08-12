#!/usr/bin/env bash
# start.sh — Launch all Assignment Management services at once.
# Usage: ./start.sh
# Stack: React (Vite) + three independent Node services (API, Analyzer, Collab).

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Assignment Management — Starting all services ===${NC}"

echo -e "${RED}Killing existing processes...${NC}"
fuser -k 8001/tcp 2>/dev/null || true
fuser -k 8002/tcp 2>/dev/null || true
fuser -k 8003/tcp 2>/dev/null || true
fuser -k 8004/tcp 2>/dev/null || true
fuser -k 8005/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "api/src/main.js" 2>/dev/null || true
pkill -f "analyzer-node/src/main.js" 2>/dev/null || true
pkill -f "collab/src/main.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# API server (:8001) — REST + SPA hosting
echo -e "${GREEN}Starting API server on :8001...${NC}"
cd "$PROJECT_DIR/api"
node src/main.js > /tmp/api-8001.log 2>&1 &
API_PID=$!
cd "$PROJECT_DIR"

# Analyzer (:8002) — originality verdict engine (independent, stateless)
echo -e "${GREEN}Starting analyzer on :8002...${NC}"
cd "$PROJECT_DIR/analyzer-node"
node src/main.js > /tmp/analyzer-8002.log 2>&1 &
ANALYZER_PID=$!
cd "$PROJECT_DIR"

# Collab (:8003 WS docs, :8004 internal, :8005 tracking intake)
echo -e "${GREEN}Starting collab server on :8003/:8004/:8005...${NC}"
cd "$PROJECT_DIR/collab"
node src/main.js > /tmp/collab-8003.log 2>&1 &
COLLAB_PID=$!
cd "$PROJECT_DIR"

# Vite dev server (:3000)
echo -e "${GREEN}Starting Vite frontend on :3000...${NC}"
npm run dev > /tmp/vite-3000.log 2>&1 &
VITE_PID=$!

echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 3

echo -e "${BLUE}Health checks:${NC}"

if curl -s -X POST http://localhost:8001/api/login -H 'Content-Type: application/json' -d '{}' 2>/dev/null | grep -q 'error'; then
    echo -e "  ${GREEN}✓ API server:${NC} http://localhost:8001"
else
    echo -e "  ${RED}✗ API server failed${NC} — check /tmp/api-8001.log"
fi

if curl -s http://localhost:8002/health 2>/dev/null | grep -q 'ok'; then
    echo -e "  ${GREEN}✓ Analyzer:${NC} http://localhost:8002"
else
    echo -e "  ${RED}✗ Analyzer failed${NC} — check /tmp/analyzer-8002.log"
fi

if curl -s -H 'X-Internal-Secret: local-dev-internal-secret' http://localhost:8004/health 2>/dev/null | grep -q 'ok'; then
    echo -e "  ${GREEN}✓ Collab server:${NC} ws://localhost:8003 (internal :8004, tracking :8005)"
else
    echo -e "  ${RED}✗ Collab server failed${NC} — check /tmp/collab-8003.log"
fi

if curl -s http://localhost:3000 2>/dev/null | grep -q 'root'; then
    echo -e "  ${GREEN}✓ Vite frontend:${NC} http://localhost:3000"
else
    echo -e "  ~ Vite still starting... — check /tmp/vite-3000.log"
fi

echo ""
echo -e "${GREEN}=== All services launched ===${NC}"
echo -e "  Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "  API:       ${BLUE}http://localhost:8001${NC}"
echo -e "  Analyzer:  ${BLUE}http://localhost:8002${NC}"
echo -e "  Collab:    ${BLUE}ws://localhost:8003${NC}"
echo ""
echo "  PIDs: API=$API_PID  Analyzer=$ANALYZER_PID  Collab=$COLLAB_PID  Vite=$VITE_PID"
echo "  Logs: /tmp/api-8001.log  /tmp/analyzer-8002.log  /tmp/collab-8003.log  /tmp/vite-3000.log"
echo ""
echo "  Press Ctrl+C to stop all services."

trap "echo ''; echo 'Stopping all services...'; kill $API_PID $ANALYZER_PID $COLLAB_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

wait
