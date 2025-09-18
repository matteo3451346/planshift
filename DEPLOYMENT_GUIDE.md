# 🚀 PlanShift - Guida Deployment Finale

## 📋 Panoramica Applicazione

**PlanShift** è un sistema completo di gestione turni con le seguenti funzionalità:

### ✅ Funzionalità Implementate:
- 🔐 **Sistema Autenticazione**: Admin e dipendenti con ruoli differenziati
- 👥 **Gestione Risorse**: CRUD completo con eliminazione a cascata
- ⏰ **Pianificazione Turni**: Gestione fasce orarie e turni settimanali
- 📊 **Reports & Analytics**: Dashboard con statistiche complete
- 🗑️ **Eliminazione Risorse**: Con conferma e eliminazione turni associati
- 🔒 **Gestione Password**: Sistema per cambiare password admin e dipendenti
- 💾 **Database SQLite**: Storage locale affidabile e veloce
- 🛡️ **Controllo Ore Riposo**: Validazione automatica ore minime tra turni
- 🚨 **Alert Violazioni**: Messaggi dettagliati per conflitti turni

### 🛠️ Stack Tecnologico:
- **Backend**: FastAPI (Python) con SQLite
- **Frontend**: React con Tailwind CSS  
- **Database**: SQLite locale (planshift.db)
- **Autenticazione**: JWT Token-based

---

## 🛡️ Sistema Controllo Ore di Riposo

### Funzionalità:
L'applicazione controlla automaticamente che ci siano abbastanza ore di riposo tra un turno e l'altro per ogni risorsa.

### Esempio Pratico:
- **NOTTE**: 22:00 - 06:00
- **MATTINO PRESTO**: 06:00 - 14:00
- **Violazione**: Se un dipendente fa NOTTE (finisce alle 06:00), non può fare MATTINO PRESTO (inizia alle 06:00) lo stesso giorno se le ore di riposo minimo sono > 0.

### Configurazione:
- **Campo**: `min_rest_hours` per ogni risorsa
- **Default**: 12 ore di riposo minimo
- **Controllo**: Automatico durante creazione turni

### Messaggi di Alert:
Il sistema fornisce messaggi minimali e intuitivi:
```
⚠️ Riposo insufficiente: 0.0h (min: 12h)
📅 NOTTE (22:00-06:00) del 16/09 → 06:00-14:00 del 17/09
```

Per sovrapposizioni:
```
❌ Turni sovrapposti
📅 NOTTE (22:00-06:00) del 16/09 ⚠️ 06:00-14:00 del 16/09
```

### Endpoint di Controllo:
```bash
# Analizza ore di riposo per una risorsa
curl -X GET "http://localhost:8001/api/admin/check-rest-hours/{resource_id}" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔧 Installazione e Deployment

### Prerequisiti:
- Python 3.8+
- Node.js 16+
- npm o yarn

### 1️⃣ Setup Backend:

```bash
cd backend
pip install -r requirements.txt
```

### 2️⃣ Setup Frontend:

```bash
cd frontend
yarn install
# oppure: npm install
```

### 3️⃣ Configurazione Ambiente:

**Backend (.env):**
```
ENVIRONMENT=production
# SQLite local database - no external credentials needed
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4️⃣ Avvio Applicazione:

**Backend:**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
yarn start
# oppure: npm start
```

---

## 🔐 Credenziali di Accesso

### Password Attuali:
- **Admin**: `NUOVA_PASSWORD_ADMIN` (modificabile nel codice)
- **Dipendenti**: `NUOVA_PASSWORD_DIPENDENTI` (STESSA PASSWORD PER TUTTI)

### Sistema Username Dipendenti:
- **Username generato dal NOME**: Es. "Marco Verdi" → `marco.verdi`
- **Trasformazione automatica**: 
  - Spazi → punti (.)
  - Tutto minuscolo
  - Solo lettere, numeri e punti
  - Caratteri speciali rimossi
- **Esempi**:
  - "Anna Maria Rossi" → `anna.maria.rossi`
  - "Luca D'Angelo" → `luca.dangelo`
  - "Sofia Rosa-Bianchi" → `sofia.rosa.bianchi`

### Vedere Username Generati:
```bash
curl -X GET "http://localhost:8001/api/admin/employee-usernames" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Per Cambiare Password:

**Metodo 1 - Nel Codice (Raccomandato):**
File: `backend/server.py`
- Riga ~1159: Cambia `NUOVA_PASSWORD_ADMIN`
- Riga ~1179: Cambia `NUOVA_PASSWORD_DIPENDENTI`

**Metodo 2 - Script Automatico:**
```bash
cd backend
python3 update_passwords.py
```

**Metodo 3 - API Endpoint:**
```bash
curl -X POST "http://localhost:8001/api/admin/reset-all-passwords" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 💾 Database

### Struttura Database:
- **File**: `planshift.db` (SQLite)
- **Tabelle**: users, resources, time_slots, shifts, weekly_plans
- **Backup**: Semplicemente copia il file `planshift.db`

### Inizializzazione Dati:
Il database viene inizializzato automaticamente con:
- Utente admin
- Fasce orarie predefinite
- 4 risorse di esempio

---

## 🔄 Aggiornamenti e Manutenzione

### Backup Database:
```bash
cp planshift.db planshift_backup_$(date +%Y%m%d).db
```

### Reset Completo Database:
```bash
rm planshift.db
# Riavvia backend per ricreare database pulito
```

### Update Password Esistenti:
```bash
cd backend
python3 update_passwords.py
```

---

## 🐛 Troubleshooting

### Problemi Comuni:

**1. Errori di Connessione Database:**
- Verifica che `planshift.db` sia accessibile
- Controlla permessi file

**2. Login Fallisce:**
- Verifica password nel codice
- Esegui script reset password
- Controlla logs backend per errori

**3. Frontend Non Si Connette:**
- Verifica REACT_APP_BACKEND_URL nel .env
- Controlla che backend sia attivo su porta 8001

**4. Errori CORS:**
- Backend ha CORS configurato per sviluppo
- Per produzione aggiorna origins in server.py

### File di Log:
- Backend: console output o file di log del server
- Frontend: console browser (F12)

---

## 📁 Struttura File Finali

```
planshift-final/
├── backend/
│   ├── server.py              # Backend FastAPI
│   ├── requirements.txt       # Dipendenze Python  
│   ├── .env                   # Configurazione ambiente
│   └── update_passwords.py    # Script gestione password
├── frontend/
│   ├── src/                   # Codice React
│   ├── package.json           # Dipendenze Node.js
│   └── .env                   # Configurazione frontend
├── planshift.db               # Database SQLite con dati
├── DEPLOYMENT_GUIDE.md        # Questa guida
└── README.md                  # Documentazione progetto
```

---

## 🎯 Note Finali

### Funzionalità Principali Testate:
- ✅ Login admin/dipendenti funzionante
- ✅ Dashboard admin accessibile  
- ✅ Gestione risorse (CRUD + eliminazione)
- ✅ Pianificazione turni operativa
- ✅ Reports e analytics funzionanti
- ✅ Database SQLite stabile
- ✅ Navigazione corretta per ruoli

### Sicurezza:
- Sezione credenziali demo rimossa dalla UI
- Password configurabili dal backend
- Ruoli utente differenziati (ADMIN/EMPLOYEE)
- JWT token-based authentication

### Pronto per Produzione:
L'applicazione è stata testata e verificata completamente. 
Database migrato da MySQL a SQLite per maggiore stabilità.

---

**Versione**: 3.0 Final  
**Data**: Settembre 2024  
**Status**: ✅ Pronto per Deployment