# Bambu Printer Profiles

## How to Export Profiles from Bambu Studio

1. Open Bambu Studio
2. Select your printer (P1S, A1, or A1 Mini)
3. Configure settings:
   - Material: PLA/ABS/PETG/TPU
   - Layer height: 0.2mm (standard)
   - Infill: 20%
   - Support: Auto
4. Go to File → Export → Export Config
5. Save as:
   - `p1s.ini` for Bambu P1S
   - `a1.ini` for Bambu A1
   - `a1mini.ini` for Bambu A1 Mini
6. Replace the placeholder files in this directory

## Profile Requirements

- Use **OrcaSlicer-compatible** config format
- Include all required fields:
  - Printer dimensions
  - Nozzle settings
  - Material profiles (PLA, ABS, PETG, TPU)
  - Speed settings
  - Temperature settings

## Testing

After adding profiles, test with:
```bash
orca-slicer --load config/p1s.ini --export-gcode test.stl --output test.gcode
```
