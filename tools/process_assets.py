"""Turn generated character sheets into clean, square RGBA game sprites.

The script intentionally uses only Pillow and NumPy so contributors can
rebuild the checked-in sprites without a proprietary editor.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source"
OUTPUT = ROOT / "public" / "assets" / "sprites"


def edge_connected(candidate: np.ndarray) -> np.ndarray:
    """Return candidate pixels connected to an image edge (4-neighbour)."""

    height, width = candidate.shape
    visited = np.zeros_like(candidate, dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if candidate[y, x] and not visited[y, x]:
            visited[y, x] = True
            queue.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while queue:
        y, x = queue.popleft()
        if y > 0:
            seed(y - 1, x)
        if y + 1 < height:
            seed(y + 1, x)
        if x > 0:
            seed(y, x - 1)
        if x + 1 < width:
            seed(y, x + 1)
    return visited


def remove_background(image: Image.Image, mode: str) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = (maximum - minimum) / np.maximum(maximum, 0.001)

    if mode == "checker":
        # Generated transparency previews are neutral gray. Dark outlines are
        # protected by the value threshold; enclosed white eyes remain intact.
        candidate = (saturation < 0.14) & (maximum > 0.48)
    elif mode == "white":
        distance = np.linalg.norm(rgb - 1.0, axis=2)
        candidate = distance < 0.19
    else:
        raise ValueError(f"Unknown background mode: {mode}")

    background = edge_connected(candidate)
    object_mask = Image.fromarray((~background * 255).astype(np.uint8), "L")
    object_mask = object_mask.filter(ImageFilter.GaussianBlur(0.7))

    rgba = image.convert("RGBA")
    rgba.putalpha(object_mask)
    return rgba


def keep_primary_component(sprite: Image.Image) -> Image.Image:
    """Discard pieces of neighbouring characters that cross a sheet cell."""

    alpha = np.asarray(sprite.getchannel("A"))
    foreground = alpha > 36
    height, width = foreground.shape
    seen = np.zeros_like(foreground, dtype=bool)
    largest: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not foreground[y, x] or seen[y, x]:
                continue
            seen[y, x] = True
            queue = deque([(y, x)])
            component: list[tuple[int, int]] = []
            while queue:
                cy, cx = queue.popleft()
                component.append((cy, cx))
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < height and 0 <= nx < width and foreground[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
            if len(component) > len(largest):
                largest = component

    keep = np.zeros_like(foreground, dtype=bool)
    if largest:
        ys, xs = zip(*largest)
        keep[np.asarray(ys), np.asarray(xs)] = True
        # Include the antialiased fringe around the solid connected body.
        for _ in range(3):
            expanded = keep.copy()
            expanded[1:] |= keep[:-1]
            expanded[:-1] |= keep[1:]
            expanded[:, 1:] |= keep[:, :-1]
            expanded[:, :-1] |= keep[:, 1:]
            keep = expanded

    cleaned_alpha = np.where(keep, alpha, 0).astype(np.uint8)
    result = sprite.copy()
    result.putalpha(Image.fromarray(cleaned_alpha, "L"))
    return result


def square_sprite(sprite: Image.Image, size: int = 512) -> Image.Image:
    sprite = keep_primary_component(sprite)
    alpha = sprite.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("No foreground found while extracting sprite")
    sprite = sprite.crop(bounds)

    margin = 34
    available = size - margin * 2
    scale = min(available / sprite.width, available / sprite.height)
    scaled = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - scaled.width) // 2
    y = size - margin - scaled.height
    canvas.alpha_composite(scaled, (x, y))
    return canvas


def split_sheet(filename: str, names: list[str], background: str) -> None:
    source = Image.open(SOURCE / filename)
    cleaned = remove_background(source, background)
    width, height = cleaned.size
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(names):
        left = round(index * width / len(names))
        right = round((index + 1) * width / len(names))
        cell = cleaned.crop((left, 0, right, height))
        square_sprite(cell).save(OUTPUT / f"{name}.png", optimize=True)


def main() -> None:
    split_sheet(
        "plant-sheet-rgb.png",
        ["sunbloom", "berry", "pumpkin", "mushroom"],
        "checker",
    )
    split_sheet(
        "enemy-sheet-rgb.png",
        ["gardener", "runner", "bucket", "brute"],
        "white",
    )
    print(f"Wrote 8 sprites to {OUTPUT}")


if __name__ == "__main__":
    main()
