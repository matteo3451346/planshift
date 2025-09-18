#!/bin/bash

echo "🚀 AVVIO PLANSHIFT - Sistema Gestione Turni"
echo "==========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Controllo prerequisiti...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 non trovato. Installare Python 3.8+${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installare Node.js 16+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisiti soddisfatti${NC}"

# Check if this is first run
if [ ! -f "backend/.venv/bin/activate" ]; then
    echo -e "${YELLOW}🔧 Prima esecuzione - Installazione dipendenze...${NC}"
    
    # Backend setup
    echo -e "${BLUE}📦 Installazione dipendenze backend...${NC}"
    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..
    
    # Frontend setup
    echo -e "${BLUE}📦 Installazione dipendenze frontend...${NC}"
    cd frontend
    if command -v yarn &> /dev/null; then
        yarn install
    else
        npm install
    fi
    cd ..
    
    echo -e "${GREEN}✅ Installazione completata${NC}"
fi

# Start backend
echo -e "${BLUE}🚀 Avvio backend...${NC}"
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -e "${YELLOW}⏳ Attesa avvio backend...${NC}"
sleep 3

# Start frontend
echo -e "${BLUE}🚀 Avvio frontend...${NC}"
cd frontend
if command -v yarn &> /dev/null; then
    yarn start &
else
    npm start &
fi
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 PlanShift avviato con successo!${NC}"
echo ""
echo -e "${BLUE}📍 URL Applicazione:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   Backend:  ${GREEN}http://localhost:8001${NC}"
echo -e "   API Docs: ${GREEN}http://localhost:8001/docs${NC}"
echo ""
echo -e "${BLUE}🔐 Credenziali Login:${NC}"
echo -e "   Admin: ${YELLOW}admin / NUOVA_PASSWORD_ADMIN${NC}"
echo -e "   (Modifica password nel file backend/server.py)"
echo ""
echo -e "${YELLOW}💡 Per fermare l'applicazione: Ctrl+C${NC}"
echo ""

# Wait for interrupt
trap 'echo -e "\n${YELLOW}🛑 Interruzione ricevuta...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Keep script running
wait