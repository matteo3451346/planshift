#!/usr/bin/env python3
"""
Script per aggiornare le password nel database SQLite
Esegui questo script per cambiare le password di utenti esistenti
"""

import sqlite3
import hashlib
import sys
from pathlib import Path

def hash_password(password: str) -> str:
    """Hash password usando SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def update_passwords():
    """Aggiorna le password nel database"""
    
    # Path al database SQLite
    db_path = "/app/planshift.db"
    
    if not Path(db_path).exists():
        print(f"❌ Database non trovato: {db_path}")
        sys.exit(1)
    
    # 🔐 CONFIGURA LE NUOVE PASSWORD QUI
    ADMIN_PASSWORD = "NUOVA_PASSWORD_ADMIN"      # Cambia questa password admin
    EMPLOYEE_PASSWORD = "NUOVA_PASSWORD_DIPENDENTI"  # Cambia questa password dipendenti
    
    try:
        # Connetti al database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Aggiorna password admin
        admin_hash = hash_password(ADMIN_PASSWORD)
        cursor.execute("""
            UPDATE users 
            SET password = ? 
            WHERE role = 'ADMIN'
        """, (admin_hash,))
        admin_updated = cursor.rowcount
        
        # Aggiorna password dipendenti
        employee_hash = hash_password(EMPLOYEE_PASSWORD)
        cursor.execute("""
            UPDATE users 
            SET password = ? 
            WHERE role = 'EMPLOYEE'
        """, (employee_hash,))
        employees_updated = cursor.rowcount
        
        # Salva modifiche
        conn.commit()
        conn.close()
        
        print("✅ PASSWORD AGGIORNATE CON SUCCESSO!")
        print(f"   📊 Admin aggiornati: {admin_updated}")
        print(f"   📊 Dipendenti aggiornati: {employees_updated}")
        print(f"   🔐 Password admin: {ADMIN_PASSWORD}")
        print(f"   🔐 Password dipendenti: {EMPLOYEE_PASSWORD}")
        print()
        print("🔄 RIAVVIA IL BACKEND per applicare le modifiche:")
        print("   sudo supervisorctl restart backend")
        
    except Exception as e:
        print(f"❌ Errore nell'aggiornamento: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔐 SCRIPT AGGIORNAMENTO PASSWORD")
    print("=" * 50)
    
    # Chiedi conferma
    confirm = input("Vuoi aggiornare le password nel database? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Operazione annullata")
        sys.exit(0)
    
    update_passwords()