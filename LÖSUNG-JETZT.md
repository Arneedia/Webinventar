# ✅ SOFORT-LÖSUNG für dein Problem

## Was du gerade siehst:
```
[Auth] Token vorhanden: true
[Auth] Session gefunden: false  ← DAS IST DAS PROBLEM!
```

## Was das bedeutet:
- ✅ Datenbankverbindung funktioniert
- ✅ Server läuft mit `npm run start:prod`
- ❌ **Die Session im Browser-Cookie existiert nicht mehr in der Datenbank**

## Warum?
Mögliche Gründe:
1. Datenbank wurde zurückgesetzt, aber Browser hat noch alte Cookies
2. Sessions sind abgelaufen (nach 7 Tagen)
3. Session-Tabelle wurde geleert

## LÖSUNG (3 einfache Schritte):

### Schritt 1: Lösche alte Sessions (auf dem Server)
```bash
tsx scripts/cleanup-sessions.ts
```

### Schritt 2: Lösche Browser-Cookies
**Im Browser (Chrome/Firefox/Edge):**
1. Drücke `F12` (DevTools öffnen)
2. Gehe zu **Application** (Chrome) oder **Storage** (Firefox)
3. Klicke auf **Cookies** → `http://192.168.8.177:3000`
4. Lösche den Cookie namens **"session"**
5. Schließe DevTools

**ODER einfach:**
- Öffne ein **Inkognito/Privates Fenster**

### Schritt 3: Neu anmelden
1. Gehe zu `http://192.168.8.177:3000/login`
2. Melde dich an
3. ✅ Fertig!

## Erwartete Logs nach Neuanmeldung:
```
[Auth] getCurrentUserFromRequest - Token vorhanden: true
[Auth] Sessions in DB - Total: 1, Gültig: 1
[Auth] Session gefunden! UserId: 1, Expires: 2026-01-20...
[Auth] loadUserWithPermissions für userId: 1
[Auth] User gefunden: admin@example.com Rolle: ADMIN
[Auth] User geladen: true admin@example.com
```

## Alternative: Alle Sessions löschen (Nuclear Option)

Wenn du einfach alle Sessions löschen willst:

```bash
# Auf dem Ubuntu Server:
psql -U user -d webinventar -c "DELETE FROM \"Session\";"
```

Dann müssen sich alle Benutzer neu anmelden.

## Problem: "Cookie wurde abgelehnt - Nicht-HTTPS-Cookie kann nicht als secure gesetzt werden"

**Ursache:** Der Server läuft mit HTTP (nicht HTTPS), aber Next.js versucht das Cookie als `secure` zu setzen.

**Lösung:** Code wurde bereits gefixt! Einfach neu bauen:

```bash
# Auf dem Ubuntu Server:
npm run build
npm run start:prod
```

Jetzt funktioniert das Cookie auch über HTTP!

**Für HTTPS (später mit Nginx/Reverse Proxy):**
Setze in `.env.local`:
```
FORCE_SECURE_COOKIES="true"
```

## Zusammenfassung

**Problem 1:** Browser-Cookie zeigt auf nicht-existente Session in DB
**Lösung:** Cookie löschen + neu anmelden

**Problem 2:** Cookie wird abgelehnt wegen "secure" Flag bei HTTP
**Lösung:** Code gefixt - secure nur bei HTTPS/Vercel

**Dauer:** 2 Minuten (neu bauen + anmelden)

Das ist ein **normales Problem** nach einem DB-Reset oder wenn Sessions ablaufen!
