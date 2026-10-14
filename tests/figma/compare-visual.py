"""Compare controlled screenshots; requires Pillow and an approved baseline."""
import sys
from pathlib import Path
from PIL import Image, ImageChops
root = Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/blies-visual-results')
failures = 0
for route in ['home', 'quote']:
    for size in ['desktop', 'tablet', 'mobile']:
        baseline = Image.open(root / f'{route}-{size}-baseline.png').convert('RGB')
        current = Image.open(root / f'{route}-{size}-current.png').convert('RGB')
        if baseline.size != current.size:
            print(f'FAIL {route}/{size}: viewport size changed')
            failures += 1
            continue
        changed = ImageChops.difference(baseline,current).getbbox() is not None
        print(f'{"FAIL" if changed else "PASS"} {route}/{size}: {"pixels differ" if changed else "pixel-identical"}')
        failures += int(changed)
sys.exit(1 if failures else 0)
