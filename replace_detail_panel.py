#!/usr/bin/env python3
import re

# Datei lesen
with open('app/bueroinventar/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Altes Detail-Panel finden und ersetzen
old_panel_start = '      {/* Detail-Panel (rechts) */}\n      {selectedItem && ('
old_panel_end = '      )}\n    </div>\n  );\n}'

# Finde den Start
start_idx = content.find(old_panel_start)
if start_idx == -1:
    print("Start nicht gefunden!")
    exit(1)

# Finde das Ende (nach dem Start)
end_idx = content.find(old_panel_end, start_idx)
if end_idx == -1:
    print("Ende nicht gefunden!")
    exit(1)

# Extrahiere den Block
old_block = content[start_idx:end_idx + len('      )}')]

# Neuer Block
new_block = '''      {/* Detail-Panel (rechts) */}
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
      )}'''

# Ersetzen
new_content = content.replace(old_block, new_block)

# Schreiben
with open('app/bueroinventar/page.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(new_content)

print("Erfolgreich ersetzt!")
