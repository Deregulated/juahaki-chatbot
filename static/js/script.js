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

    // Initialize
    initSettings();
    loadUserPreferences();
    setupMobileMenu();

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

    // Quick question buttons
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            messageInput.value = question;
            sendMessage();
        });
    });

    // Background options
    document.querySelectorAll('.bg-option').forEach(option => {
        option.addEventListener('click', function() {
            const bg = this.getAttribute('data-bg');
            setBackground(bg, 'predefined');
        });
    });

    // Font family selector
    document.getElementById('fontFamily').addEventListener('change', function() {
        updateSetting('font_family', this.value);
    });

    // Font size slider
    document.getElementById('fontSize').addEventListener('input', function() {
        const size = this.value + 'px';
        document.getElementById('fontSizeValue').textContent = size;
        updateSetting('font_size', size);
    });

    // Color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            updateSetting('primary_color', color);
            document.getElementById('customColor').value = color;
        });
    });

    // Custom color picker
    document.getElementById('customColor').addEventListener('change', function() {
        updateSetting('primary_color', this.value);
    });

    // Functions
    function setupMobileMenu() {
        if (mobileMenuBtn && sidebar && mobileOverlay) {
            mobileMenuBtn.addEventListener('click', toggleMobileMenu);
            mobileOverlay.addEventListener('click', closeMobileMenu);
            
            // Close menu when clicking on sidebar links (future enhancement)
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
    }

    function loadUserPreferences() {
        // Load from localStorage if available
        const preferences = JSON.parse(localStorage.getItem('juaHakiPreferences') || '{}');
        
        if (preferences.background) {
            setBackground(preferences.background, preferences.backgroundType);
        }
        
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
        // Auto-resize textarea (if we change to textarea in future)
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
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
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
                closeMobileMenu(); // Close sidebar on mobile
            })
            .catch(error => {
                console.error('Error resetting chat:', error);
            });
    }

    function toggleSettings() {
        settingsPanel.classList.toggle('active');
        closeMobileMenu(); // Close sidebar when opening settings
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
                hintText.textContent = 'Specialized in Kenyan legal matters only';
            } else {
                hintText.textContent = 'Imejikita kwenye masuala ya kisheria ya Kenya pekee';
            }
            
            // Update setting
            updateSetting('language', data.language);
            
        } catch (error) {
            console.error('Error toggling language:', error);
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        updateSetting('theme', newTheme);
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
                setBackground(data.filename, 'uploaded');
                uploadPreview.style.display = 'none';
                backgroundUpload.value = '';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error uploading background:', error);
            alert('An error occurred during upload');
        }
    }

    function setBackground(filename, type) {
        let bgUrl;
        
        if (type === 'uploaded') {
            bgUrl = `url('/static/uploads/${filename}')`;
        } else {
            bgUrl = `url('/static/backgrounds/${filename}')`;
        }
        
        document.body.style.backgroundImage = bgUrl;
        
        // Update settings
        updateSetting('background', filename);
        updateSetting('background_type', type);
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
        // Simple color adjustment for hover states
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
});