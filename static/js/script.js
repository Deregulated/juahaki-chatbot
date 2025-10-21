document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettings = document.getElementById('closeSettings');
    const settingsPanel = document.getElementById('settingsPanel');
    const languageBtn = document.getElementById('languageBtn');
    const themeBtn = document.getElementById('themeBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const backgroundUpload = document.getElementById('backgroundUpload');
    const uploadBgBtn = document.getElementById('uploadBgBtn');
    const uploadPreview = document.getElementById('uploadPreview');
    const quickBtns = document.querySelectorAll('.quick-btn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const voiceToggleBtn = document.getElementById('voiceToggleBtn');
    const voiceControlPanel = document.getElementById('voiceControlPanel');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const voiceProgressBar = document.getElementById('voiceProgressBar');
    const voiceStatus = document.getElementById('voiceStatus');
    const clearBtn = document.getElementById('clearBtn');
    const copyChatBtn = document.getElementById('copyChatBtn');
    const toast = document.getElementById('toast');

    // Voice Synthesis
    let speechSynthesis = window.speechSynthesis;
    let currentUtterance = null;
    let isSpeaking = false;
    let isPaused = false;
    let voiceEnabled = false;

    // Initialize
    initSettings();
    loadUserPreferences();
    setupMobileMenu();
    initBackground();
    initVoiceControls();

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', handleKeyPress);
    messageInput.addEventListener('input', adjustInputHeight);
    newChatBtn.addEventListener('click', startNewChat);
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettings.addEventListener('click', toggleSettings);
    languageBtn.addEventListener('click', toggleLanguage);
    themeBtn.addEventListener('click', toggleTheme);
    uploadBgBtn.addEventListener('click', triggerFileUpload);
    backgroundUpload.addEventListener('change', handleBackgroundUpload);
    voiceToggleBtn.addEventListener('click', toggleVoice);
    playPauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopSpeech);
    clearBtn.addEventListener('click', clearChat);
    copyChatBtn.addEventListener('click', copyConversation);

    // Quick question buttons
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            messageInput.value = question;
            sendMessage();
        });
    });

    // Functions
    function setupMobileMenu() {
        if (mobileMenuBtn && sidebar && mobileOverlay) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
            mobileOverlay.addEventListener('click', closeMobileMenu);
            
            sidebar.addEventListener('click', function(e) {
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    closeMobileMenu();
                }
            });
        }
    }

    function toggleMobileMenu() {
        sidebar.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }

    function closeMobileMenu() {
        sidebar.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function initSettings() {
        // Set initial values from session
        document.getElementById('fontFamily').value = document.body.getAttribute('data-font-family');
        document.getElementById('fontSize').value = parseInt(document.body.getAttribute('data-font-size'));
        document.getElementById('fontSizeValue').textContent = document.body.getAttribute('data-font-size');
        document.getElementById('customColor').value = document.body.getAttribute('data-primary-color');
        
        // Voice settings
        document.getElementById('speechRate').value = localStorage.getItem('speechRate') || 1;
        document.getElementById('speechRateValue').textContent = document.getElementById('speechRate').value;
        document.getElementById('speechPitch').value = localStorage.getItem('speechPitch') || 1;
        document.getElementById('speechPitchValue').textContent = document.getElementById('speechPitch').value;
        document.getElementById('voiceSelect').value = localStorage.getItem('selectedVoice') || 'default';
    }

    function loadUserPreferences() {
        // Load from localStorage if available
        const preferences = JSON.parse(localStorage.getItem('juaHakiPreferences') || '{}');
        
        if (preferences.font_family) {
            document.body.style.setProperty('--font-family', preferences.font_family);
        }
        
        if (preferences.font_size) {
            document.body.style.setProperty('--font-size', preferences.font_size);
        }
        
        if (preferences.primary_color) {
            document.body.style.setProperty('--primary-color', preferences.primary_color);
            document.body.style.setProperty('--primary-hover', adjustColor(preferences.primary_color, -20));
        }
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function adjustInputHeight() {
        if (messageInput.tagName === 'TEXTAREA') {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        }
    }

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Hide welcome message and show chat messages
        welcomeMessage.style.display = 'none';
        chatMessages.style.display = 'block';

        // Add user message
        addMessage(message, 'user');
        messageInput.value = '';
        adjustInputHeight();

        // Show typing indicator
        const typingIndicator = addTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator(typingIndicator);
            
            // Add bot response
            addMessage(data.response, 'bot');
            
            // Auto-read if voice is enabled
            if (voiceEnabled) {
                speakText(data.response);
            }
            
        } catch (error) {
            removeTypingIndicator(typingIndicator);
            addMessage('Sorry, there was a network error. Please try again.', 'bot');
        }
    }

    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = sender === 'user' ? 'U' : 'JL';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Format message with line breaks and basic markdown
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        contentDiv.innerHTML = formattedContent;

        // Create message actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy text';
        copyBtn.addEventListener('click', () => copyToClipboard(content));
        
        // Read aloud button
        const readBtn = document.createElement('button');
        readBtn.className = 'action-btn read-btn';
        readBtn.innerHTML = '🔊';
        readBtn.title = 'Read aloud';
        readBtn.addEventListener('click', () => speakText(content));
        
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(readBtn);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(actionsDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom with smooth behavior
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    function addTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.id = 'typing-indicator';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = 'JL';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        contentDiv.appendChild(typingDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
        return messageDiv;
    }

    function removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    function startNewChat() {
        fetch('/reset', { method: 'POST' })
            .then(() => {
                chatMessages.innerHTML = '';
                welcomeMessage.style.display = 'flex';
                chatMessages.style.display = 'none';
                closeMobileMenu();
                stopSpeech();
                showToast('Chat cleared', 'success');
            })
            .catch(error => {
                console.error('Error resetting chat:', error);
                showToast('Error clearing chat', 'error');
            });
    }

    function toggleSettings() {
        settingsPanel.classList.toggle('active');
        closeMobileMenu();
    }

    async function toggleLanguage() {
        try {
            const response = await fetch('/toggle-language', { method: 'POST' });
            const data = await response.json();
            
            // Update UI
            languageBtn.textContent = data.button_text.split(' → ')[0];
            messageInput.placeholder = data.placeholder;
            
            // Update hint text
            const currentLanguage = data.language;
            const hintText = document.querySelector('.hint-text');
            if (currentLanguage === 'english') {
                hintText.textContent = 'Specialized in Kenyan legal matters only • Press Enter to send';
            } else {
                hintText.textContent = 'Imejikita kwenye masuala ya kisheria ya Kenya pekee • Bonyeza Enter kutuma';
            }
            
            // Update setting
            updateSetting('language', data.language);
            
            showToast(`Language switched to ${data.display_name}`, 'success');
            
        } catch (error) {
            console.error('Error toggling language:', error);
            showToast('Error switching language', 'error');
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        updateSetting('theme', newTheme);
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
    }

    function triggerFileUpload() {
        backgroundUpload.click();
    }

    async function handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const uploadPreview = document.getElementById('uploadPreview');
            uploadPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            uploadPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Upload to server
        const formData = new FormData();
        formData.append('background', file);

        try {
            const response = await fetch('/upload-background', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                applyBackground('uploaded', data.background.value);
                addToRecentUploads(data.background.value);
                document.getElementById('uploadPreview').style.display = 'none';
                document.getElementById('backgroundUpload').value = '';
                
                // Update active state
                updateActiveBackgroundOption('uploaded', data.background.value);
                showToast('Background uploaded successfully', 'success');
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error uploading background:', error);
            showToast('An error occurred during upload', 'error');
        }
    }

    function updateSetting(key, value) {
        // Update CSS custom properties
        switch(key) {
            case 'font_family':
                document.body.style.setProperty('--font-family', value);
                break;
            case 'font_size':
                document.body.style.setProperty('--font-size', value);
                break;
            case 'primary_color':
                document.body.style.setProperty('--primary-color', value);
                document.body.style.setProperty('--primary-hover', adjustColor(value, -20));
                break;
        }

        // Save to server
        fetch('/update-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                settings: { [key]: value }
            })
        });

        // Save to localStorage
        const preferences = JSON.parse(localStorage.getItem('juaHakiPreferences') || '{}');
        preferences[key] = value;
        localStorage.setItem('juaHakiPreferences', JSON.stringify(preferences));
    }

    function adjustColor(color, amount) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => 
            ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
        );
    }

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });

    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        }, 300);
    });

    // Background Management - FIXED VERSION
