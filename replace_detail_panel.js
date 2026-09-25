const fs = require('fs');

// Datei lesen
const content = fs.readFileSync('app/bueroinventar/page.tsx', 'utf8');

// Finde den Start des Detail-Panels
const startMarker = '      {/* Detail-Panel (rechts) */}';
const startIdx = content.indexOf(startMarker);

if (startIdx === -1) {
  console.error('Start nicht gefunden!');
  process.exit(1);
}

// Finde das Ende - suche nach dem schließenden div und )}
const searchFrom = startIdx + 1000; // Starte die Suche nach mindestens 1000 Zeichen
const endMarker = '      )}';
const endIdx = content.lastIndexOf(endMarker);

if (endIdx === -1) {
  console.error('Ende nicht gefunden!');
  process.exit(1);
}

// Extrahiere den alten Block
const oldBlock = content.substring(startIdx, endIdx + endMarker.length);

// Neuer Block
const newBlock = `      {/* Detail-Panel (rechts) */}
      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          categories={categories}
          users={users}
          rooms={rooms}
          manufacturers={manufacturers}
          models={models}
          onClose={() => setSelectedItemId(null)}
          onSave={() => {
            loadItems();
            loadManufacturers();
            loadAllModels();
          }}
        />
      )}`;

// Ersetzen
const newContent = content.replace(oldBlock, newBlock);

// Schreiben
fs.writeFileSync('app/bueroinventar/page.tsx', newContent, 'utf8');

console.log('Erfolgreich ersetzt!');
console.log(`Alter Block: ${oldBlock.length} Zeichen`);
console.log(`Neuer Block: ${newBlock.length} Zeichen`);
