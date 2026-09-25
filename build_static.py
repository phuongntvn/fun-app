"""Đóng gói game thành 1 file HTML tĩnh (dist/index.html), không cần server Flask.

Dùng để đăng lên GitHub Pages, Netlify... hoặc mở trực tiếp bằng trình duyệt:
    python build_static.py
"""

import json
from pathlib import Path

from game_data import get_game_data

ROOT = Path(__file__).parent


def build(out_dir: Path = ROOT / "dist") -> Path:
    html = (ROOT / "templates" / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "static" / "css" / "style.css").read_text(encoding="utf-8")
    js = (ROOT / "static" / "js" / "game.js").read_text(encoding="utf-8")

    fetch_code = "      const res = await fetch('/api/game-data');\n      DATA = await res.json();"
    if fetch_code not in js:
        raise SystemExit("Không tìm thấy đoạn fetch dữ liệu trong game.js")
    js = js.replace(fetch_code, "      DATA = window.__GAME_DATA__;")

    data = json.dumps(get_game_data(), ensure_ascii=False).replace("</", "<\\/")
    head, rest = html.split('<link rel="stylesheet"', 1)
    rest = rest.split(">", 1)[1]
    body = rest[: rest.index("  <script src")]
    page = (
        f"{head}<style>\n{css}</style>{body}"
        f"  <script>window.__GAME_DATA__ = {data};</script>\n"
        f"  <script>\n{js}\n  </script>\n</body>\n</html>\n"
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "index.html"
    out.write_text(page, encoding="utf-8")
    return out


if __name__ == "__main__":
    path = build()
    print(f"Đã tạo {path} ({path.stat().st_size // 1024} KB)")
