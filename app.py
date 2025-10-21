from flask import Flask, render_template, request, jsonify, session, send_from_directory
import requests
import os
from dotenv import load_dotenv
import random
import base64

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key')
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Serper API configuration
SERPER_API_KEY = os.getenv('SERPER_API_KEY')
SERPER_API_URL = "https://google.serper.dev/search"

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class JuaHakiSearchAssistant:
    def __init__(self):
        self.conversation_history = []
        self.setup_system_prompt()
    
    def setup_system_prompt(self):
        """Set up the system prompt for JuaHaki personality"""
        system_prompt = """
        You are JuaHaki, a knowledgeable and friendly AI assistant. 
        Your name means "Know the Truth/Law" in Swahili.
        
        Characteristics:
        - Helpful: Provide accurate and useful information
        - Friendly: Warm and engaging personality
        - Informative: Share insights based on real-time search data
        
        Provide helpful responses based on search results when available.
        """
        self.conversation_history.append({"role": "system", "content": system_prompt})
    
    def search_web(self, query):
        """Search the web using Serper API"""
        try:
            payload = {
                "q": query,
                "gl": "us",  # Country: United States
                "hl": "en",  # Language: English
                "num": 5     # Number of results
            }
            
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            response = requests.post(SERPER_API_URL, json=payload, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"API request failed with status {response.status_code}"}
                
        except Exception as e:
            return {"error": f"Search failed: {str(e)}"}
    
    def format_search_results(self, search_data):
        """Format search results into a readable response"""
        if "error" in search_data:
            return f"Search error: {search_data['error']}"
        
        response_parts = []
        
        # Add knowledge graph if available
        if "knowledgeGraph" in search_data:
            kg = search_data["knowledgeGraph"]
            if "title" in kg:
                response_parts.append(f"**{kg['title']}**")
            if "description" in kg:
                response_parts.append(kg["description"])
        
        # Add organic results
        if "organic" in search_data:
            organic_results = search_data["organic"][:3]  # Top 3 results
            response_parts.append("\n**Search Results:**")
            
            for i, result in enumerate(organic_results, 1):
                title = result.get("title", "No title")
                link = result.get("link", "")
                snippet = result.get("snippet", "No description available")
                
                response_parts.append(f"{i}. **{title}**")
                response_parts.append(f"   {snippet}")
                response_parts.append(f"   *Source: {link}*")
                response_parts.append("")
        
        # Add answer box if available
        if "answerBox" in search_data:
            answer = search_data["answerBox"]
            response_parts.append("\n**Quick Answer:**")
            if "answer" in answer:
                response_parts.append(answer["answer"])
            elif "snippet" in answer:
                response_parts.append(answer["snippet"])
        
        return "\n".join(response_parts) if response_parts else "No relevant information found."
    
    def get_response(self, user_message, language_mode='english'):
        """Get response using web search and contextual understanding"""
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Perform web search for factual queries
            search_query = user_message
            search_results = self.search_web(search_query)
            
            # Format the response based on search results
            if "error" not in search_results:
                search_based_response = self.format_search_results(search_results)
                
                # Create final response
                if language_mode == 'swahili':
                    final_response = f"**Jibu kutoka kwa utafutaji:**\n\n{search_based_response}"
                else:
                    final_response = f"**Based on my search:**\n\n{search_based_response}"
            else:
                if language_mode == 'swahili':
                    final_response = "Samahani, sijaweza kupata majibu ya hivi punde kutoka kwenye utafutaji. Unaweza kuuliza tena au kubahatisha swali tofauti."
                else:
                    final_response = "I apologize, but I couldn't retrieve search results at the moment. Please try asking your question again or rephrase it."
            
            # Add bot response to history
            self.conversation_history.append({"role": "assistant", "content": final_response})
            
            # Keep conversation history manageable
            if len(self.conversation_history) > 21:
                self.conversation_history = [self.conversation_history[0]] + self.conversation_history[-20:]
            
            return final_response
            
        except Exception as e:
            error_msg_en = "Sorry, I encountered a technical issue while processing your request. Please try again."
            error_msg_sw = "Samahani, nimekutana na tatizo la kiufundi. Tafadhali jaribu tena."
            
            return error_msg_sw if language_mode == 'swahili' else error_msg_en

