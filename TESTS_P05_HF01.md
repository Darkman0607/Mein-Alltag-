# P05-HF01 – Prüfprotokoll (15.11.2026)

| Prüfung | Ergebnis |
|---|---|
| `node test-p01-data.mjs` | PASS – Timer, Lagerbuchung, Rollback, Idempotenz |
| `node test-p02-data.mjs` | PASS – Räume, Material-Schnellauswahl |
| `node test-p03-data.mjs` | PASS – Bereichs-Häkchen, Fehlerbehandlung |
| `node test-p04-data.mjs` | PASS – Rücksetzen und Transaktionen |
| `node test-p05-data.mjs` | PASS – Intervallregeln und Altprotokolle |
| `node test-p05-hf01.mjs` | PASS – Soforthäkchen, Persistenz, Fälligkeit, Undo, Teilschritte, Lagerunabhängigkeit |
| `node test-lux07-delete.mjs` | PASS – Artikel-Löschung ohne Fremddatenverlust |
| `node test-startup-import.mjs` | PASS – ESM-Einstiegspunkte |
| `node --check` für geänderte JS-Dateien | PASS – Syntax |
| Chromium UI `test-p05-mobile.py` | BLOCKIERT: ERR_BLOCKED_BY_ADMINISTRATOR (keine Aussage über App-Funktion) |
| Android- / GitHub-Pages-Praxistest | OFFEN – nur auf echtem Gerät verifizierbar |

**Datenhinweise:** `cleaning.sessions.v1` bleibt kompatibel und wird um `taskEvents` und `quickSteps` ergänzt; `cleaning.schedule.v1` wird nicht verändert. Ohne abgeschlossene Sitzung entstehen keine Lagerbuchungen.
