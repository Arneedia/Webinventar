# Deployment auf Ubuntu Server

## Voraussetzungen

- Node.js (v18 oder höher)
- PostgreSQL Datenbank
- npm oder yarn

## Schritt-für-Schritt Anleitung

### 1. Umgebungsvariablen konfigurieren

Erstelle eine `.env.local` oder `.env` Datei im Root-Verzeichnis:

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/webinventar?schema=public"
NODE_ENV="production"
```

**WICHTIG:** Die `.env.local` Datei wird von Next.js automatisch geladen, auch in Production!

### 2. Datenbank vorbereiten

```bash
# Prisma Client generieren
npx prisma generate

# Datenbank-Schema migrieren (falls noch nicht geschehen)
npx prisma db push

# Optional: Seed-Daten einfügen
npm run seed

# WICHTIG: Teste die Datenbankverbindung
tsx scripts/test-db-connection.ts
```

**Wenn der Test fehlschlägt:**
- Überprüfe die `DATABASE_URL` in `.env.local`
- Stelle sicher, dass PostgreSQL läuft
- Prüfe die Netzwerkverbindung zur Datenbank

### 3. Build erstellen

```bash
npm run build
```

### 4. Production-Server starten

```bash
npm start
```

Der Server läuft standardmäßig auf Port 3000.

## Troubleshooting

### Problem: "Cannot find module '.prisma/client/default'"

**Lösung:**
```bash
npx prisma generate
npm run build
```

### Problem: "DATABASE_URL oder POSTGRES_URL muss gesetzt sein"

**Lösung:**
- Stelle sicher, dass die `.env.local` Datei existiert und die `DATABASE_URL` enthält
- Überprüfe die Logs beim Start: `[Prisma] Initialisiere Prisma Client...`
- Die Datei muss im Root-Verzeichnis liegen (dort wo auch `package.json` ist)

### Problem: Datenbankverbindung schlägt fehl

**Lösung:**
- Überprüfe die PostgreSQL-Verbindung: `psql -U user -d webinventar`
- Stelle sicher, dass PostgreSQL läuft: `sudo systemctl status postgresql`
- Prüfe die Firewall-Einstellungen
- Für lokale Verbindungen: SSL deaktivieren in der Connection-String: `?sslmode=disable`

### Problem: 401 Unauthorized bei allen API-Anfragen

**Diagnose:**
```bash
# 1. Teste die Datenbankverbindung
tsx scripts/test-db-connection.ts

# 2. Überprüfe die Logs beim Start
npm start

# Erwartete Logs:
# [Prisma] Initialisiere Prisma Client... { nodeEnv: 'production', hasPostgresUrl: true, urlType: 'PostgreSQL' }
# [Prisma] Verwende PostgreSQL-Adapter
```

**Mögliche Ursachen:**
1. **Prisma Client nicht generiert** → `npx prisma generate`
2. **Datenbankverbindung fehlgeschlagen** → Siehe Logs `[Auth] Fehler beim Laden der Session`
3. **Session-Cookie nicht gesetzt** → Browser-DevTools → Application → Cookies
4. **Umgebungsvariablen nicht geladen** → `.env.local` muss existieren

**Debug-Logs aktiviert:**
Die Anwendung gibt jetzt detaillierte Debug-Informationen aus:

```
[Prisma] Initialisiere Prisma Client... { nodeEnv: 'production', hasPostgresUrl: true, urlType: 'PostgreSQL' }
[Prisma] Verwende PostgreSQL-Adapter
[Auth] getCurrentUserFromRequest - Token vorhanden: true
[Auth] Session gefunden: true
[Auth] loadUserWithPermissions für userId: 1
[Auth] User gefunden: admin@example.com Rolle: ADMIN
[Auth] User geladen: true admin@example.com
```

Wenn du `[Auth] Fehler beim Laden der Session` siehst, ist die Datenbankverbindung das Problem.

## Production mit PM2 (empfohlen)

Für einen stabilen Production-Betrieb empfiehlt sich PM2:

```bash
# PM2 installieren
npm install -g pm2

# App starten
pm2 start npm --name "webinventar" -- start

# Auto-Start beim Systemstart
pm2 startup
pm2 save

# Logs anzeigen
pm2 logs webinventar

# App neustarten
pm2 restart webinventar
```

## Nginx Reverse Proxy (optional)

Beispiel-Konfiguration für Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
