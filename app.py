from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI
import requests
import os

# --- Load environment variables ---
load_dotenv(find_dotenv())

# --- Initialize Flask app ---
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Needed for chat session storage

# --- Initialize OpenAI client ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# --- Serper helper function ---
def search_serper(query: str) -> str:
    """Perform a Serper (Google-like) search and return summarized results."""
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

        # Summarize top results
        summary_lines = []
        for i, r in enumerate(results[:5]):
            title = r.get("title", "")
            link = r.get("link", "")
            snippet = r.get("snippet", "")
            summary_lines.append(f"{i+1}. {title}\n{snippet}\n{link}\n")

        return "\n".join(summary_lines)

    except Exception as e:
        print("Serper error:", e)
        return "⚠️ Error fetching live data."


# --- Home route ---
@app.route("/")
def home():
    return render_template("index.html")


# --- Chat route ---
@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Retrieve chat history
    chat_history = session.get("chat_history", [])
    chat_history.append({"role": "user", "content": user_message})

    # Detect if user needs live search
    if any(keyword in user_message.lower() for keyword in ["search", "find", "lookup", "news", "latest", "who is", "what is"]):
        live_data = search_serper(user_message)
        chat_history.append({"role": "system", "content": f"Live search data:\n{live_data}"})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    "You are Juahaki, a civic chatbot assistant. You help users with civic information, "
                    "Kenyan government services, and general queries. If live data is provided, use it to answer accurately."
                )}
            ] + chat_history
        )

        bot_reply = response.choices[0].message.content
    except Exception as e:
        print("OpenAI error:", e)
        bot_reply = "⚠️ Juahaki is having trouble connecting. Please try again later."

    chat_history.append({"role": "assistant", "content": bot_reply})
    session["chat_history"] = chat_history

    return jsonify({"reply": bot_reply})


# --- Run the app ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
