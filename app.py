from flask import Flask, render_template, request, jsonify, session, send_from_directory
import requests
import os
from dotenv import load_dotenv
import random
import base64
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key')
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Serper API configuration
SERPER_API_KEY = os.getenv('SERPER_API_KEY')
SERPER_API_URL = "https://google.serper.dev/search"

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class KenyanLawAssistant:
    def __init__(self):
        self.conversation_history = []
        self.setup_system_prompt()
    
    def setup_system_prompt(self):
        """Set up the system prompt focused exclusively on Kenyan law"""
        system_prompt = """You are JuaHaki, a specialized AI assistant focused exclusively on Kenyan law. 
        Your name means "Know the Truth/Law" in Swahili.

        CRITICAL RULES:
        1. ONLY answer questions related to Kenyan law, legal system, constitution, acts, statutes, and legal procedures in Kenya
        2. If asked about any other topic, politely decline and redirect back to Kenyan law
        3. Provide accurate, helpful information about Kenyan legal matters
        4. Cite specific Kenyan laws, acts, and constitutional articles when possible
        5. For current legal information, use search results from reputable Kenyan legal sources

        Areas you cover:
        - Kenyan Constitution 2010
        - Kenyan Acts of Parliament
        - Legal procedures in Kenyan courts
        - Kenyan business and corporate law
        - Kenyan family law
        - Kenyan criminal law
        - Kenyan land law
        - Kenyan employment law
        - Kenyan constitutional law
        - Recent legal developments in Kenya

        Do not answer questions about:
        - Other countries' legal systems
        - Non-legal topics
        - Politics or opinions
        - Medical advice
        - Financial advice beyond legal requirements

        Always be helpful, accurate, and focused on Kenyan legal matters."""
        self.conversation_history.append({"role": "system", "content": system_prompt})
    
    def is_kenyan_law_question(self, question):
        """Check if the question is related to Kenyan law"""
        kenyan_law_keywords = [
            'kenya', 'kenyan', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret',
            'law', 'legal', 'constitution', 'act', 'statute', 'court', 'judge',
            'lawyer', 'advocate', 'legal advice', 'rights', 'constitutional',
            'parliament', 'bill', 'legislation', 'regulation', 'high court',
            'magistrate', 'supreme court', 'court of appeal', 'law society',
            'attorney general', 'directorate of public prosecutions',
            'civil procedure', 'criminal procedure', 'evidence act',
            'penal code', 'civil code', 'business law', 'company law',
            'employment act', 'labour law', 'family law', 'marriage act',
            'children act', 'succession act', 'land act', 'registration act',
            'rent restriction', 'tenant', 'landlord', 'contract act',
            'tort', 'negligence', 'defamation', 'libel', 'slander'
        ]
        
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in kenyan_law_keywords)
    
    def search_web(self, query):
        """Search the web for Kenyan legal information"""
        try:
            # Check if API key is available
            if not SERPER_API_KEY or SERPER_API_KEY == "your_actual_serper_api_key_here":
                return {"error": "API key not configured"}
            
            # Add Kenyan law context to search query
            kenyan_law_query = f"Kenyan law {query}"
            
            payload = {
                "q": kenyan_law_query,
                "gl": "ke",  # Country: Kenya
                "hl": "en",  # Language: English
                "num": 5
            }
            
            headers = {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json'
            }
            
            response = requests.post(SERPER_API_URL, json=payload, headers=headers, timeout=10)
            
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
        if "organic" in search_data and search_data["organic"]:
            organic_results = search_data["organic"][:3]
            response_parts.append("\n**Legal Sources:**")
            
            for i, result in enumerate(organic_results, 1):
                title = result.get("title", "No title")
                link = result.get("link", "")
                snippet = result.get("snippet", "No description available")
                
                response_parts.append(f"{i}. **{title}**")
                response_parts.append(f"   {snippet}")
                if link:
                    response_parts.append(f"   *Source: {link}*")
                response_parts.append("")
        else:
            response_parts.append("No specific legal sources found for this query.")
        
        return "\n".join(response_parts) if response_parts else "No relevant legal information found."

    def get_kenyan_law_response(self, user_message, language_mode):
        """Provide Kenyan law specific responses"""
        if not self.is_kenyan_law_question(user_message):
            if language_mode == 'swahili':
                return "Samahani, mimi ninajikita tu kwenye masuala ya sheria za Kenya. Tafadhali uliza swali kuhusu sheria za Kenya, katiba, au mfumo wa kisheria wa Kenya."
            else:
                return "I apologize, but I specialize exclusively in Kenyan law matters. Please ask questions about Kenyan laws, constitution, or legal system in Kenya."
        
        # Perform web search for Kenyan legal queries
        search_results = self.search_web(user_message)
        
        if "error" not in search_results:
            search_based_response = self.format_search_results(search_results)
            
            if language_mode == 'swahili':
                return f"**Jibu kuhusu sheria za Kenya:**\n\n{search_based_response}\n\n*Ikumbukwe: Huu ni ushauri wa kisheria na unapaswa kushauriana na wakili aliyeandikishwa kwa maelezo kamili.*"
            else:
                return f"**Regarding Kenyan Law:**\n\n{search_based_response}\n\n*Disclaimer: This is legal information and you should consult a registered advocate for complete legal advice.*"
        else:
            # Provide general Kenyan law guidance when search fails
            general_responses = {
                'english': [
                    f"Regarding your question about '{user_message}' in Kenyan law: While I couldn't retrieve current search results, I can mention that Kenyan legal matters are governed by the Constitution of Kenya 2010 and various Acts of Parliament. For specific legal advice, consult the Law Society of Kenya or a registered advocate.",
                    f"For your query '{user_message}' under Kenyan law: The Kenyan legal system includes the Supreme Court, Court of Appeal, High Court, and subordinate courts. Specific legal procedures and requirements vary by the type of case. Please consult official Kenyan legal resources or a qualified advocate.",
                    f"Concerning '{user_message}' in Kenyan law: Kenya's legal framework includes statutory law, common law, and African customary law. The Constitution is the supreme law. For accurate, current information on this legal matter, refer to Kenya Law Reform Commission or official government publications."
                ],
                'swahili': [
                    f"Kuhusu swali lako '{user_message}' katika sheria za Kenya: Ingawa sikuweza kupata matokeo ya sasa, naweza kutaja kuwa mambo ya kisheria nchini Kenya yanatawaliwa na Katiba ya Kenya ya 2010 na Vitendo mbalimbali vya Bunge. Kwa ushauri maalum wa kisheria, wasiliana na Jumuiya ya Wanasheria Kenya au wakali aliyeandikishwa.",
                    f"Kwa swali lako '{user_message}' chini ya sheria za Kenya: Mfumo wa sheria wa Kenya unajumuisha Mahakama Kuu, Mahakama ya Rufaa, Mahakama ya Juu, na mahakama za chini. Taratibu maalum za kisheria na mahitaji hutofautiana kulingana na aina ya kesi. Tafadhali wasiliana na rasilimali rasmi za kisheria za Kenya au wakali mhitimu.",
                    f"Kuhusu '{user_message}' katika sheria za Kenya: Mfumo wa kisheria wa Kenya unajumuisha sheria za kikatiba, sheria za kawaida, na sheria za kitamaduni za Kiafrika. Katiba ndio sheria kuu. Kwa habari sahihi ya sasa kuhusu jambo hili la kisheria, rejea Tume ya Mageuzi ya Sheria Kenya au machapisho rasmi ya serikali."
                ]
            }
            
            import random
            return random.choice(general_responses[language_mode])
    
    def get_response(self, user_message, language_mode='english'):
        """Get response focused exclusively on Kenyan law"""
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": user_message})
            
            # Get Kenyan law specific response
            final_response = self.get_kenyan_law_response(user_message, language_mode)
            
            # Add bot response to history
            self.conversation_history.append({"role": "assistant", "content": final_response})
            
            # Keep conversation history manageable
            if len(self.conversation_history) > 21:
                self.conversation_history = [self.conversation_history[0]] + self.conversation_history[-20:]
            
            return final_response
            
        except Exception as e:
            error_msg_en = "Sorry, I encountered a technical issue while processing your legal query. Please try again."
            error_msg_sw = "Samahani, nimekutana na tatizo la kiufundi wakati wa kuchakata swali lako la kisheria. Tafadhali jaribu tena."
            
            return error_msg_sw if language_mode == 'swahili' else error_msg_en