function initBackground() {
    // Initialize background tabs
    initBackgroundTabs();
    
    // Load recent uploads
    loadRecentUploads();
    
    // Set initial background from server session
    // The background_settings is passed directly from Flask template
    const bgType = '{{ background_settings.type }}';
    const bgValue = '{{ background_settings.value }}';
    const bgSize = '{{ background_settings.size }}';
    
    if (bgType && bgValue) {
        applyBackground(bgType, bgValue, bgSize);
        updateActiveBackgroundOption(bgType, bgValue);
    } else {
        // Fallback to default
        applyBackground('solid', '#ffffff', '');
    }
}

    function initBackgroundTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Update active tab
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
        
        // Background option click handlers
        document.querySelectorAll('.color-option[data-type]').forEach(option => {
            option.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                const value = this.getAttribute('data-value');
                const size = this.getAttribute('data-size') || '';
                
                setBackground(type, value, size);
            });
        });
        
        // Upload area click handler
        const uploadArea = document.getElementById('uploadArea');
        const backgroundUpload = document.getElementById('backgroundUpload');
        
        if (uploadArea) {
            uploadArea.addEventListener('click', () => backgroundUpload.click());
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleFileDrop);
        }

        // Theme color options
        document.querySelectorAll('.color-option[data-color]').forEach(option => {
            option.addEventListener('click', function() {
                const color = this.getAttribute('data-color');
                updateSetting('primary_color', color);
                document.getElementById('customColor').value = color;
                showToast('Theme color updated', 'success');
            });
        });

        // Custom color picker
        document.getElementById('customColor').addEventListener('change', function() {
            updateSetting('primary_color', this.value);
            showToast('Theme color updated', 'success');
        });

        // Voice settings
        document.getElementById('speechRate').addEventListener('input', function() {
            document.getElementById('speechRateValue').textContent = this.value;
            localStorage.setItem('speechRate', this.value);
        });

        document.getElementById('speechPitch').addEventListener('input', function() {
            document.getElementById('speechPitchValue').textContent = this.value;
            localStorage.setItem('speechPitch', this.value);
        });

        document.getElementById('voiceSelect').addEventListener('change', function() {
            localStorage.setItem('selectedVoice', this.value);
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    function handleFileDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleBackgroundUpload({ target: { files: files } });
        }
    }

    async function setBackground(type, value, size = '') {
        try {
            const response = await fetch('/set-background', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: type,
                    value: value,
                    size: size
                })
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                applyBackground(type, value, size);
                updateActiveBackgroundOption(type, value);
                showToast('Background updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error setting background:', error);
            showToast('Error updating background', 'error');
        }
    }

    function applyBackground(type, value, size = '') {
        console.log('Applying background:', type, value, size);
        
        // Set data attribute for CSS targeting
        document.body.setAttribute('data-bg-type', type);
        
        // Remove all background CSS variables
        document.body.style.removeProperty('--bg-solid-color');
        document.body.style.removeProperty('--bg-gradient');
        document.body.style.removeProperty('--bg-pattern');
        document.body.style.removeProperty('--bg-pattern-size');
        document.body.style.removeProperty('--bg-image');
        document.body.style.removeProperty('--bg-uploaded');
        
        // Apply new background based on type
        switch(type) {
            case 'solid':
                document.body.style.setProperty('--bg-solid-color', value);
                break;
            case 'gradient':
                document.body.style.setProperty('--bg-gradient', value);
                break;
            case 'pattern':
                document.body.style.setProperty('--bg-pattern', value);
                if (size) {
                    document.body.style.setProperty('--bg-pattern-size', size);
                }
                break;
            case 'image':
                document.body.style.setProperty('--bg-image', `url('/static/backgrounds/${value}')`);
                break;
            case 'uploaded':
                document.body.style.setProperty('--bg-uploaded', `url('/static/uploads/${value}')`);
                break;
        }
        
        // Save to localStorage
        const bgSettings = {
            type: type,
            value: value,
            size: size
        };
        localStorage.setItem('juaHakiBackground', JSON.stringify(bgSettings));
    }

    function updateActiveBackgroundOption(type, value) {
        // Remove active class from all options
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('active');
        });
        
        document.querySelectorAll('.recent-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and activate the selected option
        let activeOption;
        
        if (type === 'uploaded') {
            activeOption = document.querySelector(`.recent-item[data-filename="${value}"]`);
            if (activeOption) {
                activeOption.classList.add('active');
            }
        } else {
            activeOption = document.querySelector(`.color-option[data-type="${type}"][data-value="${value}"]`);
            if (activeOption) {
                activeOption.classList.add('active');
            }
        }
    }

    function loadRecentUploads() {
        const recentUploads = JSON.parse(localStorage.getItem('juaHakiRecentUploads') || '[]');
        const recentGrid = document.getElementById('recentGrid');
        
        if (!recentGrid) return;
        
        if (recentUploads.length === 0) {
            recentGrid.innerHTML = '<p class="no-uploads">No recent uploads</p>';
            return;
        }
        
        recentGrid.innerHTML = recentUploads.map(filename => `
            <div class="recent-item" data-filename="${filename}">
                <img src="/static/uploads/${filename}" alt="Recent upload" onerror="this.style.display='none'">
            </div>
        `).join('');
        
        // Add click handlers for recent items
        document.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', function() {
                const filename = this.getAttribute('data-filename');
                setBackground('uploaded', filename);
            });
        });
    }

    function addToRecentUploads(filename) {
        let recentUploads = JSON.parse(localStorage.getItem('juaHakiRecentUploads') || '[]');
        
        // Remove if already exists
        recentUploads = recentUploads.filter(f => f !== filename);
        
        // Add to beginning
        recentUploads.unshift(filename);
        
        // Keep only last 6 uploads
        recentUploads = recentUploads.slice(0, 6);
        
        localStorage.setItem('juaHakiRecentUploads', JSON.stringify(recentUploads));
        loadRecentUploads();
    }

    // Voice Controls
    function initVoiceControls() {
        // Load voice settings from localStorage
        const savedVoice = localStorage.getItem('selectedVoice') || 'default';
        document.getElementById('voiceSelect').value = savedVoice;
        
        // Check if speech synthesis is supported
        if (!speechSynthesis) {
            voiceToggleBtn.style.display = 'none';
            console.warn('Speech synthesis not supported');
            return;
        }
        
        // Load voices when they become available
        speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }

    function loadVoices() {
        // This function is called when voices are loaded
        console.log('Voices loaded:', speechSynthesis.getVoices().length);
    }

    function toggleVoice() {
        voiceEnabled = !voiceEnabled;
        voiceToggleBtn.classList.toggle('active', voiceEnabled);
        
        if (voiceEnabled) {
            showToast('Voice reading enabled', 'success');
            voiceControlPanel.classList.add('active');
        } else {
            showToast('Voice reading disabled', 'info');
            voiceControlPanel.classList.remove('active');
            stopSpeech();
        }
    }

    function speakText(text) {
        if (!voiceEnabled || !speechSynthesis) return;
        
        // Clean text (remove markdown)
        const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
        
        stopSpeech(); // Stop any current speech
        
        currentUtterance = new SpeechSynthesisUtterance(cleanText);
        
        // Apply voice settings
        const rate = parseFloat(localStorage.getItem('speechRate') || 1);
        const pitch = parseFloat(localStorage.getItem('speechPitch') || 1);
        const voiceType = localStorage.getItem('selectedVoice') || 'default';
        
        currentUtterance.rate = rate;
        currentUtterance.pitch = pitch;
        
        // Simulate different voices (in a real implementation, you'd use actual voices)
        applyVoiceCharacteristics(currentUtterance, voiceType);
        
        // Event handlers
        currentUtterance.onstart = function() {
            isSpeaking = true;
            isPaused = false;
            playPauseBtn.innerHTML = '⏸️';
            voiceStatus.textContent = 'Speaking...';
            voiceToggleBtn.classList.add('voice-loading');
        };
        
        currentUtterance.onend = function() {
            isSpeaking = false;
            isPaused = false;
            playPauseBtn.innerHTML = '▶️';
            voiceStatus.textContent = 'Finished';
            voiceToggleBtn.classList.remove('voice-loading');
            voiceProgressBar.style.width = '0%';
        };
        
        currentUtterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
            isSpeaking = false;
            isPaused = false;
            playPauseBtn.innerHTML = '▶️';
            voiceStatus.textContent = 'Error';
            voiceToggleBtn.classList.remove('voice-loading');
            showToast('Speech synthesis error', 'error');
        };
        
        currentUtterance.onboundary = function(event) {
            // Update progress (simplified)
            if (event.name === 'word') {
                const progress = (event.charIndex / cleanText.length) * 100;
                voiceProgressBar.style.width = Math.min(progress, 100) + '%';
            }
        };
        
        speechSynthesis.speak(currentUtterance);
    }

    function applyVoiceCharacteristics(utterance, voiceType) {
        // In a real implementation, you would select from available voices
        // This is a simplified version that adjusts rate and pitch to simulate different voices
        switch(voiceType) {
            case 'male1':
                utterance.rate = Math.max(0.8, utterance.rate * 0.9);
                utterance.pitch = Math.max(0.8, utterance.pitch * 0.9);
                break;
            case 'male2':
                utterance.rate = Math.max(0.7, utterance.rate * 0.8);
                utterance.pitch = Math.max(0.7, utterance.pitch * 0.8);
                break;
            case 'female1':
                utterance.rate = Math.min(1.3, utterance.rate * 1.1);
                utterance.pitch = Math.min(1.3, utterance.pitch * 1.1);
                break;
            case 'female2':
                utterance.rate = Math.min(1.5, utterance.rate * 1.2);
                utterance.pitch = Math.min(1.5, utterance.pitch * 1.2);
                break;
            // 'default' uses the settings as is
        }
    }

    function togglePlayPause() {
        if (!currentUtterance) return;
        
        if (isSpeaking && !isPaused) {
            speechSynthesis.pause();
            isPaused = true;
            playPauseBtn.innerHTML = '▶️';
            voiceStatus.textContent = 'Paused';
        } else if (isSpeaking && isPaused) {
            speechSynthesis.resume();
            isPaused = false;
            playPauseBtn.innerHTML = '⏸️';
            voiceStatus.textContent = 'Speaking...';
        }
    }

    function stopSpeech() {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            isSpeaking = false;
            isPaused = false;
            playPauseBtn.innerHTML = '▶️';
            voiceStatus.textContent = 'Stopped';
            voiceProgressBar.style.width = '0%';
            voiceToggleBtn.classList.remove('voice-loading');
        }
    }

    // Utility Functions
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Text copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy text', 'error');
        });
    }

    function copyConversation() {
        const messages = Array.from(chatMessages.querySelectorAll('.message-content'))
            .map(content => content.textContent)
            .join('\n\n');
        
        if (messages.trim()) {
            copyToClipboard(messages);
        } else {
            showToast('No conversation to copy', 'info');
        }
    }

    function clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            startNewChat();
        }
    }

    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});