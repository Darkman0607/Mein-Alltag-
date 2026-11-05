# BW14 – Fünf letzte Anime-Frauen-Motive (Mein Alltag 0.25.5)

## Neu
- Die vorhandenen fünf Karten **#021 Serena Nachthafen**, **#022 Iris Lichtwächterin**, **#023 Veyla Himmelsrose**, **#024 Maela Sternenkrone**, **#025 Astra Morgenstern** haben jeweils ein neues individuelles WebP-Porträt.
- Gesamter Frauenkarten-Pool: **25 von 25 Motiven**. Die anderen 75 Karten (Anime-Tiere, Maschinen, Monster) bleiben unverändert.
- Porträts im Querformat-Rahmen? Nein: alle neuen Bilder sind optimierte **360×450 px, 4:5**, ohne Beschriftung im Bild. UI zeigt Nummer, Name, Seltenheit und Sammlungsstatus getrennt.
- Standardbilder: `assets/card-art/anime-frauen/021.webp` bis `025.webp`, mit sicherer Bildauflösung für Album, Details, Shop und Booster.

## Datenschutz / bisherige Daten
- Keine Änderung am Kartendatenmodell oder der IndexedDB. IDs, Namen, Seltenheiten, Favoriten, Exemplare, Booster und Guthaben bleiben unverändert.
- Selbst importierte Bilder (`imageData`) werden nicht ersetzt.
- Keine neuen Sammelplätze, Münzen oder Kartenexemplare.

## Installation und Test
1. Vorher in der App ein Backup erstellen und außerhalb des Geräts aufbewahren.
2. `Mehr → Auf Updates prüfen`, dann die App vollständig schließen und erneut öffnen; Version muss **0.25.5** anzeigen.
3. `Belohnungswelt → Album → Anime-Frauen`, ans Ende scrollen: #021–#025 haben unterschiedliche Bilder.
4. Eine Karte öffnen, Name, Nummer, Seltenheit und eigenen Besitzstand kontrollieren.
5. Kostenlosen Booster-Effekt bzw. einen bereits gekauften Booster testen und prüfen, ob Porträts korrekt erscheinen.
6. Für den Offline-Test Flugmodus aktivieren, App neu öffnen, die fünf Motive prüfen und Flugmodus wieder abschalten.

**Wichtig:** Nicht deinstallieren und keine App-/Browserdaten löschen. Das würde unter Umständen lokale App-Daten entfernen.

## Veröffentlichung
- GitHub main (Programm-Commit): `d41a8825e9655f0017000d3236ae4b713e8f8f98`
- GitHub Pages Run: `42057688699` – erfolgreich.
- Echte Android-PWA-Abnahme steht weiterhin aus.
