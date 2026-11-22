#!/usr/bin/env python3
"""
Trägt den Dateityp .jahrmarkt in das Info.plist der SCHULVERSION ein (aufgerufen vom Workflow „iOS TestFlight Schule“).
Danach bietet iOS bei AirDrop und „Öffnen mit …“ die App an; iOS legt eine Kopie in den Posteingang der App,
die App liest sie (src/schule/app/dateiOeffnen.ts) und löscht sie wieder. Die Familien-App bleibt unverändert.

    python3 ios-schule/dokumenttyp.py ios/App/App/Info.plist
"""
import plistlib
import sys

UTI = 'de.maehlmann.mathejahrmarkt.schule.datei'

pfad = sys.argv[1]
with open(pfad, 'rb') as f:
    p = plistlib.load(f)

p['CFBundleDocumentTypes'] = [
    {
        'CFBundleTypeName': 'Jahrmarkt-Datei',
        'LSHandlerRank': 'Owner',
        'LSItemContentTypes': [UTI],
    }
]
p['UTExportedTypeDeclarations'] = [
    {
        'UTTypeIdentifier': UTI,
        'UTTypeDescription': 'Jahrmarkt-Datei',
        'UTTypeConformsTo': ['public.data'],
        'UTTypeTagSpecification': {'public.filename-extension': ['jahrmarkt']},
    }
]
# Kopie in den Posteingang statt Bearbeiten am Ursprungsort
p['LSSupportsOpeningDocumentsInPlace'] = False

with open(pfad, 'wb') as f:
    plistlib.dump(p, f)
print('Dokumenttyp .jahrmarkt eingetragen')
