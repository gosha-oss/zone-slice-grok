#!/usr/bin/env python3
"""Rebuild plates/index.json from filenames."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
plates = root / "plates"
index = {}
for path in sorted(plates.glob("*.jpg")):
    parts = path.stem.split("__")
    if len(parts) < 3:
        continue
    index["|".join(parts)] = f"plates/{path.name}"
out = plates / "index.json"
out.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(index)} plates")
