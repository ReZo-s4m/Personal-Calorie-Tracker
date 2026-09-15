#!/usr/bin/env python3
"""Build transparent C mark and lockup assets from the brand source PNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "brand" / "logo-source.png"
OUT_C = ROOT / "public" / "brand" / "logo-c.png"
OUT_MARK = ROOT / "public" / "brand" / "logo-mark.png"

FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Calibri.ttf",
)

WHITE_RGB_MIN = 248
NEAR_WHITE_DISTANCE = 12
INK_ALPHA_THRESHOLD = 40
CREDIT_TEXT = "by Typeface"
CREDIT_FILL = (62, 62, 62, 255)


def knock_white(image: Image.Image) -> Image.Image:
    """Make near-white pixels transparent so only ink remains."""
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if red >= WHITE_RGB_MIN and green >= WHITE_RGB_MIN and blue >= WHITE_RGB_MIN:
                pixels[x, y] = (red, green, blue, 0)
                continue

            distance = (255 - red + 255 - green + 255 - blue) / 3
            if distance < NEAR_WHITE_DISTANCE:
                pixels[x, y] = (red, green, blue, int(distance / NEAR_WHITE_DISTANCE * 255))

    return image


def trim(image: Image.Image, padding: int = 4) -> Image.Image:
    """Crop to opaque content and add even padding."""
    alpha = image.split()[-1]
    box = alpha.getbbox()
    if not box:
        return image

    left, top, right, bottom = box
    cropped = image.crop((left, top, right, bottom))
    canvas = Image.new(
        "RGBA",
        (cropped.width + padding * 2, cropped.height + padding * 2),
        (0, 0, 0, 0),
    )
    canvas.paste(cropped, (padding, padding), cropped)
    return canvas


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def credit_anchor(ink: Image.Image) -> tuple[int, int]:
    """Place credit text just past the red tip in the lower third."""
    alpha = ink.split()[-1]
    rightmost = 0
    band_top = int(ink.height * 0.62)
    band_bottom = int(ink.height * 0.92)

    for y in range(band_top, band_bottom):
        for x in range(ink.width - 1, -1, -1):
            if alpha.getpixel((x, y)) > INK_ALPHA_THRESHOLD:
                rightmost = max(rightmost, x)
                break

    return rightmost + 8, int(ink.height * 0.74)


def build_lockup(ink: Image.Image) -> tuple[Image.Image, int, int]:
    font = load_font(max(15, ink.height // 16))
    probe = ImageDraw.Draw(ink)
    text_box = probe.textbbox((0, 0), CREDIT_TEXT, font=font)
    text_w = text_box[2] - text_box[0]

    x, y = credit_anchor(ink)
    lockup = Image.new(
        "RGBA",
        (max(ink.width, x + text_w + 10), ink.height),
        (0, 0, 0, 0),
    )
    lockup.paste(ink, (0, 0), ink)
    ImageDraw.Draw(lockup).text((x, y), CREDIT_TEXT, font=font, fill=CREDIT_FILL)
    return trim(lockup, padding=8), x, y


def main() -> None:
    ink = trim(knock_white(Image.open(SOURCE)))
    ink.save(OUT_C)

    lockup, x, y = build_lockup(ink)
    lockup.save(OUT_MARK)
    print(f"wrote {OUT_C.name} {ink.size} and {OUT_MARK.name} text@({x},{y})")


if __name__ == "__main__":
    main()
