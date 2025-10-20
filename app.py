from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import os, requests, re

import os
from dotenv import load_dotenv

# Load the .env file
load_dotenv()  # Make sure .env is in the same folder as this script

# Get the API key
serper_api_key = os.getenv("SERPER_API_KEY")

# Always check if it loaded
if serper_api_key:
    print("API key loaded successfully!")
else:
    print("Failed to load API key.")




load_dotenv()
app = Flask(__name__)
app.secret_key = os.urandom(24)

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

def fetch_serper_results(query):
    url = "https://google.serper.dev/search"
    payload = {"q": f"{query} site:kenyalaw.org OR site:justice.go.ke OR site:knchr.org"}
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json().get("organic", [])[:5]
    except Exception as e:
        print("❌ Serper error:", e)
        return []

def summarize_results(results):
    if not results:
        return "⚠️ I couldn’t find any direct Kenyan legal articles for that."
    summary = ["📚 **Relevant Legal References:**"]
    for r in results:
        title = r.get("title", "Untitled")
        snippet = r.get("snippet", "")
        link = r.get("link", "#")
        match = re.search(r"Article\s\d+\w*", snippet, re.IGNORECASE)
        law_ref = match.group(0) if match else "Kenyan Constitution"
        summary.append(
            f"• <b>{title}</b> — ({law_ref})<br>"
            f"{snippet[:160]}...<br>"
            f"<a href='{link}' target='_blank'>Read more</a>"
        )
    return "<br>".join(summary)

def generate_suggestions(user_message):
    base = [
        "What are my rights during arrest?",
        "How is bail determined in Kenya?",
        "What are the duties of county governments?",
        "What does the Constitution say about freedom of speech?"
    ]
    if "land" in user_message.lower():
        base.append("What is the process of land ownership transfer?")
    if "marriage" in user_message.lower():
        base.append("What does the Marriage Act say about divorce?")
    return base[:4]

# NEW: simple extractive summarizer using chat_history from session
def extractive_summary_from_history(chat_history, max_sentences=5):
    """
    Build a short extractive summary from chat_history (list of {role,content}).
    Scoring: sentences get points for keyword hits and length. We'll return top N sentences.
    """
    if not chat_history:
        return "No conversation yet to summarize."

    # join all messages into one blob, preserve punctuation for splitting
    blob = " ".join([m["content"] for m in chat_history])
    # simple sentence split
    sentences = re.split(r'(?<=[.!?])\s+', blob)
    keywords = ["constitution", "rights", "article", "arrest", "bail", "devolution", "county", "president", "court", "land", "petition"]
    scored = []
    for s in sentences:
        s_strip = s.strip()
        if not s_strip:
            continue
        score = 0
        low = s_strip.lower()
        for kw in keywords:
            if kw in low:
                score += 3
        score += min(len(s_strip) / 200.0, 2)  # slightly prefer longer sentences
        scored.append((score, s_strip))
    # sort by score desc
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [s for _, s in scored[:max_sentences]]
    if not top:
        return "Couldn't produce a summary from the current chat."
    bullets = ["• " + t for t in top]
    return "<br>".join(bullets)

# ROUTES
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"reply": "Please enter a message.", "suggestions": []})

    chat_history = session.get("chat_history", [])
    chat_history.append({"role": "user", "content": user_message})

    # context = last 3 messages combined
    context = " ".join([m["content"] for m in chat_history[-3:]])
    results = fetch_serper_results(context)
    summary = summarize_results(results)
    suggestions = generate_suggestions(user_message)

    chat_history.append({"role": "assistant", "content": summary})
    session["chat_history"] = chat_history

    return jsonify({"reply": summary, "suggestions": suggestions})

@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"summary": "No query provided."})
    results = fetch_serper_results(query)
    summary = summarize_results(results)
    return jsonify({"summary": summary})

@app.route("/summary", methods=["POST"])
def summary():
    """
    Produce an extractive summary from session chat_history.
    The client can call this for auto-summary mode or manual summarization.
    """
    chat_history = session.get("chat_history", [])
    s = extractive_summary_from_history(chat_history, max_sentences=5)
    return jsonify({"summary": s})

@app.route("/clear", methods=["POST"])
def clear_chat():
    session.pop("chat_history", None)
    return jsonify({"message": "Chat history cleared."})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
