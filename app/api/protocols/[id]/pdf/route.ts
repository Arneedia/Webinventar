import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: PDF-Daten für Protokoll (HTML-Vorlage für Client-Rendering)
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const protocolId = parseInt(id, 10);

    if (isNaN(protocolId)) {
      return NextResponse.json({ error: 'Ungültige Protokoll-ID' }, { status: 400 });
    }

    const protocol = await prisma.uebergabeProtokoll.findUnique({
      where: { ID: protocolId },
      include: {
        Benutzer: {
          include: {
            ABT: true,
            GS: true,
          },
        },
        Ersteller: {
          select: { name: true },
        },
        Positionen: {
          include: {
            GER: {
              include: { HW: true, HS: true, MOD: true },
            },
            Zubehoer: {
              include: { ZT: true, HS: true, MOD: true },
            },
          },
        },
      },
    });

    if (!protocol) {
      return NextResponse.json({ error: 'Protokoll nicht gefunden' }, { status: 404 });
    }

    // Typ-Label
    const typLabels: Record<string, string> = {
      AUSGABE: 'Geräteausgabe',
      RUECKGABE: 'Geräterückgabe',
      TAUSCH: 'Gerätetausch',
    };

    // Zustand-Label
    const zustandLabels: Record<string, string> = {
      NEU: 'Neu',
      GUT: 'Gut',
      GEBRAUCHSSPUREN: 'Gebrauchsspuren',
      BESCHAEDIGT: 'Beschädigt',
    };

    // Formatiere Datum
    const formatDate = (date: Date | null) => {
      if (!date) return '—';
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    // Geräte und Zubehör trennen
    const geraete = protocol.Positionen.filter((p) => p.GER);
    const zubehoer = protocol.Positionen.filter((p) => p.Zubehoer);

    // HTML generieren
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Übergabeprotokoll ${protocol.ProtokollNr}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header .typ {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .meta-box {
      border: 1px solid #ddd;
      padding: 12px;
      background: #fafafa;
    }
    .meta-box h3 {
      margin: 0 0 10px 0;
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .meta-row {
      display: flex;
      margin-bottom: 4px;
    }
    .meta-label {
      width: 100px;
      color: #666;
    }
    .meta-value {
      flex: 1;
      font-weight: 500;
    }
    .section {
      margin-bottom: 20px;
    }
    .section h2 {
      font-size: 12px;
      text-transform: uppercase;
      color: #333;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
      margin: 0 0 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 6px;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 9px;
    }
    .bemerkung {
      border: 1px solid #ddd;
      padding: 12px;
      min-height: 60px;
      background: #fafafa;
      white-space: pre-wrap;
    }
    .unterschriften {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
    }
    .unterschrift-box {
      border: 1px solid #ddd;
      padding: 15px;
    }
    .unterschrift-box h4 {
      margin: 0 0 10px 0;
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
    }
    .unterschrift-linie {
      border-bottom: 1px solid #333;
      height: 60px;
      margin-bottom: 5px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .unterschrift-linie img {
      max-height: 55px;
      max-width: 100%;
    }
    .unterschrift-label {
      font-size: 9px;
      color: #666;
      text-align: center;
    }
    .hinweis {
      margin-top: 20px;
      padding: 12px;
      border: 1px solid #ddd;
      background: #fafafa;
      font-size: 9px;
      color: #666;
    }
    .zustand-neu { color: #059669; }
    .zustand-gut { color: #059669; }
    .zustand-gebrauchsspuren { color: #d97706; }
    .zustand-beschaedigt { color: #dc2626; }
    .vollstaendig-ja { color: #059669; }
    .vollstaendig-nein { color: #dc2626; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Übergabeprotokoll</h1>
    <div class="typ">${typLabels[protocol.Typ] || protocol.Typ}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <h3>Protokoll-Informationen</h3>
      <div class="meta-row">
        <span class="meta-label">Protokoll-Nr:</span>
        <span class="meta-value">${protocol.ProtokollNr}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Datum:</span>
        <span class="meta-value">${formatDate(protocol.ErstelltAm)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Erstellt von:</span>
        <span class="meta-value">${protocol.Ersteller.name || 'IT-Abteilung'}</span>
      </div>
    </div>

    <div class="meta-box">
      <h3>Mitarbeiter</h3>
      <div class="meta-row">
        <span class="meta-label">Name:</span>
        <span class="meta-value">${protocol.Benutzer.BenutzerName || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Abteilung:</span>
        <span class="meta-value">${protocol.Benutzer.ABT?.ABTName || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Standort:</span>
        <span class="meta-value">${protocol.Benutzer.GS?.GSName || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Raum:</span>
        <span class="meta-value">${protocol.Benutzer.BenutzerRaum || '—'}</span>
      </div>
    </div>
  </div>

  ${
    geraete.length > 0
      ? `
  <div class="section">
    <h2>Geräte</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 15%">Inventar-Nr.</th>
          <th style="width: 30%">Bezeichnung</th>
          <th style="width: 20%">Seriennummer</th>
          <th style="width: 15%">Zustand</th>
          <th style="width: 10%">Vollständig</th>
          <th style="width: 10%">Fehlend</th>
        </tr>
      </thead>
      <tbody>
        ${geraete
          .map(
            (pos) => `
          <tr>
            <td><strong>${pos.GER!.InventarCode}</strong></td>
            <td>${[pos.GER!.HW?.HWName, pos.GER!.HS?.HSName, pos.GER!.MOD?.ModName].filter(Boolean).join(' ')}</td>
            <td>${pos.GER!.SNO}</td>
            <td class="zustand-${pos.Zustand.toLowerCase()}">${zustandLabels[pos.Zustand] || pos.Zustand}</td>
            <td class="${pos.Vollstaendig ? 'vollstaendig-ja' : 'vollstaendig-nein'}">${pos.Vollstaendig ? 'Ja' : 'Nein'}</td>
            <td>${pos.FehlendTeile || '—'}</td>
          </tr>
          ${pos.ZustandNotiz ? `<tr><td colspan="6" style="font-size: 9px; color: #666;">Notiz: ${pos.ZustandNotiz}</td></tr>` : ''}
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  ${
    zubehoer.length > 0
      ? `
  <div class="section">
    <h2>Zubehör</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 25%">Typ</th>
          <th style="width: 25%">Hersteller / Modell</th>
          <th style="width: 30%">Beschreibung</th>
          <th style="width: 20%">Zustand</th>
        </tr>
      </thead>
      <tbody>
        ${zubehoer
          .map(
            (pos) => `
          <tr>
            <td>${pos.Zubehoer!.ZT?.ZTName || '—'}</td>
            <td>${[pos.Zubehoer!.HS?.HSName, pos.Zubehoer!.MOD?.ModName].filter(Boolean).join(' ') || '—'}</td>
            <td>${pos.Zubehoer!.Beschreibung || '—'}</td>
            <td class="zustand-${pos.Zustand.toLowerCase()}">${zustandLabels[pos.Zustand] || pos.Zustand}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  ${
    protocol.Bemerkung
      ? `
  <div class="section">
    <h2>Bemerkungen</h2>
    <div class="bemerkung">${protocol.Bemerkung}</div>
  </div>
  `
      : ''
  }

  <div class="hinweis">
    ${
      protocol.Typ === 'AUSGABE'
        ? `Mit meiner Unterschrift bestätige ich den Erhalt der oben aufgeführten Geräte und Zubehörteile. 
Ich verpflichte mich zur sorgfältigen Behandlung und Aufbewahrung der Gegenstände. 
Schäden oder Verlust sind unverzüglich der IT-Abteilung zu melden.`
        : `Mit meiner Unterschrift bestätige ich die Rückgabe der oben aufgeführten Geräte und Zubehörteile. 
Der dokumentierte Zustand wurde gemeinsam festgestellt.`
    }
  </div>

  <div class="unterschriften">
    <div class="unterschrift-box">
      <h4>Mitarbeiter/in</h4>
      <div class="unterschrift-linie">
        ${protocol.UnterschriftMitarbeiter ? `<img src="${protocol.UnterschriftMitarbeiter}" alt="Unterschrift Mitarbeiter">` : ''}
      </div>
      <div class="unterschrift-label">
        ${protocol.Benutzer.BenutzerName || 'Name'}<br>
        Datum: ${protocol.UnterschriftDatum ? formatDate(protocol.UnterschriftDatum) : '_____________'}
      </div>
    </div>

    <div class="unterschrift-box">
      <h4>IT-Abteilung</h4>
      <div class="unterschrift-linie">
        ${protocol.UnterschriftIT ? `<img src="${protocol.UnterschriftIT}" alt="Unterschrift IT">` : ''}
      </div>
      <div class="unterschrift-label">
        ${protocol.Ersteller.name || 'IT-Mitarbeiter'}<br>
        Datum: ${protocol.UnterschriftDatum ? formatDate(protocol.UnterschriftDatum) : '_____________'}
      </div>
    </div>
  </div>
</body>
</html>
`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating PDF data:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der PDF-Daten' }, { status: 500 });
  }
}
