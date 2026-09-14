from pathlib import Path
from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parents[1] / "src" / "app"


def cubic(p0, p1, p2, p3, steps=48):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = (u**3) * p0[0] + 3 * (u**2) * t * p1[0] + 3 * u * (t**2) * p2[0] + (t**3) * p3[0]
        y = (u**3) * p0[1] + 3 * (u**2) * t * p1[1] + 3 * u * (t**2) * p2[1] + (t**3) * p3[1]
        pts.append((x, y))
    return pts


def render(size: int) -> Image.Image:
    s = size / 32
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    r = max(1, round(9 * s))
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill="#9a3412")

    leaf = cubic((10 * s, 22.2 * s), (10.2 * s, 15.4 * s), (14.8 * s, 9.8 * s), (23.4 * s, 8.6 * s))
    leaf += cubic((23.4 * s, 8.6 * s), (22.2 * s, 17.0 * s), (17.2 * s, 22.4 * s), (10 * s, 22.2 * s))[1:]
    d.polygon(leaf, fill="#f7f1e8")

    vein_w = max(1, round(1.45 * s))
    d.line(
        [(11.6 * s, 21.2 * s), (16 * s, 16 * s), (20 * s, 9.6 * s)],
        fill="#9a3412",
        width=vein_w,
        joint="curve",
    )

    spark = [
        (23.15 * s, 5.4 * s),
        (24.2 * s, 8.05 * s),
        (26.85 * s, 9.1 * s),
        (24.2 * s, 10.15 * s),
        (23.15 * s, 12.8 * s),
        (22.1 * s, 10.15 * s),
        (19.45 * s, 9.1 * s),
        (22.1 * s, 8.05 * s),
    ]
    d.polygon(spark, fill="#e8b86d")
    return img


def main() -> None:
    render(64).save(APP / "icon.png")
    render(180).save(APP / "apple-icon.png")
    render(32).save(APP / "favicon.ico", format="ICO")

    for name in ("icon.png", "apple-icon.png", "favicon.ico"):
        path = APP / name
        print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