# Initialize assistant
assistant = JuaHakiSearchAssistant()

@app.route('/')
def index():
    # Initialize session defaults
    session.setdefault('background', 'bg1.jpg')
    session.setdefault('language', 'english')  # Default to English
    session.setdefault('font_family', 'Inter')
    session.setdefault('font_size', '16px')
    session.setdefault('primary_color', '#10a37f')
    session.setdefault('background_type', 'predefined')
    
    backgrounds = ['bg1.jpg', 'bg2.jpg', 'bg3.jpg']
    return render_template('index.html', 
                         background=session.get('background'),
                         language=session.get('language'),
                         font_family=session.get('font_family'),
                         font_size=session.get('font_size'),
                         primary_color=session.get('primary_color'),
                         backgrounds=backgrounds)

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')
    language_mode = session.get('language', 'english')
    
    if not user_message.strip():
        return jsonify({'response': 'Please enter a message...'})
    
    # Get assistant response
    bot_response = assistant.get_response(user_message, language_mode)
    
    return jsonify({'response': bot_response})

@app.route('/reset', methods=['POST'])
def reset_chat():
    """Reset conversation history"""
    assistant.conversation_history = []
    assistant.setup_system_prompt()
    return jsonify({'status': 'success', 'message': 'Conversation cleared'})

@app.route('/update-settings', methods=['POST'])
def update_settings():
    """Update user settings"""
    try:
        data = request.json
        settings = data.get('settings', {})
        
        # Update session with new settings
        for key, value in settings.items():
            session[key] = value
        
        return jsonify({'status': 'success', 'message': 'Settings updated successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/upload-background', methods=['POST'])
def upload_background():
    """Handle background image upload - simplified without Pillow"""
    try:
        if 'background' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file selected'})
        
        file = request.files['background']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'})
        
        if file:
            # Validate file type
            if not file.content_type.startswith('image/'):
                return jsonify({'status': 'error', 'message': 'Please select an image file only'})
            
            # Generate unique filename
            filename = f"user_bg_{random.randint(1000, 9999)}_{file.filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Save file directly without processing (simplified without Pillow)
            file.save(filepath)
            
            # Update session
            session['background'] = filename
            session['background_type'] = 'uploaded'
            
            return jsonify({
                'status': 'success', 
                'message': 'Background uploaded successfully',
                'filename': filename
            })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Upload error: {str(e)}'})

@app.route('/toggle-language', methods=['POST'])
def toggle_language():
    """Toggle between language modes"""
    current_language = session.get('language', 'english')
    
    # Cycle through language modes
    if current_language == 'english':
        new_language = 'swahili'
    else:
        new_language = 'english'
    
    session['language'] = new_language
    
    # Return language info for UI update
    language_info = {
        'english': {'name': 'English', 'display': 'EN', 'next': 'Swahili'},
        'swahili': {'name': 'Swahili', 'display': 'SW', 'next': 'English'}
    }
    
    return jsonify({
        'language': new_language,
        'display_name': language_info[new_language]['name'],
        'button_text': f'{language_info[new_language]["display"]} → {language_info[new_language]["next"]}',
        'placeholder': get_placeholder_text(new_language)
    })

def get_placeholder_text(language):
    """Get appropriate placeholder text based on language"""
    placeholders = {
        'english': 'Ask me anything... I will search for the latest information',
        'swahili': 'Uliza swali lolote... Nitatafuta taarifa za hivi karibuni'
    }
    return placeholders.get(language, placeholders['english'])

@app.route('/static/uploads/<filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)