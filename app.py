from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI
import os

# --- Load environment variables ---
load_dotenv(find_dotenv())

# --- Initialize Flask app ---
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Required for session-based chat memory

# --- Initialize OpenAI client ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Routes ---
@app.route("/")
def home():
    """Render the chatbot web interface"""
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    """Handle chat messages and generate AI responses"""
    user_message = request.json.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Retrieve chat history from the session
    chat_history = session.get("chat_history", [])
    chat_history.append({"role": "user", "content": user_message})

    # Generate chatbot reply
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are Juahaki, a friendly civic chatbot that helps users with public information and services."},
            *chat_history
        ]
    )

    bot_reply = response.choices[0].message.content
    chat_history.append({"role": "assistant", "content": bot_reply})

    # Save updated history
    session["chat_history"] = chat_history

    return jsonify({"reply": bot_reply})

# --- Run the Flask app ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
