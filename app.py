"""Thỏ Ngọc & Kỳ Lân vs Zombie - game phong cách Plants vs. Zombies chủ đề Trung Thu."""

import os

from flask import Flask, jsonify, render_template

from game_data import get_game_data

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/game-data")
def game_data():
    return jsonify(get_game_data())


if __name__ == "__main__":
    # Chế độ debug chỉ bật khi đặt FLASK_DEBUG=1 (tuyệt đối không bật khi mở server ra Internet).
    app.run(
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
