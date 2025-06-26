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

        // Messages structurés pour few-shot prompting
        const messages = [
            {
                role: "system",
                content: `Tu es un assistant spécialisé dans les musée. Voici le contexte et les règles à suivre:
- Tu dois répondre uniquement aux questions concernant les musées tout en maintenant le dialogue
- Tes réponses doivent être concises, précises et factuelles
- Évite les spéculations et les informations non vérifiées`
            },
            {
                role: "user",
                content: "Quels sont les horaires d'ouverture aaaaaa du musée?"
            },
            {
                role: "assistant",
                content: "Les horaires d'ouverture sont de 9h à 18h du mardi au dimanche."
            },
            {
                role: "user",
                content: "Quels sont les tarifs d'entrée?"
            },
            {
                role: "assistant",
                content: "Le tarif d'entrée est de 50 MAD pour les adultes et 25 MAD pour les étudiants."
            },
            {
                role: "user",
                content: "Où se trouve le musée?"
            },
            {
                role: "assistant",
                content: "Le musée est situé au centre-ville, près de la place principale."
            },
            {
                role: "user",
                content: message
            }
        ];

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama3.2:1b',
                messages: messages,
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

        if (!data.response || typeof data.response !== 'string') {
            console.error('Réponse invalide d\'Ollama:', data);
            return null;
        }

        let cleanedResponse = data.response.trim();

        cleanedResponse = cleanedResponse.replace(/```[^`]*```/g, '');

        if (cleanedResponse.length < 10) {
            console.log('Réponse trop courte ou invalide');
            return null;
        }

        cleanedResponse = cleanedResponse
            .replace(/^[*-]\s/gm, '• ')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\d+\.\s/gm, (match) => `<span style="color: #1a73e8; font-weight: 500;">${match}</span>`)
            .replace(/\b(Important|Note|Attention|Remarque)\s?:/g, '<strong style="color: #e65100;">$1:</strong>')
            .replace(/\b(\d+(?:\s?[Dd]irhams?|\s?MAD))\b/g, '<span style="color: #1b5e20; font-weight: 500;">$1</span>')
            .replace(/\n\n(?=[A-Z])/g, '\n\n<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0;">\n\n')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #1a73e8; text-decoration: none;">$1</a>')
            .replace(/(\d{1,2}h\d{2}|\d{1,2}h)/g, '<span style="font-family: monospace;">$1</span>')
            .replace(/\b(Facebook|Instagram|Twitter)\b/g, (match) => {
                const icons = {
                    'Facebook': '📘',
                    'Instagram': '📸',
                    'Twitter': '🐦'
                };
                return `${icons[match]} ${match}`;
            })
            .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi,
                '<span style="text-transform: capitalize; font-weight: 500;">$1</span>');

        cleanedResponse = cleanedResponse.replace(
            /(Horaires|Tarifs|Contact|Adresse|Téléphone|Email|Description|Informations|Services|Accès|Site web|Réservation):/g,
            '<strong style="color: #1a73e8;">$1</strong>'
        );

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
            cleanedResponse = cleanedResponse.replace(regex, `${emoji} ${word}`);
        });

        return cleanedResponse;
    } catch (error) {
        console.error('Error querying Ollama:', error);

        if (error.name === 'AbortError') {
            console.log('Délai d\'attente dépassé pour la requête Ollama');
            return 'Je suis désolé, mais la réponse prend trop de temps. Je vais chercher d\'autres sources d\'information.';
        }

        if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            console.log('Erreur de connexion à Ollama - le service pourrait ne pas être en cours d\'exécution');
            return null;
        }

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
async function processMessage(message) {
    console.log('processMessage called with:', message);

    // Always use Ollama for all queries
    try {
        const ollamaResponse = await queryOllama(message);
        console.log("Ollama response:", ollamaResponse);

        if (ollamaResponse) {
            // Sanitize response to remove any mention of Google Search
            let sanitizedResponse = ollamaResponse.replace(/Images via Google Search/gi, '');
            sanitizedResponse = sanitizedResponse.replace(/Google Search/gi, '');
            sanitizedResponse = sanitizedResponse.replace(/Google/gi, '');

            appendMessage('bot', `
                <div style="padding: 1.5rem; background-color: #f8f9fa; border-radius: 0.75rem; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="margin-bottom: 1rem;">
                        ${sanitizedResponse}
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
        } else {
            appendMessage('bot', "Désolé, je n'ai pas pu obtenir de réponse de l'assistant IA.");
        }
    } catch (error) {
        console.error('Erreur lors de l\'appel à Ollama:', error);
        appendMessage('bot', "Une erreur est survenue lors de la communication avec l'assistant IA.");
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
