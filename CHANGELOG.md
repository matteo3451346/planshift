# 📋 Changelog - PlanShift

## [3.5] - 2024-09-16 (UX IMPROVEMENT)

### 🎨 Miglioramento Messaggi Alert
- **UI/UX**: Alert più intuitivi e minimali per violazioni ore riposo
- **Formato Nuovo**: "⚠️ Riposo insufficiente: 0.0h (min: 12h)" invece di messaggi lunghi
- **Leggibilità**: Messaggi concisi (<200 caratteri) con informazioni essenziali
- **Sovrapposizioni**: "❌ Turni sovrapposti" per conflitti di orario

### 📝 Esempi Alert Minimali
```
❌ PRIMA: 
🚨 VIOLAZIONE ORE DI RIPOSO MINIMO 🚨
⏰ Ore di riposo richieste: 12h
⚠️ Ore di riposo trovate: 0.0h
📅 Conflitto: NOTTE (22:00-06:00) del 15/09 → 06:00-14:00 del 16/09
💡 La risorsa deve attendere almeno 12 ore...

✅ DOPO:
⚠️ Riposo insufficiente: 0.0h (min: 12h)
📅 NOTTE (22:00-06:00) del 15/09 → 06:00-14:00 del 16/09
```

### 🔧 Vantaggi
- **Velocità Lettura**: Messaggi immediati da comprendere
- **Spazio UI**: Meno ingombro nelle interfacce
- **Informazioni Complete**: Mantiene tutti i dati essenziali

---

## [3.4] - 2024-09-16 (CRITICAL BUG FIX)

### 🚨 Bug Fix Critico - Ore di Riposo 
- **CRITICAL**: Risolto bug che permetteva turni con 0 ore di riposo
- **Problema**: Condizione `0 < time_between < min_rest_hours` escludeva il caso `time_between == 0`
- **Soluzione**: Cambiato in `time_between < min_rest_hours` per includere violazioni 0 ore
- **Cleanup**: Rimossi turni esistenti che violavano le regole (risorsa "bea" 15-16 Sept)

### 🛡️ Miglioramenti Validazione
- **Sovrapposizioni**: Aggiunta rilevazione turni completamente sovrapposti
- **Messaggi Migliorati**: Alert più dettagliati per violazioni 0 ore
- **Testing Completo**: Verificata correzione con casi specifici utente

### 📋 Caso Risolto
```
❌ PRIMA: NOTTE (Dom 15/09 22:00-06:00) → MATTINO (Lun 16/09 06:00-14:00) = PERMESSO
✅ DOPO:  NOTTE (Dom 15/09 22:00-06:00) → MATTINO (Lun 16/09 06:00-14:00) = BLOCCATO
```

### 🔧 Impatto
- **Sicurezza Lavoratori**: Garantita applicazione ore riposo minimo
- **Conformità**: Rispetto normative pause obbligatorie
- **Sistema Pulito**: Rimossi turni legacy che violavano regole

---

## [3.3] - 2024-09-16 (SISTEMA ORE RIPOSO)

### ✅ Nuove Funzionalità - Controllo Ore di Riposo
- **🛡️ Validazione Ore Riposo**: Sistema automatico controllo ore minime tra turni
- **🚨 Alert Dettagliati**: Messaggi specifici con conflitti e soluzioni
- **🔍 Endpoint Analisi**: `/admin/check-rest-hours/{resource_id}` per analizzare violazioni  
- **⏰ Gestione Turni Notturni**: Controllo specifico per turni oltre mezzanotte

### 🎯 Esempi Pratici Implementati
- **NOTTE (22:00-06:00) → MATTINO PRESTO (06:00-14:00)**: Violazione rilevata e bloccata
- **Messaggi Chiari**: "🚨 VIOLAZIONE ORE DI RIPOSO MINIMO" con dettagli conflitto
- **Suggerimenti**: Esempi pratici nei messaggi di errore

### 🔧 Miglioramenti Validazione
- **Calcolo Accurato**: Gestione precisa turni notturni e sovrapposizioni
- **Analisi Storica**: Controllo turni precedenti e successivi (48h window)
- **Configurazione Flessibile**: `min_rest_hours` personalizzabile per risorsa
- **API Administration**: Endpoint per analisi approfondita violazioni

### 📋 Formato Alert Migliorato
```
🚨 VIOLAZIONE ORE DI RIPOSO MINIMO 🚨
⏰ Ore richieste: 12h | ⚠️ Trovate: 0.0h
📅 Conflitto: NOTTE (22:00-06:00) → MATTINO PRESTO (06:00-14:00)
💡 Soluzione: Attendere almeno 12 ore tra turni
```

---

## [3.2] - 2024-09-16 (FEATURE UPDATE)

### ✅ Nuove Funzionalità
- **Username da Nome**: Username dipendenti generato dal nome invece che dall'email
- **Password Unificata**: Tutti i dipendenti usano la stessa password "NUOVA_PASSWORD_DIPENDENTI"
- **Endpoint Username**: Nuovo `/admin/employee-usernames` per vedere username generati
- **Trasformazione Automatica**: Nomi → username (spazi→punti, minuscolo, caratteri speciali rimossi)

### 🔧 Miglioramenti Sistema Autenticazione
- **Username Intuitivi**: Login con nome invece di email prefix
- **Gestione Password**: Sistema unificato per tutti i dipendenti
- **Script Aggiornato**: update_passwords.py gestisce anche username dal nome
- **Documentazione**: Guida completa per vedere e usare username generati

