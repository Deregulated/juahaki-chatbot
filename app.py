from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())


import os
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/")
def home():
    """Render the chatbot interface"""
    return render_template("index.html")

from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv, find_dotenv
import os
from openai import OpenAI

load_dotenv(find_dotenv())

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Needed for session storage

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json["message"]

    # Get or initialize chat history
    chat_history = session.get("chat_history", [])
    chat_history.append({"role": "user", "content": user_message})

    # Generate response
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=chat_history
    )

    bot_reply = response.choices[0].message.content
    chat_history.append({"role": "assistant", "content": bot_reply})

    # Save chat history back to session
    session["chat_history"] = chat_history

    return jsonify({"reply": bot_reply})
