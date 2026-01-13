# Ubuntu Server - Schnelle Fehlerbehebung für 401 Unauthorized

## Problem
Nach `npm run build` und `npm start` bekommst du 401 Unauthorized bei allen API-Anfragen.

## Lösung: Schritt für Schritt

### 1. Stoppe den Server
```bash
# Strg+C oder
pkill -f "next start"
```

### 2. Überprüfe Umgebungsvariablen
```bash
# Erstelle/Bearbeite .env.local im Projekt-Root
nano .env.local
```

Inhalt (anpassen an deine Datenbank):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/webinventar?schema=public"
NODE_ENV="production"
```

**WICHTIG:** Ersetze `user`, `password` und ggf. `localhost:5432` mit deinen echten Werten!

### 3. Teste die Datenbankverbindung
```bash
# Teste ob die Verbindung funktioniert
tsx scripts/test-db-connection.ts
```

**Erwartete Ausgabe:**
```
=== Datenbankverbindung testen ===

Umgebungsvariablen:
- NODE_ENV: production
- DATABASE_URL vorhanden: true
- POSTGRES_URL vorhanden: false

1. Teste Prisma-Verbindung...
✓ Prisma verbunden

2. Teste einfache Query (WebUser count)...
✓ Anzahl WebUser: 1

3. Teste Session-Query...
✓ Anzahl Sessions: 0

4. Teste komplexe Query (User mit Permissions)...
✓ Erste User geladen: admin@example.com

=== ALLE TESTS ERFOLGREICH ===
```

### 4. Wenn Test fehlschlägt

**Fehler: "Cannot connect to database"**
```bash
# Prüfe ob PostgreSQL läuft
sudo systemctl status postgresql

# Falls nicht, starte es
sudo systemctl start postgresql

# Teste manuelle Verbindung
psql -U user -d webinventar
```

**Fehler: "DATABASE_URL muss gesetzt sein"**
```bash
# Prüfe ob .env.local existiert
ls -la .env.local

# Prüfe Inhalt
cat .env.local

# Stelle sicher, dass die Datei im richtigen Verzeichnis ist (dort wo package.json liegt)
pwd
ls -la package.json
```

### 5. Neu bauen und starten
```bash
# Prisma Client neu generieren
npx prisma generate

# Neu bauen
npm run build

# WICHTIG: Verwende start:prod statt start (lädt .env.local)
npm run start:prod
```

**Warum `start:prod` statt `start`?**
- `npm start` lädt `.env.local` NICHT automatisch in Production
- `npm run start:prod` lädt `.env.local` explizit mit dotenv

### 6. Überprüfe die Logs

Du solltest diese Ausgaben sehen:
```
[Prisma] Initialisiere Prisma Client... { nodeEnv: 'production', hasPostgresUrl: true, urlType: 'PostgreSQL' }
[Prisma] Verwende PostgreSQL-Adapter
```

Wenn du dich anmeldest, solltest du sehen:
```
[Auth] getCurrentUserFromRequest - Token vorhanden: true
[Auth] Session gefunden: true
[Auth] loadUserWithPermissions für userId: 1
[Auth] User gefunden: admin@example.com Rolle: ADMIN
```

### 7. Teste im Browser

1. Öffne `http://deine-server-ip:3000/login`
2. Melde dich an
3. Öffne Browser DevTools (F12) → Console
4. Wenn du 401 siehst, schau in die Server-Logs

## Häufige Fehlerquellen

### ❌ .env.local existiert nicht
```bash
# Erstelle sie:
touch .env.local
nano .env.local
```

### ❌ DATABASE_URL ist falsch
```bash
# Teste die Verbindung manuell:
psql "postgresql://user:password@localhost:5432/webinventar"
```

### ❌ Prisma Client nicht generiert
```bash
npx prisma generate
```

### ❌ PostgreSQL läuft nicht
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start beim Boot
```

### ❌ Firewall blockiert Port 5432
```bash
sudo ufw allow 5432/tcp
```

## Für Production: PM2 verwenden

```bash
# PM2 installieren
npm install -g pm2

# App mit PM2 starten (mit .env.local Support)
pm2 start npm --name "webinventar" -- run start:prod

# Logs anzeigen
pm2 logs webinventar

# Auto-Start beim Systemstart
pm2 startup
pm2 save

# Status prüfen
pm2 status
```

## Noch Probleme?

Sende mir die Ausgabe von:
```bash
# 1. Test-Script
tsx scripts/test-db-connection.ts

# 2. Server-Logs (erste 50 Zeilen)
npm start 2>&1 | head -50

# 3. Umgebungsvariablen (ohne Passwort!)
echo "DATABASE_URL vorhanden: $([ -n "$DATABASE_URL" ] && echo 'ja' || echo 'nein')"
cat .env.local | grep -v password
```
