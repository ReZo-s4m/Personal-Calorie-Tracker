#!/usr/bin/env python3
"""Render NutriAI app icons (PNG / Apple touch / favicon) from vector geometry."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

APP_DIR = Path(__file__).resolve().parents[1] / "src" / "app"

BASE_SIZE = 32
BACKGROUND = "#9a3412"
LEAF_FILL = "#f7f1e8"
VEIN_FILL = "#9a3412"
SPARK_FILL = "#e8b86d"
CORNER_RADIUS_AT_32 = 9
VEIN_WIDTH_AT_32 = 1.45
CUBIC_STEPS = 48

OUTPUTS = (
    ("icon.png", 64, None),
    ("apple-icon.png", 180, None),
    ("favicon.ico", 32, "ICO"),
)


def cubic(p0, p1, p2, p3, steps: int = CUBIC_STEPS) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = (u**3) * p0[0] + 3 * (u**2) * t * p1[0] + 3 * u * (t**2) * p2[0] + (t**3) * p3[0]
        y = (u**3) * p0[1] + 3 * (u**2) * t * p1[1] + 3 * u * (t**2) * p2[1] + (t**3) * p3[1]
        points.append((x, y))
    return points


def scale_point(x: float, y: float, scale: float) -> tuple[float, float]:
    return (x * scale, y * scale)


def leaf_polygon(scale: float) -> list[tuple[float, float]]:
    top = cubic(
        scale_point(10, 22.2, scale),
        scale_point(10.2, 15.4, scale),
        scale_point(14.8, 9.8, scale),
        scale_point(23.4, 8.6, scale),
    )
    bottom = cubic(
        scale_point(23.4, 8.6, scale),
        scale_point(22.2, 17.0, scale),
        scale_point(17.2, 22.4, scale),
        scale_point(10, 22.2, scale),
    )
    return top + bottom[1:]


def spark_polygon(scale: float) -> list[tuple[float, float]]:
    return [
        scale_point(23.15, 5.4, scale),
        scale_point(24.2, 8.05, scale),
        scale_point(26.85, 9.1, scale),
        scale_point(24.2, 10.15, scale),
        scale_point(23.15, 12.8, scale),
        scale_point(22.1, 10.15, scale),
        scale_point(19.45, 9.1, scale),
        scale_point(22.1, 8.05, scale),
    ]


def render(size: int) -> Image.Image:
    scale = size / BASE_SIZE
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    radius = max(1, round(CORNER_RADIUS_AT_32 * scale))
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BACKGROUND)

    draw.polygon(leaf_polygon(scale), fill=LEAF_FILL)

    vein_width = max(1, round(VEIN_WIDTH_AT_32 * scale))
    draw.line(
        [
            scale_point(11.6, 21.2, scale),
            scale_point(16, 16, scale),
            scale_point(20, 9.6, scale),
        ],
        fill=VEIN_FILL,
        width=vein_width,
        joint="curve",
    )

    draw.polygon(spark_polygon(scale), fill=SPARK_FILL)
    return image


def main() -> None:
    for name, size, image_format in OUTPUTS:
        path = APP_DIR / name
        image = render(size)
        if image_format:
            image.save(path, format=image_format)
        else:
            image.save(path)
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