# Initialize assistant
assistant = KenyanLawAssistant()

# Background options similar to WhatsApp
BACKGROUND_OPTIONS = {
    'solid_colors': [
        {'id': 'solid_white', 'name': 'White', 'value': '#ffffff', 'type': 'solid'},
        {'id': 'solid_black', 'name': 'Black', 'value': '#000000', 'type': 'solid'},
        {'id': 'solid_gray', 'name': 'Gray', 'value': '#808080', 'type': 'solid'},
        {'id': 'solid_blue', 'name': 'Blue', 'value': '#007bff', 'type': 'solid'},
        {'id': 'solid_green', 'name': 'Green', 'value': '#28a745', 'type': 'solid'},
        {'id': 'solid_red', 'name': 'Red', 'value': '#dc3545', 'type': 'solid'},
        {'id': 'solid_purple', 'name': 'Purple', 'value': '#6f42c1', 'type': 'solid'},
        {'id': 'solid_orange', 'name': 'Orange', 'value': '#fd7e14', 'type': 'solid'},
    ],
    'gradients': [
        {'id': 'gradient_blue', 'name': 'Blue Gradient', 'value': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'type': 'gradient'},
        {'id': 'gradient_sunset', 'name': 'Sunset', 'value': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 'type': 'gradient'},
        {'id': 'gradient_ocean', 'name': 'Ocean', 'value': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', 'type': 'gradient'},
        {'id': 'gradient_forest', 'name': 'Forest', 'value': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 'type': 'gradient'},
        {'id': 'gradient_warm', 'name': 'Warm', 'value': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', 'type': 'gradient'},
        {'id': 'gradient_cool', 'name': 'Cool', 'value': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', 'type': 'gradient'},
    ],
    'patterns': [
        {'id': 'pattern_dots', 'name': 'Dots', 'value': 'radial-gradient(circle, #000000 1px, transparent 1px)', 'type': 'pattern', 'size': '20px 20px'},
        {'id': 'pattern_lines', 'name': 'Lines', 'value': 'repeating-linear-gradient(45deg, transparent, transparent 10px, #f0f0f0 10px, #f0f0f0 20px)', 'type': 'pattern'},
        {'id': 'pattern_grid', 'name': 'Grid', 'value': 'linear-gradient(#e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px)', 'type': 'pattern', 'size': '20px 20px'},
        {'id': 'pattern_zigzag', 'name': 'Zigzag', 'value': 'linear-gradient(135deg, #e0e0e0 25%, transparent 25%), linear-gradient(225deg, #e0e0e0 25%, transparent 25%), linear-gradient(315deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, #e0e0e0 25%, transparent 25%)', 'type': 'pattern', 'size': '20px 20px'},
    ],
    'images': [
        {'id': 'image_1', 'name': 'Nature', 'value': 'bg1.jpg', 'type': 'image'},
        {'id': 'image_2', 'name': 'Mountains', 'value': 'bg2.jpg', 'type': 'image'},
        {'id': 'image_3', 'name': 'Beach', 'value': 'bg3.jpg', 'type': 'image'},
    ]
}

@app.route('/')
def index():
    # Initialize session defaults with proper background persistence
    if 'background_settings' not in session:
        session['background_settings'] = {
            'type': 'solid',
            'value': '#ffffff',
            'size': ''
        }
    
    if 'language' not in session:
        session['language'] = 'english'
    
    if 'font_family' not in session:
        session['font_family'] = 'Inter'
    
    if 'font_size' not in session:
        session['font_size'] = '16px'
    
    if 'primary_color' not in session:
        session['primary_color'] = '#10a37f'
    
    if 'theme_mode' not in session:
        session['theme_mode'] = 'light'
    
    # Get background settings with safe defaults
    background_settings = session.get('background_settings', {
        'type': 'solid',
        'value': '#ffffff', 
        'size': ''
    })
    
    return render_template('index.html', 
                         background_settings=background_settings,
                         language=session.get('language', 'english'),
                         font_family=session.get('font_family', 'Inter'),
                         font_size=session.get('font_size', '16px'),
                         primary_color=session.get('primary_color', '#10a37f'),
                         background_options=BACKGROUND_OPTIONS)

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')
    language_mode = session.get('language', 'english')
    
    if not user_message.strip():
        return jsonify({'response': 'Please enter your legal question...'})
    
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
        
        session.modified = True
        return jsonify({'status': 'success', 'message': 'Settings updated successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/set-background', methods=['POST'])
def set_background():
    """Set background from predefined options"""
    try:
        data = request.json
        bg_type = data.get('type')
        bg_value = data.get('value')
        bg_size = data.get('size', '')
        
        # Update session with complete background settings
        session['background_settings'] = {
            'type': bg_type,
            'value': bg_value,
            'size': bg_size
        }
        session.modified = True
        
        return jsonify({
            'status': 'success', 
            'message': 'Background updated successfully',
            'background': session['background_settings']
        })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error setting background: {str(e)}'})

@app.route('/upload-background', methods=['POST'])
def upload_background():
    """Handle background image upload"""
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
            
            # Save file directly
            file.save(filepath)
            
            # Update session
            session['background_settings'] = {
                'type': 'uploaded',
                'value': filename,
                'size': ''
            }
            session.modified = True
            
            return jsonify({
                'status': 'success', 
                'message': 'Background uploaded successfully',
                'background': session['background_settings']
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
    session.modified = True
    
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
        'english': 'Ask about Kenyan law, constitution, or legal system...',
        'swahili': 'Uliza kuhusu sheria za Kenya, katiba, au mfumo wa kisheria...'
    }
    return placeholders.get(language, placeholders['english'])

@app.route('/static/uploads/<filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)