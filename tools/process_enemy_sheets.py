"""Normalize generated 4x2 enemy contact sheets into Phaser-ready WebP atlases."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "animations"
OUTPUT = ROOT / "public" / "assets" / "animations"
FRAME_SIZE = 512
CONTENT_LIMIT = 474


def split_cells(sheet: Image.Image) -> list[Image.Image]:
    width, height = sheet.size
    cells = []
    for row in range(2):
        top = round(row * height / 2)
        bottom = round((row + 1) * height / 2)
        for col in range(4):
            left = round(col * width / 4)
            right = round((col + 1) * width / 4)
            cells.append(sheet.crop((left, top, right, bottom)))
    return cells


def normalize_cell(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        return Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    content = cell.crop(bounds)
    scale = min(CONTENT_LIMIT / content.width, CONTENT_LIMIT / content.height)
    size = (max(1, round(content.width * scale)), max(1, round(content.height * scale)))
    content = content.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    x = (FRAME_SIZE - content.width) // 2
    y = FRAME_SIZE - content.height - 14
    frame.alpha_composite(content, (x, y))
    return frame


def process(source: Path, destination: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    frames = [normalize_cell(cell) for cell in split_cells(sheet)]
    atlas = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE * 2))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, ((index % 4) * FRAME_SIZE, (index // 4) * FRAME_SIZE))
    atlas.save(destination, "WEBP", quality=88, method=6, exact=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE.glob("*-sheet-source.png")):
        enemy = source.name.removesuffix("-sheet-source.png")
        process(source, OUTPUT / f"{enemy}-sheet.webp")
        print(f"processed {enemy}")


if __name__ == "__main__":
    main()
