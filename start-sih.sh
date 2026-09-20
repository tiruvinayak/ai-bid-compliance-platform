#!/bin/bash
# ==============================================================================
# SIH Bid Compliance & Verification System (SIH26100) - Unified Local Startup
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/Frontend/Frontend"
BACKEND_DIR="${PROJECT_ROOT}/Backend"
AI_DIR="${PROJECT_ROOT}/ai-service/ai-service"

echo "======================================================================"
echo "  Starting SIH Full-Stack System on Mac (One Single URL Mode)"
echo "======================================================================"

# 1. Development data boundary
echo "[1/4] Using isolated Spring Boot in-memory development data (PostgreSQL deferred)..."
echo "      ✓ No external database is required for this phase."

# 2. Build React Frontend & Copy to Spring Boot Static Directory
echo "[2/4] Building React Frontend SPA production assets..."
cd "${FRONTEND_DIR}"
npm run build > /dev/null 2>&1 || npm run build

echo "      Copying production build to Spring Boot static resources..."
mkdir -p "${BACKEND_DIR}/src/main/resources/static"
cp -r "${FRONTEND_DIR}/dist/." "${BACKEND_DIR}/src/main/resources/static/"
echo "      ✓ React SPA production build embedded into Spring Boot."

# 3. Start Python FastAPI AI Service Daemon
echo "[3/4] Starting Python FastAPI AI Service daemon on port 8000..."
cd "${AI_DIR}"
if lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "      ✓ Python AI service is already running on port 8000."
else
    if [ -x "${AI_DIR}/.venv/bin/python" ]; then
        "${AI_DIR}/.venv/bin/python" app/main.py --serve > "${AI_DIR}/app.log" 2>&1 &
    else
        python3 app/main.py --serve > "${AI_DIR}/app.log" 2>&1 &
    fi
    sleep 3
    echo "      ✓ Python AI service daemon launched on port 8000."
fi

# 4. Start Spring Boot Unified Full-Stack Server
echo "[4/4] Starting Spring Boot Unified Server on port 8080..."
cd "${BACKEND_DIR}"

if lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "      Restarting active Spring Boot server on port 8080..."
    lsof -nP -iTCP:8080 -sTCP:LISTEN | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "======================================================================"
echo "  SIH SYSTEM STARTED SUCCESSFULLY!"
echo "  ACCESS THE COMPLETE APPLICATION AT ONE SINGLE BROWSER URL:"
echo ""
echo "        http://localhost:8080"
echo ""
echo "======================================================================"

mvn spring-boot:run -Dspring-boot.run.profiles=dev
