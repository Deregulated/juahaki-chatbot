from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests
import os

# --- Load .env and initialize Flask ---
load_dotenv()
app = Flask(__name__)

# --- Serper helper ---
def search_serper(query: str) -> str:
    """Use Serper.dev to perform a Google-like search."""
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return "⚠️ Serper API key missing."

    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    payload = {"q": query, "num": 5}

    try:
        res = requests.post("https://google.serper.dev/search", headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()

        results = data.get("organic", [])
        if not results:
            return "No relevant results found."

        lines = []
        for i, r in enumerate(results[:5]):
            title = r.get("title", "")
            link = r.get("link", "")
            snippet = r.get("snippet", "")
            lines.append(f"{i+1}. {title}\n{snippet}\n{link}\n")

        return "\n".join(lines)

    except Exception as e:
        print("Serper error:", e)
        return "⚠️ Error fetching live data."


# --- Routes ---
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "").strip()
    if not user_message:
        return jsonify({"reply": "⚠️ Please enter a question."})

    reply = search_serper(user_message)
    return jsonify({"reply": reply})


# --- Run ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
