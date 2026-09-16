import argparse
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()

image = Image.open(args.input).convert("RGBA")
pixels = np.asarray(image, dtype=np.float32)
rgb = pixels[:, :, :3]
alpha = pixels[:, :, 3]
edge = (alpha > 0) & (alpha < 245)
green_dominant = (rgb[:, :, 1] > rgb[:, :, 0] * 1.12) & (rgb[:, :, 1] > rgb[:, :, 2] * 1.12)
mask = edge & green_dominant
strength = np.clip((245.0 - alpha) / 160.0, 0.0, 1.0)[:, :, None]
target_green = np.maximum(rgb[:, :, [0, 2]].mean(axis=2, keepdims=True), 0.0)
rgb[mask] = rgb[mask] * (1.0 - strength[mask])
rgb[:, :, 1:2][mask] = np.minimum(rgb[:, :, 1:2][mask], target_green[mask] + 8.0)
result = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), "RGBA")
args.output.parent.mkdir(parents=True, exist_ok=True)
result.save(args.output)
print(f"Wrote {args.output}")
