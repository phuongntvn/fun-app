"""Thỏ Ngọc & Kỳ Lân vs Zombie - game phong cách Plants vs. Zombies chủ đề Trung Thu."""

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
    app.run(host="0.0.0.0", port=5000, debug=True)
