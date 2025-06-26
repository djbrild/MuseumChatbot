const GOOGLE_API_KEY = 'AIzaSyABr6s-yCq6Af7cF-442FHO3gqqKIsDuIQ';
const GOOGLE_CX = 'c4cf031d6212d4c40';

/**
 * Fonction pour interroger l'API Ollama
 * @param {string} message - Message de l'utilisateur à envoyer à Ollama
 * @returns {Promise<string|null>} - Réponse d'Ollama ou null en cas d'échec
 */
async function queryOllama(message) {
    console.log('queryOllama appelé avec le message:', message);
    try {
        const controller = new AbortController();
        console.log('Préparation de la requête fetch vers Ollama...');
        const timeoutId = setTimeout(() => controller.abort(), 60000); // Timeout de 60 secondes

        // Exemples few-shot pour les réponses préprogrammées
        const fewShotExamples = `
Question: Bonjour, Comment allez-vous?
Réponse: Bonjour ! Je suis votre guide virtuel des musées notament du Maroc. Que puisse-je faire pour vous?

Question: Quel est votre nom?
Réponse: Je suis Museum Chatbot et vous?.

Question: Qui t'as creer?
Réponse: Des étudiants de la faculté des science Moulay Ismail de meknes (maroc).

`;

        const formattedPrompt = `Tu es un assistant spécialisé dans les musée. Voici le contexte et les règles à suivre:
- Tu dois répondre uniquement aux questions concernant les musées tout en maintenant le dialogue
- Tes réponses doivent être concises, précises et factuelles
- Évite les spéculations et les informations non vérifiées

${fewShotExamples}
Question: ${message}

Réponse:`;
        
        console.log('Envoi de la requête à Ollama...');
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.2:1b',
                prompt: formattedPrompt,
                stream: false,
                options: {
                    temperature: 0.5,
                    top_p: 0.95,
                    max_tokens: 500,
                    top_k: 40,
                    repeat_penalty: 1.1,
                    stop: ["Question:", "Human:", "Assistant:"],
                    num_ctx: 2048
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Réponse reçue d\'Ollama, statut:', response.status);
        if (!response.ok) {
            console.error('Erreur API Ollama:', response.status, response.statusText);
            return null;
        }

        console.log('Analyse de la réponse...');
        const data = await response.json();
        console.log('Réponse brute d\'Ollama:', data);
        console.log('Texte de la réponse d\'Ollama:', data.response);
        
        // Validation et nettoyage de la réponse
        if (!data.response || typeof data.response !== 'string') {
            console.error('Réponse invalide d\'Ollama:', data);
            return null;
        }

        // Nettoyage et formatage de la réponse
        let cleanedResponse = data.response.trim();
        
        // Suppression des blocs de code markdown si présents
        cleanedResponse = cleanedResponse.replace(/```[^`]*```/g, '');
        
        // Rejet si la réponse est trop courte ou invalide
        if (cleanedResponse.length < 10) {
            console.log('Réponse trop courte ou invalide');
            return null;
        }

        // Formatage des listes et sections
        cleanedResponse = cleanedResponse
            // Conversion des marqueurs de liste basiques en puces stylisées
            .replace(/^[*-]\s/gm, '• ')
            // Ajout d'espacement entre les sections
            .replace(/\n{3,}/g, '\n\n')
            // Style des listes numérotées
            .replace(/^\d+\.\s/gm, (match) => `<span style="color: #1a73e8; font-weight: 500;">${match}</span>`)
            // Mise en évidence des phrases importantes
            .replace(/\b(Important|Note|Attention|Remarque)\s?:/g, '<strong style="color: #e65100;">$1:</strong>')
            // Formatage des prix
            .replace(/\b(\d+(?:\s?[Dd]irhams?|\s?MAD))\b/g, '<span style="color: #1b5e20; font-weight: 500;">$1</span>')
            // Ajout de séparateurs entre les sections majeures
            .replace(/\n\n(?=[A-Z])/g, '\n\n<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0;">\n\n')
            // Conversion des URLs en liens cliquables
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #1a73e8; text-decoration: none;">$1</a>')
            // Formatage des plages horaires
            .replace(/(\d{1,2}h\d{2}|\d{1,2}h)/g, '<span style="font-family: monospace;">$1</span>')
            // Ajout d'icônes pour les réseaux sociaux
            .replace(/\b(Facebook|Instagram|Twitter)\b/g, (match) => {
                const icons = {
                    'Facebook': '📘',
                    'Instagram': '📸',
                    'Twitter': '🐦'
                };
                return `${icons[match]} ${match}`;
            })
            // Formatage des jours de la semaine
            .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi, 
                     '<span style="text-transform: capitalize; font-weight: 500;">$1</span>');
        
        // Formatage des informations importantes avec des surlignages colorés
        cleanedResponse = cleanedResponse.replace(
            /(Horaires|Tarifs|Contact|Adresse|Téléphone|Email|Description|Informations|Services|Accès|Site web|Réservation):/g, 
            '<strong style="color: #1a73e8;">$1</strong>'
        );
        
        // Ajout d'émojis pour certains mots-clés
        const emojiMap = {
            'musée': '🏛️',
            'exposition': '🎨',
            'art': '🎭',
            'collection': '🗃️',
            'horaires': '🕒',
            'tarifs': '💰',
            'contact': '📞',
            'visite': '🚶',
            'guide': '📱',
            'culture': '🎪',
            'histoire': '📜',
            'patrimoine': '🏺',
            'artiste': '👨‍🎨',
            'galerie': '🖼️',
            'événement': '📅',
            'atelier': '🎯',
            'enfant': '👶',
            'étudiant': '🎓',
            'gratuit': '🆓'
        };
        
        Object.entries(emojiMap).forEach(([word, emoji]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            //cleanedResponse = cleanedResponse.replace(regex, `${emoji} ${word}`);
            cleanedResponse = cleanedResponse.replace(regex, `${word}`);
        });

        return cleanedResponse;
    } catch (error) {
        console.error('Error querying Ollama:', error);
        
        // Gestion des différents types d'erreurs
        if (error.name === 'AbortError') {
            console.log('Délai d\'attente dépassé pour la requête Ollama');
            return 'Je suis désolé, mais la réponse prend trop de temps. Je vais chercher d\'autres sources d\'information.';
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            console.log('Erreur de connexion à Ollama - le service pourrait ne pas être en cours d\'exécution');
            return null;
        }

        // Pour les erreurs inattendues
        console.error('Erreur inattendue d\'Ollama:', error.message);
        return null;
    }
}

/**
 * Attend que le DOM soit complètement chargé avant d'ajouter les écouteurs d'événements
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    /**
     * Message de bienvenue personnalisé
     */
    const welcomeMessage = "Bonjour ! Je suis votre guide virtuel pour les musées du Maroc. Je peux vous fournir des informations détaillées sur nos musées, leurs collections, et leurs services. Comment puis-je vous aider aujourd'hui ?";
    appendMessage('bot', welcomeMessage);

    /**
     * Initialisation des éléments du chat
     */
    const chatbox = document.getElementById('messagesContainer');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    console.log('Elements found:', {
        chatbox: !!chatbox,
        userInput: !!userInput,
        sendButton: !!sendButton
    });

    if (sendButton && userInput) {
        /**
         * Gestion du clic sur le bouton d'envoi
         */
        sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Send button clicked');
            handleUserInput();
        });
        
        /**
         * Gestion de la touche Entrée
         */
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed');
                handleUserInput();
            }
        });
    } else {
        console.error('Send button or input field not found');
    }

    /**
     * Configuration des boutons de réponse rapide
     */
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
    quickReplyBtns.forEach(button => {
        button.addEventListener('click', () => {
            const query = button.dataset.query?.toLowerCase();
            if (query === 'expositions') {
                afficherMusees();
            } else if (query === 'horaires') {
                afficherHoraires();
            } else if (query === 'billetterie') {
                afficherTarifs();
            }
        });
    });
});

/**
 * Ajoute un message dans la zone de chat.
 * @param {string} sender - 'user' ou 'bot' pour définir le style du message.
 * @param {string} message - Le contenu du message à afficher.
 */
function appendMessage(sender, message) {
    const chatbox = document.getElementById('messagesContainer');
    if (chatbox) {
        const div = document.createElement('div');
        div.className = sender;
        if (sender === 'user') {
            div.innerText = message;
        } else {
            div.innerHTML = message;
        }
        chatbox.appendChild(div);
        chatbox.scrollTop = chatbox.scrollHeight;
    }
}


let currentMuseumId = null;

/**
 * Gère la saisie de l'utilisateur
 * Récupère le message, l'affiche et le traite
 */
async function handleUserInput() {
    console.log('handleUserInput called');
    console.log('Attempting to get userInput element...');
    const userInput = document.getElementById('userInput');
    if (!userInput) {
        console.error('User input element not found');
        return;
    }

    const message = userInput.value.trim();
    if (!message) {
        console.log('Empty message, ignoring');
        return;
    }

    console.log('Processing message:', message);
    console.log('Calling appendMessage for user message...');
    appendMessage('user', message);
    userInput.value = '';

    try {
        console.log('Starting processMessage...');
        console.log('Checking Supabase instance:', window.supabaseInstance);
        console.log('Message to process:', message);
        await processMessage(message);
        console.log('processMessage completed successfully');
    } catch (error) {
        console.log('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        console.error('Error processing message:', error);
        console.error('Error stack:', error.stack);
        appendMessage('bot', 'Désolé, une erreur est survenue lors du traitement de votre message.');
    }
}

/**
 * Traite le message de l'utilisateur
 * Analyse le contenu et génère une réponse appropriée
 * @param {string} message - Le message de l'utilisateur à traiter
 */
/**
 * Pre-programmed Q&A pairs for few-shot prompting
 * These are used to provide immediate answers before calling Ollama
 */
const preProgrammedQA = [
    {
        question: "Quels sont les horaires d'ouverture du musée?",
        answer: "Les horaires d'ouverture sont de 9h à 18h du mardi au dimanche."
    },
    {
        question: "Quels sont les tarifs d'entrée?",
        answer: "Le tarif d'entrée est de 50 MAD pour les adultes et 25 MAD pour les étudiants."
    },
    {
        question: "Où se trouve le musée?",
        answer: "Le musée est situé au centre-ville, près de la place principale."
    }
];

/**
 * Function to check if the message matches any pre-programmed question
 * Returns the corresponding answer if found, otherwise null
 */
function getPreProgrammedAnswer(message) {
    const lowerMessage = message.toLowerCase();
    for (const qa of preProgrammedQA) {
        if (lowerMessage.includes(qa.question.toLowerCase())) {
            return qa.answer;
        }
    }
    return null;
}

async function processMessage(message) {
    console.log('processMessage called with:', message);

    // First, check if the message matches any pre-programmed Q&A
    const preAnswer = getPreProgrammedAnswer(message);
    if (preAnswer) {
        console.log('Returning pre-programmed answer');
        appendMessage('bot', preAnswer);
        return;
    }

    // Existing code continues here...
    console.log('Checking Supabase connection...');
    try {
        if (!window.supabaseInstance) {
            console.error('Supabase instance not found');
            appendMessage('bot', 'Erreur de connexion à la base de données.');
            return;
        }
        const { data: testData, error: testError } = await window.supabaseInstance.from('musees').select('count');
        if (testError) {
            console.error('Supabase connection error:', testError);
            appendMessage('bot', 'Erreur de connexion à la base de données.');
            return;
        }
        console.log('Supabase connection successful:', testData);
    } catch (error) {
        console.error('Supabase test failed:', error);
        appendMessage('bot', 'Erreur de connexion à la base de données.');
        return;
    }
    
    const lowerMessage = message.toLowerCase();
    
    // Vérifier si la question concerne des images
    const imageKeywords = ['image', 'photo', 'picture', 'voir', 'montrer', 'afficher', 'galerie'];
    const isImageRequest = imageKeywords.some(keyword => lowerMessage.includes(keyword));

    /**
     * Vérifie si l'utilisateur souhaite terminer la conversation sur le musée actuel
     */
    if (lowerMessage.includes('terminer') || lowerMessage.includes('fin') || lowerMessage.includes('stop')) {
        currentMuseumId = null;
        appendMessage('bot', "La conversation sur le musée est terminée. Vous pouvez poser une nouvelle question.");
        return;
    }

    /**
     * Carte des mots-clés pour identifier les différentes catégories de questions
     * Chaque clé correspond à un type de demande avec ses variations possibles
     */
    const keywordMap = {
        horaires: ['horaire', 'heure', 'ouvert', 'ferme'],
        tarifs: ['tarif', 'prix', 'billet'],
        expositions: ['exposition', 'expositions', 'expo'],
        collections: ['collection', 'collections'],
        contact: ['adresse', 'contact', 'téléphone', 'localisation', 'email', 'map', 'site'],
        description: ['description', 'genre'],
        services: ['service','services', 'accessibilité', 'parking', 'wifi'],
        evenements: ['événement','événements','evenement', 'evenements', 'event', 'programme'],
        mohammed : ['mouhammed', 'mouhamed', 'mohamed', 'mahomed', 'mahommed', 'mahmoud']
    };

    const matched = Object.keys(keywordMap).find(key =>
        keywordMap[key].some(word => lowerMessage.includes(word))
    );

    console.log('Querying Supabase database...');
    const { data: allMuseums, error: museumError } = await window.supabaseInstance
        .from('musees')
        .select('id, nom_court');

    if (museumError) {
        console.error('Supabase error:', museumError);
        appendMessage('bot', "Erreur lors de la récupération des musées.");
        return;
    }

    if (!allMuseums?.length) {
        console.log('No museums found in database');
        appendMessage('bot', "Aucun musée trouvé dans la base de données.");
        return;
    }

    console.log('Found museums:', JSON.stringify(allMuseums, null, 2));

    // Try to find museum in message or use current context
    let foundMuseumEntry = allMuseums.find(m => {
        const museumNameInMessage = lowerMessage.includes(m.nom_court.toLowerCase());
        console.log(`Checking museum "${m.nom_court}":`, museumNameInMessage);
        return museumNameInMessage;
    });

    console.log('Found museum entry:', foundMuseumEntry);

    if (!foundMuseumEntry && currentMuseumId) {
        foundMuseumEntry = allMuseums.find(m => m.id === currentMuseumId);
    }

    // If no museum is found in the database or no keyword match
    if (!foundMuseumEntry || !matched || isImageRequest) {
        console.log("No museum or keyword match found in database, or image request detected");
        console.log("Museum entry:", JSON.stringify(foundMuseumEntry, null, 2));
        console.log("Keyword match:", matched);
        console.log("Is image request:", isImageRequest);
        
        // Ajouter un indicateur de chargement animé
        const loadingId = 'loading-' + Date.now();
        appendMessage('bot', `
            <div id="${loadingId}" style="display: flex; align-items: center; padding: 1rem;">
                <div style="display: flex; gap: 0.3rem; margin-right: 0.5rem;">
                    <div class="loading-dot" style="width: 8px; height: 8px; background-color: #666; border-radius: 50%; animation: loading-bounce 1.4s ease-in-out infinite both; animation-delay: -0.32s;"></div>
                    <div class="loading-dot" style="width: 8px; height: 8px; background-color: #666; border-radius: 50%; animation: loading-bounce 1.4s ease-in-out infinite both; animation-delay: -0.16s;"></div>
                    <div class="loading-dot" style="width: 8px; height: 8px; background-color: #666; border-radius: 50%; animation: loading-bounce 1.4s ease-in-out infinite both;"></div>
                </div>
                <span style="color: #666; font-style: italic;">Génération de la réponse...</span>
            </div>
            <style>
                @keyframes loading-bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
            </style>
        `);
        
        try {
            if (isImageRequest) {
                console.log("Image request detected, redirecting to Google...");
                // Supprimer l'indicateur de chargement
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) {
                    loadingElement.remove();
                }
                
                // Rediriger directement vers Google Search pour les images
                const searchTerms = `musée maroc ${message}`.trim();
                const encodedQuery = encodeURIComponent(searchTerms);
                const searchURL = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodedQuery}&searchType=image&lr=lang_fr&hl=fr`;
                
                try {
                    const googleResponse = await fetch(searchURL);
                    const data = await googleResponse.json();
                    
                    if (data.items && data.items.length > 0) {
                        const imageResults = data.items.slice(0, 3).map(item => `
                            <div style="margin: 1rem 0;">
                                <img src="${item.link}" alt="${item.title}" style="max-width: 100%; height: auto; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                                <p style="margin: 0.5rem 0; font-size: 0.9rem;">${item.title}</p>
                            </div>
                        `).join('');
                        
                        appendMessage('bot', `
                            <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                                <h3 style="margin: 0 0 1rem 0; color: #1a73e8;">Images trouvées :</h3>
                                ${imageResults}
                                <p style="margin-top: 1rem; font-style: italic; color: #666;">Images via Google Search</p>
                            </div>
                        `);
                    } else {
                        appendMessage('bot', `
                            <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                                <p>Désolé, je n'ai pas trouvé d'images correspondant à votre recherche.</p>
                            </div>
                        `);
                    }
                } catch (error) {
                    console.error('Google Image Search error:', error);
                    appendMessage('bot', `
                        <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                            <p>Désolé, je n'ai pas pu effectuer la recherche d'images.</p>
                        </div>
                    `);
                }
                return;
            }
            
            console.log("Calling Ollama with message:", message);
            const ollamaResponse = await queryOllama(message);
            console.log("Ollama response:", ollamaResponse);
            
            // Supprimer l'indicateur de chargement
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                loadingElement.remove();
            }
            if (ollamaResponse) {
                // Format Ollama response in a styled div with enhanced presentation
                appendMessage('bot', `
                    <div style="padding: 1.5rem; background-color: #f8f9fa; border-radius: 0.75rem; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="margin-bottom: 1rem;">
                            ${ollamaResponse}
                        </div>
                        <div style="display: flex; align-items: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e0e0e0;">
                            <span style="font-size: 1.2rem; margin-right: 0.5rem;">🤖</span>
                            <p style="margin: 0; font-style: italic; font-size: 0.8rem; color: #666;">
                                Réponse générée par IA • Musées du Maroc
                            </p>
                        </div>
                    </div>
                `);
                return;
            }

            console.log("No response from Ollama, attempting Google search...");
            appendMessage('bot', `
                <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 1.2rem; margin-right: 0.5rem;">🔍</span>
                        <p style="margin: 0; color: #666;">
                            Je recherche des informations plus détaillées sur le web...
                        </p>
                    </div>
                </div>
            `);
            
            // Fallback to Google Search if Ollama fails
            if (!GOOGLE_API_KEY || !GOOGLE_CX) {
                console.error("Google Search API configuration missing");
                appendMessage('bot', "Je ne peux pas effectuer la recherche pour le moment. Veuillez réessayer plus tard.");
                return;
            }
            // Construct and encode search query
            const searchTerms = `musée ${message}`.trim();
            const encodedQuery = encodeURIComponent(searchTerms);
            
            // Show loading message
            appendMessage('bot', "Recherche en cours...");
            console.log("Initiating Google search for:", searchTerms);
            
            // Construct API URL
            try {
                const searchURL = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodedQuery}&lr=lang_fr&hl=fr`;
                console.log("Search URL (without key):", searchURL.replace(GOOGLE_API_KEY, 'HIDDEN'));
                
                const googleResponse = await fetch(searchURL);
                console.log("Google API response status:", googleResponse.status);

                if (!googleResponse.ok) {
                    const errorText = await googleResponse.text();
                    console.error("Google API Error:", googleResponse.status, errorText);
                    throw new Error(`Erreur lors de la recherche Google: ${googleResponse.status}`);
                }

                const data = await googleResponse.json();
                console.log("Google search response:", data);

                if (data.items && data.items.length > 0) {
                    const results = data.items.slice(0, 1).map(item => {
                        const image = item.pagemap?.cse_image?.[0]?.src || '';
                        const imageTag = image ? `<img src="${image}" alt="${item.title}" style="max-width:100%; height:auto; border-radius: 0.25rem; margin-bottom: 0.5rem;">` : '';
                        return `<div style="margin-bottom: 1rem; padding: 1rem; border-radius: 0.5rem; background-color: #f8f9fa;">
                            <h3 style="margin-bottom: 0.5rem; color: #1a73e8;">${item.title}</h3>
                            ${imageTag}
                            <p style="margin-bottom: 0.5rem;">${item.snippet}</p>
                            <a href="${item.link}" target="_blank" style="color: #1a73e8; text-decoration: none; font-weight: 500;">En savoir plus →</a>
                        </div>`;
                    }).join('');

                    appendMessage('bot', `<div style="margin-top: 1rem;">
                        ${results}
                        <p style="margin-top: 1rem; font-style: italic;">Google Custom Search</p>
                    </div>`);
                } else {
                    appendMessage('bot', `
                        <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                            <p>Je ne trouve pas d'information spécifique pour cette recherche.</p>
                            <p style="margin-top: 0.5rem;">Suggestions :</p>
                            <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                                <li>Vérifiez l'orthographe du nom du musée</li>
                                <li>Essayez avec le nom complet du musée</li>
                                <li>Précisez la ville ou la région</li>
                            </ul>
                        </div>
                    `);
                }
            } catch (error) {
                console.error('Erreur Google Search:', error);
                appendMessage('bot', `
                    <div style="padding: 1rem; background-color: #f8f9fa; border-radius: 0.5rem;">
                        <p>Désolé, je rencontre des difficultés pour effectuer la recherche.</p>
                        <p style="margin-top: 0.5rem;">Vous pouvez :</p>
                        <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                            <li>Réessayer dans quelques instants</li>
                            <li>Reformuler votre question</li>
                            <li>Utiliser les boutons rapides ci-dessous pour explorer nos musées disponibles</li>
                        </ul>
                    </div>
                `);
            }
            return;
        } catch (error) {
            console.error('Erreur Ollama:', error);
            if (error.name === 'AbortError') {
                console.log('Ollama request timed out');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
                console.log('Ollama connection error - service might not be running');
            }
            
            appendMessage('bot', `
                <div style="padding: 1rem; background-color: #fff3e0; border-radius: 0.5rem; margin-bottom: 1rem; border: 1px solid #ffe0b2;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 1.2rem; margin-right: 0.5rem;">ℹ️</span>
                        <p style="margin: 0; color: #e65100;">
                            Je passe à une recherche alternative pour mieux répondre à votre question...
                        </p>
                    </div>
                </div>
            `);
            return;
        }
    }

    // Set current museum context
    currentMuseumId = foundMuseumEntry.id;

    const { data, error } = await window.supabaseInstance
        .from('musees')
        .select('*')
        .eq('id', foundMuseumEntry.id)
        .single();

    if (!data) {
        appendMessage('bot', "Désolé, je n'ai pas pu trouver ce musée.");
        return;
    }

    let response = '';
    switch (matched) {
        case 'horaires':
            response = `🕒 Horaires : ${data.horaires || "Non renseigné"}`;
            break;

        case 'tarifs': {
            const tarifs = await window.supabaseInstance.from('tarifs').select('*').eq('musee_id', data.id);
            if (tarifs.data?.length) {
                response = '💰 Tarifs :\n' + tarifs.data.map(t => `- ${t.categorie} : ${t.prix}`).join('\n');
            } else {
                response = "Aucun tarif disponible pour ce musée.";
            }
            break;
        }

        case 'expositions': {
            const expos = await window.supabaseInstance.from('expositions').select('titre').eq('musee_id', data.id);
            if (expos.data?.length) {
                response = '🎨 Expositions :\n' + expos.data.map(e => `- ${e.titre}`).join('\n');
            } else {
                response = "Aucune exposition trouvée pour ce musée.";
            }
            break;
        }

        case 'collections': {
            const collections = await window.supabaseInstance.from('collections').select('description').eq('musee_id', data.id);
            if (collections.data?.length) {
                response = '🗂️ Collections :\n' + collections.data.map(c => `- ${c.description}`).join('\n');
            } else {
                response = "Aucune collection trouvée pour ce musée.";
            }
            break;
        }

        case 'contact':
            response = `📍 Adresse : ${data.adresse || "Non renseignée"}\n📞 Téléphone : ${data.telephone || "Non renseigné"}\n✉️ Email : ${data.email || "Non renseigné"}`;
            if (data.lien_maps) response += `\n🗺️ Lien Maps : ${data.lien_maps}`;
            if (data.site_web) response += `\n🌐 Site web : ${data.site_web}`;
            break;

        case 'description':
            response = `ℹ️ Description : ${data.description || "Non renseignée"}`;
            break;

        case 'services': {
            const services = await window.supabaseInstance.from('services').select('nom').eq('musee_id', data.id);
            if (services.data?.length) {
                response = '🛎️ Services disponibles :\n' + services.data.map(s => `- ${s.nom}`).join('\n');
            } else {
                response = "Aucun service disponible pour ce musée.";
            }
            break;
        }

        case 'evenements': {
            const events = await window.supabaseInstance.from('evenements').select('titre, date').eq('musee_id', data.id);
            if (events.data?.length) {
                response = '📅 Événements à venir :\n' +
                    events.data.map(e => `- ${e.titre} (${e.date})`).join('\n');
            } else {
                response = "Aucun événement à venir pour ce musée.";
            }
            break;
        }
    }

    if (response) {
        appendMessage('bot', response);
    }
}

/**
 * Affiche la liste complète des musées disponibles
 * Récupère et affiche les noms et villes des musées depuis Supabase
 */
async function afficherMusees() {
    const { data, error } = await window.supabaseInstance.from('musees').select('nom, ville');
    
    if (error) {
        console.error('Erreur :', error);
        appendMessage('bot', "❌ Impossible de charger la liste des musées.");
    } else {
        const introMessage = `<p>Voici la liste des musées de la région disponibles :</p>`;
        const muséesList = data.map(m => `<p><strong>${m.nom}</strong> - ${m.ville}</p>`).join('');
        appendMessage('bot', introMessage + muséesList);
    }
}

/**
 * Affiche les horaires de tous les musées
 * Récupère et affiche les horaires d'ouverture depuis Supabase
 */
async function afficherHoraires() {
    const { data, error } = await window.supabaseInstance.from('musees').select('nom, horaires');

    if (error) {
        console.error('Erreur :', error);
        appendMessage('bot', "<p>❌ Impossible de charger les horaires.</p>");
    } else {
        const introMessage = `<p>🕒 Voici les horaires des musées :</p>`;
        const muséesList = data.map(m => `<p><strong>${m.nom}</strong> : ${m.horaires || "Non renseigné"}</p>`).join('');
        appendMessage('bot', introMessage + muséesList);
    }
}

/**
 * Affiche les tarifs de tous les musées
 * Récupère et affiche les différentes catégories de tarifs depuis Supabase
 */
async function afficherTarifs() {
    const { data, error } = await window.supabaseInstance
        .from('tarifs')
        .select('categorie, prix, musees (nom)');

    if (error) {
        console.error('Erreur :', error);
        appendMessage('bot', "<p>❌ Impossible de charger les tarifs.</p>");
        return;
    }

    if (!data.length) {
        appendMessage('bot', "<p>ℹ️ Aucun tarif disponible pour le moment.</p>");
        return;
    }

    const tarifsParMusee = {};
    data.forEach(t => {
        const nomMusee = t.musees?.nom || 'Musée inconnu';
        if (!tarifsParMusee[nomMusee]) {
            tarifsParMusee[nomMusee] = [];
        }
        tarifsParMusee[nomMusee].push(`- ${t.categorie} : ${t.prix} MAD`);
    });

    const introMessage = `<p>💰 Voici les tarifs des musées :</p>`;
    const tarifsHTML = Object.entries(tarifsParMusee)
        .map(([musee, tarifs]) => `<p><strong>${musee}</strong><br>${tarifs.join('<br>')}</p>`)
        .join('');

    appendMessage('bot', introMessage + tarifsHTML);
}