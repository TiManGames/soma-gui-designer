"""Compare the local editor and raw SOMA GUI captures. Requires Pillow."""
from pathlib import Path
import json
from PIL import Image, ImageChops, ImageFilter, ImageStat

root = Path(__file__).resolve().parents[1]
out = root / '.cache/native-parity'
native = Image.open(out / 'native.png').convert('RGB')
editor = Image.open(root / '.cache/preview-lab/editor.png').convert('RGB')
if native.size != editor.size:
    raise RuntimeError('Capture dimensions differ')
diff = ImageChops.difference(native, editor)
maximum = ImageChops.lighter(ImageChops.lighter(*diff.split()[:2]), diff.split()[2])
# An interior pixel and all eight neighbors are constant in both captures.
# This deliberately reports edge/raster differences separately from flat colors.
def flat(image):
    channels = ImageChops.difference(image.filter(ImageFilter.MaxFilter(3)), image.filter(ImageFilter.MinFilter(3))).split()
    return ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2]).point(lambda v: 255 if v == 0 else 0)
interior = ImageChops.multiply(flat(native), flat(editor))
interior_deltas = [delta for delta, include in zip(maximum.get_flattened_data(), interior.get_flattened_data()) if include]
def nearest(a, b):
    best = Image.new('L', a.size, 255)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            channels = ImageChops.difference(a, ImageChops.offset(b, dx, dy)).split()
            best = ImageChops.darker(best, ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2]))
    return best
near = ImageChops.lighter(nearest(native, editor), nearest(editor, native))
pixels = native.width * native.height
report = {
    'resolution': native.size,
    'meanAbsoluteRgbDelta': ImageStat.Stat(diff).mean,
    'samePixelWithin2Percent': 100 * sum(v <= 2 for v in maximum.get_flattened_data()) / pixels,
    'pixelsExceeding2': sum(v > 2 for v in maximum.get_flattened_data()),
    'withinOnePixelAnd2Percent': 100 * sum(v <= 2 for v in near.get_flattened_data()) / pixels,
    'flatInteriorPixels': len(interior_deltas),
    'flatInteriorMaxDelta': max(interior_deltas),
    'flatInteriorPass': max(interior_deltas) <= 2,
    'scope': 'Frozen 800x600 GUI fixture, explicit matching virtual size and shipped default font; RGB before terminal post-processing. Edge/raster differences are reported, not hidden.'
}
diff.point(lambda v: min(v * 4, 255)).save(out / 'difference.png')
comparison = Image.new('RGB', (native.width * 2, native.height))
comparison.paste(editor, (0, 0)); comparison.paste(native, (native.width, 0))
comparison.save(out / 'comparison.png')
(out / 'comparison.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
if not report['flatInteriorPass']:
    raise RuntimeError('Flat color parity exceeded two bytes')
