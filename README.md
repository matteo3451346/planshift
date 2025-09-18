# 🚀 PlanShift - Sistema Gestione Turni

## 📱 Applicazione Completa

**PlanShift** è un sistema professionale per la gestione dei turni lavorativi con interfaccia web moderna e database locale.

### ✨ Caratteristiche Principali

- 🔐 **Autenticazione Sicura** - Login differenziato per admin e dipendenti
- 👥 **Gestione Risorse** - CRUD completo per dipendenti/operatori
- ⏰ **Pianificazione Turni** - Creazione e gestione turni con fasce orarie
- 📊 **Dashboard Analytics** - Reports dettagliati e statistiche
- 🗑️ **Eliminazione Sicura** - Cancellazione risorse con conferma
- 💾 **Database Locale** - SQLite per affidabilità e semplicità
- 🎨 **UI Moderna** - Interfaccia responsive con Tailwind CSS
- 🛡️ **Controllo Ore Riposo** - Validazione automatica ore minime tra turni
- 🚨 **Alert Intelligenti** - Messaggi dettagliati per violazioni planning

---

## 🚀 Avvio Rapido

### Metodo 1: Script Automatico (Raccomandato)
```bash
./start.sh
```

### Metodo 2: Avvio Manuale

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
yarn install
yarn start
```

### Metodo 3: Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔗 Accesso Applicazione

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Documentazione API**: http://localhost:8001/docs

---

## 🔐 Credenziali

- **Admin**: `admin` / `NUOVA_PASSWORD_ADMIN`
- **Dipendenti**: `[nome.cognome]` / `NUOVA_PASSWORD_DIPENDENTI`

### 📝 Sistema Username Dipendenti:
- **Username dal nome**: "Marco Verdi" → `marco.verdi`
- **Password uguale per tutti**: `NUOVA_PASSWORD_DIPENDENTI`
- **Esempi login**:
  - `marco.verdi` / `NUOVA_PASSWORD_DIPENDENTI`
  - `anna.maria.rossi` / `NUOVA_PASSWORD_DIPENDENTI`
  - `luca.dangelo` / `NUOVA_PASSWORD_DIPENDENTI`

> 💡 **Vedere Username**: Usa endpoint `/admin/employee-usernames` per vedere tutti gli username generati

> 💡 **Personalizzazione Password**: Vedi `DEPLOYMENT_GUIDE.md` per istruzioni dettagliate

---

## 📁 Struttura Progetto

```
planshift-final/
├── 🔧 backend/           # API FastAPI + SQLite
├── 🎨 frontend/          # React SPA
├── 💾 planshift.db       # Database SQLite
├── 📋 DEPLOYMENT_GUIDE.md # Guida completa
├── 🚀 start.sh          # Script avvio rapido
└── 🐳 docker-compose.prod.yml # Deploy Docker
```

---

## 📖 Documentazione

- 📋 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Guida completa deployment
- 🔧 **[backend/README.md](./backend/README.md)** - Documentazione API
- 🎨 **[frontend/README.md](./frontend/README.md)** - Documentazione Frontend

---

## 🛠️ Requisiti Sistema

- **Python**: 3.8+
- **Node.js**: 16+
- **Memoria**: 512MB RAM minimo
- **Storage**: 100MB spazio disco

---

## 💡 Supporto

Per domande o problemi:
1. Consulta `DEPLOYMENT_GUIDE.md`
2. Controlla logs di backend/frontend
3. Verifica configurazione database

---

**Versione**: 3.5 Final  
**Stato**: ✅ Pronto per Produzione  
**Data**: Settembre 2024

### 🔧 Ultimo Aggiornamento (v3.5):
- ✅ **Alert Minimali**: Messaggi ore riposo concisi e intuitivi
- ✅ **UX Migliorata**: "⚠️ Riposo insufficiente: 0.0h (min: 12h)" invece di testi lunghi
- ✅ **Leggibilità**: Messaggi <200 caratteri con info essenziali
- ✅ **Sistema Stabile**: Bug critico ore riposo completamente risolto
