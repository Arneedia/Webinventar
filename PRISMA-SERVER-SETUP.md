# Prisma auf Ubuntu Server einrichten

## Was du bereits hast

✅ **PostgreSQL-Datenbank** läuft bereits  
✅ **Prisma Client** ist in deiner Next.js-App integriert  
✅ **API-Routen** unter `/api/*` nutzen bereits Prisma  

**Deine Next.js-App IST bereits der Prisma-Server!** Alle API-Routen (`/api/devices`, `/api/tables`, etc.) greifen auf die Datenbank zu.

## Option 1: Prisma Studio (Datenbank-GUI)

Prisma Studio ist eine Web-Oberfläche zum Verwalten der Datenbank.

### Starten auf dem Ubuntu Server:

```bash
# Einfach starten (nur localhost)
npm run studio

# ODER: Mit Netzwerk-Zugriff (von anderen Geräten erreichbar)
npx prisma studio --port 5555 --browser none --hostname 0.0.0.0
```

### Zugriff:
- **Lokal:** `http://localhost:5555`
- **Im Netzwerk:** `http://192.168.8.177:5555`

### Mit PM2 dauerhaft laufen lassen:

```bash
# Prisma Studio als Service
pm2 start npm --name "prisma-studio" -- run studio

# Logs anzeigen
pm2 logs prisma-studio

# Auto-Start
pm2 save
```

### Firewall öffnen (falls nötig):

```bash
sudo ufw allow 5555/tcp
```

---

## Option 2: Deine API ist bereits der Prisma-Server

Deine Next.js-App unter `http://192.168.8.177:3000` bietet bereits eine vollständige API:

### Verfügbare API-Endpunkte:

```bash
# Geräte
GET    /api/devices              # Alle Geräte
GET    /api/devices/[id]         # Ein Gerät
POST   /api/devices              # Gerät erstellen
PUT    /api/devices/[id]         # Gerät aktualisieren
DELETE /api/devices/[id]         # Gerät löschen

# Tabellen (generisch für alle Stammdaten)
GET    /api/tables               # Liste aller Tabellen
GET    /api/tables/[table]       # Daten einer Tabelle
POST   /api/tables/[table]       # Eintrag erstellen
PUT    /api/tables/[table]/[id]  # Eintrag aktualisieren
DELETE /api/tables/[table]/[id]  # Eintrag löschen

# Benutzer
GET    /api/inventory-users      # Alle Inventar-Benutzer
POST   /api/inventory-users      # Benutzer erstellen
PUT    /api/inventory-users/[id] # Benutzer aktualisieren
DELETE /api/inventory-users/[id] # Benutzer löschen

# Räume
GET    /api/rooms                # Alle Räume
GET    /api/rooms/with-users     # Räume mit zugewiesenen Benutzern
POST   /api/rooms                # Raum erstellen
PUT    /api/rooms/[id]           # Raum aktualisieren
DELETE /api/rooms/[id]           # Raum löschen

# Zubehör
GET    /api/accessories/available  # Verfügbares Zubehör
GET    /api/accessories/overview   # Zubehör-Übersicht

# Protokolle
GET    /api/protocols            # Alle Übergabeprotokolle
GET    /api/protocols/[id]       # Ein Protokoll
POST   /api/protocols            # Protokoll erstellen
PUT    /api/protocols/[id]       # Protokoll aktualisieren
POST   /api/protocols/[id]/sign  # Protokoll unterschreiben
GET    /api/protocols/[id]/pdf   # Protokoll als PDF

# Berichte
GET    /api/reports              # Alle Berichte
POST   /api/reports              # Bericht erstellen
GET    /api/reports/[id]/run     # Bericht ausführen
POST   /api/reports/[id]/export  # Bericht exportieren
```

### API von anderen Anwendungen nutzen:

```javascript
// Beispiel: Geräte abrufen
const response = await fetch('http://192.168.8.177:3000/api/devices', {
  headers: {
    'Cookie': 'session=YOUR_SESSION_TOKEN'
  }
});
const devices = await response.json();
```

**Wichtig:** Die API benötigt Authentifizierung! Du musst dich zuerst anmelden:

```javascript
// 1. Login
const loginResponse = await fetch('http://192.168.8.177:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'dein-passwort'
  })
});

// 2. Session-Cookie wird automatisch gesetzt
// 3. Weitere Anfragen mit diesem Cookie
```

---

## Option 3: Separater Prisma-Server (falls gewünscht)

Wenn du einen **separaten** API-Server nur für Prisma brauchst (z.B. für andere Apps):

### 1. Erstelle ein neues Projekt:

```bash
mkdir ~/prisma-api-server
cd ~/prisma-api-server
npm init -y
npm install @prisma/client express cors dotenv
npm install -D prisma typescript @types/node @types/express tsx
```

### 2. Kopiere das Prisma-Schema:

```bash
# Kopiere von deinem Webinventar-Projekt
cp ~/Webinventar/prisma/schema.prisma ./prisma/
cp ~/Webinventar/.env.local ./.env
```

### 3. Erstelle einen einfachen API-Server:

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Beispiel-Route: Alle Geräte
app.get('/devices', async (req, res) => {
  const devices = await prisma.gER.findMany({
    include: {
      HW: true,
      HS: true,
      MOD: true
    }
  });
  res.json(devices);
});

// Weitere Routen...

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Prisma API Server läuft auf Port ${PORT}`);
});
```

### 4. Starten:

```bash
npx tsx server.ts
```

---

## Empfehlung

**Nutze deine bestehende Next.js-App als API-Server!**

Vorteile:
- ✅ Bereits fertig und läuft
- ✅ Authentifizierung eingebaut
- ✅ Alle CRUD-Operationen verfügbar
- ✅ Keine zusätzliche Wartung

Du brauchst **keinen separaten Prisma-Server**, außer du willst:
- Eine öffentliche API ohne Web-Interface
- Mehrere Apps auf dieselbe Datenbank zugreifen lassen
- Microservices-Architektur

---

## Zusammenfassung

### Für Datenbank-Verwaltung:
```bash
npm run studio
# → http://192.168.8.177:5555
```

### Für API-Zugriff:
```bash
# Deine Next.js-App ist bereits die API!
# → http://192.168.8.177:3000/api/*
```

### Für direkten Datenbank-Zugriff:
```bash
# PostgreSQL-Konsole
psql -U user -d webinventar

# Oder Prisma CLI
npx prisma db pull   # Schema aus DB holen
npx prisma db push   # Schema in DB pushen
```

Welche Option brauchst du genau?
