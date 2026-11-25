"""Refresh the portfolio's Korean font subsets after editing copy. Uses only the standard library."""
import concurrent.futures
import re
import string
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "src/assets/fonts"
LICENSES = ROOT / "public/fonts/licenses"
# The second weight gets its own WOFF2 for families distributed as static fonts.
FAMILIES = {
    "IBM Plex Sans KR": ["400", "600"], "Gugi": ["400"], "Orbit": ["400"],
    "Hahmlet": ["100..900"], "Song Myung": ["400"], "Gowun Batang": ["700"],
    "Gowun Dodum": ["400"], "Nanum Gothic Coding": ["400"], "Jua": ["400"],
    "Black Han Sans": ["400"], "Gaegu": ["700"],
}
BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def read_url(url):
    with urlopen(Request(url, headers={"User-Agent": BROWSER}), timeout=45) as response:
        return response.read()


def save_font(slug, url):
    font = read_url(url)
    if font[:4] != b"wOF2":
        raise ValueError(f"Expected WOFF2 for {slug}")
    (FONTS / f"{slug}.woff2").write_bytes(font)


def fetch_family(item):
    name, weights = item
    slug = name.lower().replace(" ", "-")
    for weight in weights:
        query = urlencode({"family": f"{name}:wght@{weight}", "text": glyphs})
        css = read_url("https://fonts.googleapis.com/css2?" + query).decode()
        source = re.search(r"src: url\(([^)]+)\) format\('woff2'\)", css)
        if not source:
            raise ValueError(f"Missing font source for {name} {weight}")
        filename = f"{slug}-{weight}" if len(weights) > 1 else slug
        save_font(filename, source[1])
    license_url = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{slug.replace('-', '')}/OFL.txt"
    (LICENSES / f"{slug}.txt").write_bytes(read_url(license_url))


if __name__ == "__main__":
    source = "".join(path.read_text() for path in (ROOT / "src").rglob("*")
                     if path.suffix in {".tsx", ".ts", ".css"})
    glyphs = "".join(sorted(set(string.printable[:95]) | {char for char in source if ord(char) > 127}))
    FONTS.mkdir(parents=True, exist_ok=True)
    LICENSES.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        list(pool.map(fetch_family, FAMILIES.items()))
    galmuri = "https://raw.githubusercontent.com/quiple/galmuri/main/dist/"
    save_font("galmuri11", galmuri + "Galmuri11.woff2")
    (LICENSES / "galmuri.txt").write_bytes(read_url(galmuri + "LICENSE.txt"))
