import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image


MODEL_PATH = Path(r"D:\本地模型\抠图模型\BiRefNet\model_fp16.onnx")


def build_session():
    return ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])


def remove_background(session, source: Path, target: Path):
    image = Image.open(source).convert("RGB")
    original_size = image.size
    resized = image.resize((1024, 1024), Image.Resampling.BICUBIC)
    pixels = np.asarray(resized, dtype=np.float32) / 255.0
    normalized = (pixels - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
    tensor = np.transpose(normalized, (2, 0, 1))[None, ...]
    prediction = session.run(["output_image"], {"input_image": tensor})[0][0, 0]
    if prediction.min() < 0.0 or prediction.max() > 1.0:
        prediction = 1.0 / (1.0 + np.exp(-prediction))
    alpha = Image.fromarray(np.clip(prediction * 255.0, 0, 255).astype(np.uint8), "L")
    alpha = alpha.resize(original_size, Image.Resampling.LANCZOS)
    result = image.copy()
    result.putalpha(alpha)
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target)
    print(f"Wrote {target}")


parser = argparse.ArgumentParser()
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--cols", type=int, default=1)
parser.add_argument("--rows", type=int, default=1)
args = parser.parse_args()

if not MODEL_PATH.is_file():
    raise SystemExit(f"BiRefNet model not found: {MODEL_PATH}")

session = build_session()
if args.cols == 1 and args.rows == 1:
    remove_background(session, args.input, args.output)
else:
    source = Image.open(args.input).convert("RGB")
    width, height = source.size
    cell_width, cell_height = width // args.cols, height // args.rows
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for row in range(args.rows):
        for col in range(args.cols):
            box = (col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height)
            cell = source.crop(box)
            temp_source = args.output.with_name(f".{args.output.stem}-{row}-{col}-source.png")
            temp_target = args.output.with_name(f".{args.output.stem}-{row}-{col}-cutout.png")
            cell.save(temp_source)
            remove_background(session, temp_source, temp_target)
            result.alpha_composite(Image.open(temp_target).convert("RGBA"), (box[0], box[1]))
            temp_source.unlink(missing_ok=True)
            temp_target.unlink(missing_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output)
    print(f"Wrote {args.output}")