### 📋 Esempi Username Generati
- "Marco Verdi" → `marco.verdi`
- "Anna Maria Rossi" → `anna.maria.rossi`
- "Luca D'Angelo" → `luca.dangelo`
- "Sofia Rosa-Bianchi" → `sofia.rosa.bianchi`

---

## [3.1] - 2024-09-16 (HOTFIX)

### 🐛 Bug Fix Critico
- **Reports & Analytics**: Risolto errore JavaScript "Attempted to assign to readonly property"
- **Dettaglio Utilizzo Risorse**: Fix selezione risorse che causava crash runtime
- **Array Immutability**: Corretto uso di `reverse()` su array readonly creando copia `[...array].reverse()`

### 🔧 Miglioramenti Stabilità
- **JavaScript Errors**: Eliminati errori runtime nella sezione reports
- **User Experience**: Selezione risorse ora funziona senza problemi
- **Chart Rendering**: Grafici trending settimanali visualizzati correttamente

---

## [3.0] - 2024-09-16 (VERSIONE FINALE)

### ✅ Nuove Funzionalità
- **Eliminazione Risorse**: Aggiunta possibilità di eliminare risorse con conferma e cascata sui turni
- **Gestione Password**: Sistema completo per cambiare password admin e dipendenti
- **Database SQLite**: Migrazione completa da MySQL a SQLite locale
- **API Password Management**: Endpoint per reset password e gestione credenziali

### 🔧 Miglioramenti
- **Navigazione Admin**: Risolto bug routing che portava alla pubblicazione turni invece della dashboard
- **UI/UX**: Rimossa sezione "Credenziali Demo" dalla pagina login per maggiore sicurezza
- **Reports**: Risolto bug UnboundLocalError nell'endpoint reports overview
- **Autenticazione**: Allineamento case sensitivity ruoli (ADMIN/EMPLOYEE)

### 🗄️ Database
- **Migrazione SQLite**: Completa sostituzione MySQL con SQLite locale
- **Configurazione**: Rimossa dipendenza da server MySQL remoto
- **Performance**: Migliorata velocità query con database locale
- **Persistenza**: Database file `/app/planshift.db` per backup semplificato

### 🔐 Sicurezza
- **Password Configurabili**: Sistema per modificare password dal backend
- **Credenziali Nascoste**: Rimozione demo credentials dalla UI pubblica
- **Ruoli Consistenti**: Fix case sensitivity per ruoli utente
- **Token JWT**: Autenticazione robusta mantenuta

### 🐛 Bug Fix
- **Login Navigation**: Risolto redirect admin→dashboard invece di pubblicazione turni
- **Role Mismatch**: Allineato formato ruoli backend/frontend (ADMIN vs admin)
- **MySQL Connection**: Eliminati errori connessione database remoto
- **Reports Endpoint**: Risolto errore variabile start_of_month
- **Password Verification**: Fix verifica password durante login

### 📦 Deployment
- **Docker Support**: Aggiunto docker-compose.prod.yml per deploy containerizzato
- **Script Avvio**: Creato start.sh per avvio automatico applicazione
- **Documentazione**: DEPLOYMENT_GUIDE.md completo per setup produzione
- **Dockerfiles**: Container separati per backend e frontend

---

## [2.2] - 2024-09-16

### 🔧 Miglioramenti
- **Admin Navigation Fix**: Risolto problema navigazione admin
- **Role System**: Aggiornato sistema ruoli per compatibilità

### 🐛 Bug Fix
- **Frontend Routing**: Fix redirect admin alla dashboard corretta
- **Role Case Sensitivity**: Allineamento maiuscole/minuscole ruoli

---

## [2.1] - 2024-09-16

### 🔧 Miglioramenti
- **MySQL Connection Pool**: Configurazione avanzata pool connessioni
- **Error Handling**: Gestione migliorata errori database

### 🐛 Bug Fix
- **Login Issues**: Risolti problemi login utenti e dipendenti
- **Database Timeouts**: Fix timeout connessioni MySQL

---

## [2.0] - 2024-09-16

### 🗄️ Database Migration
- **MySQL Integration**: Migrazione completa da SQLite a MySQL remoto
- **Production Database**: Configurazione database produzione
- **Connection Management**: Gestione avanzata connessioni database

---

## [1.1] - 2024-09-16

### ✅ Nuove Funzionalità
- **Delete Resources API**: Endpoint DELETE per eliminazione risorse
- **Cascade Delete**: Eliminazione automatica turni associati
- **UI Delete Button**: Pulsante elimina con modal conferma

### 🔧 Miglioramenti
- **Confirmation Modal**: Modal "Sei sicuro?" per eliminazioni
- **User Feedback**: Toast notifications per operazioni

---

## [1.0] - 2024-09-16 (VERSIONE INIZIALE)

### ✅ Funzionalità Base
- **Authentication System**: Login admin e dipendenti
- **Resource Management**: CRUD risorse/dipendenti
- **Shift Planning**: Pianificazione e gestione turni
- **Time Slots**: Gestione fasce orarie
- **Reports & Analytics**: Dashboard statistiche
- **Weekly Plans**: Pianificazione settimanale

### 🛠️ Stack Tecnologico
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS
- **Database**: SQLite (iniziale)
- **Authentication**: JWT Token-based

---

**Legenda:**
- ✅ Nuove Funzionalità
- 🔧 Miglioramenti
- 🐛 Bug Fix
- 🗄️ Database
- 🔐 Sicurezza
- 📦 Deployment