import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function exportSchema() {
  console.log('=== Exportiere Prisma Schema als SQL ===\n');

  // Erstelle exports Ordner
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputFile = path.join(exportsDir, `schema_${timestamp}.sql`);

  try {
    console.log('1. Generiere SQL aus prisma/schema.prisma...');
    
    // Nutze Prisma migrate diff um SQL zu generieren (neue Syntax)
    const sql = execSync(
      'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script',
      { encoding: 'utf-8' }
    );

    // Schreibe SQL in Datei
    fs.writeFileSync(outputFile, sql);

    console.log('\n✅ Export erfolgreich!');
    console.log(`\nDatei erstellt: ${outputFile}`);
    console.log(`Größe: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
    
    // Zeige erste Zeilen
    const lines = sql.split('\n').slice(0, 10);
    console.log('\nErste Zeilen der SQL-Datei:');
    console.log('---');
    lines.forEach(line => console.log(line));
    console.log('...\n');

  } catch (error) {
    console.error('❌ Fehler beim Export:', error);
    process.exit(1);
  }
}

exportSchema();
