/**
 * Fichier admin2.js
 * Gestion de l'interface d'administration des musées.
 * Utilise Supabase pour l'authentification et la gestion des données.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    const museumModal = document.getElementById('museumModal');
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const adminEmail = document.getElementById('adminEmail');
    const adminPassword = document.getElementById('adminPassword');
    const addMuseumButton = document.getElementById('addMuseumButton');
    const museumsList = document.getElementById('museumsList');
    const museumForm = document.getElementById('museumForm');
    const cancelButton = document.getElementById('cancelButton');
    const modalTitle = document.getElementById('modalTitle');

    // Set initial visibility state
    if (museumModal) {
        museumModal.classList.add('hidden');
    }
    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (loginSection) loginSection.classList.remove('hidden');

    // État
    let editingMuseumId = null;

    // Function to ensure modal is hidden
    const hideModal = () => {
        if (museumModal) {
            museumModal.classList.add('hidden');
            // Reset form when hiding modal
            if (museumForm) museumForm.reset();
            editingMuseumId = null;
        }
    };

    // Function to show modal
    const showModal = () => {
        if (museumModal) {
            museumModal.classList.remove('hidden');
        }
    };

    // Vérification de l'authentification
    const checkAuth = async () => {
        hideModal(); // Ensure modal is hidden before auth check
        try {
            console.log('Vérification de l\'authentification...');
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Erreur d\'authentification :', error);
                throw error;
            }
            
            const isAuthenticated = !!session;
            console.log('Statut d\'authentification :', isAuthenticated);
            
            // Always show login section if not authenticated
            if (!isAuthenticated) {
                loginSection.classList.remove('hidden');
                dashboardSection.classList.add('hidden');
                return;
            }
            
            // Only show dashboard if authenticated
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            console.log('Utilisateur authentifié, affichage des musées...');
            await renderMuseums();
        } catch (error) {
            console.error('Échec de la vérification d\'authentification :', error);
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
        }
    };

    // Gestion de la connexion
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginButton = document.getElementById('loginButton');
        
        try {
            // Ensure dashboard is hidden during login attempt
            dashboardSection.classList.add('hidden');
            loginButton.disabled = true;
            loginButton.classList.add('loading');
            console.log('Tentative de connexion...');
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: adminEmail.value,
                password: adminPassword.value
            });

            if (error) {
                console.error('Erreur de connexion :', error);
                throw error;
            }

            console.log('Connexion réussie :', data);
            // Clear form and check auth state
            adminEmail.value = '';
            adminPassword.value = '';
            hideModal();
            await checkAuth(); // This will show dashboard if auth successful
        } catch (error) {
            console.error('Échec de la connexion :', error);
            alert('Erreur de connexion : ' + (error.message || 'Veuillez vérifier vos identifiants'));
        } finally {
            loginButton.disabled = false;
            loginButton.classList.remove('loading');
        }
    });

    // Gestion de la déconnexion
    logoutButton.addEventListener('click', async () => {
        try {
            logoutButton.disabled = true;
            logoutButton.classList.add('loading');
            await supabase.auth.signOut();
            await checkAuth();
        } catch (error) {
            console.error('Erreur lors de la déconnexion :', error);
            alert('Erreur lors de la déconnexion');
        } finally {
            logoutButton.disabled = false;
            logoutButton.classList.remove('loading');
        }
    });

    // Affichage de la liste des musées
    const renderMuseums = async () => {
        hideModal(); // Hide modal before rendering museums
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                loginSection.classList.remove('hidden');
                dashboardSection.classList.add('hidden');
                return;
            }

            const { data: museums, error } = await supabase
                .from('musees')
                .select('*');

            if (error) throw error;

            museumsList.innerHTML = '';
            museums.forEach((museum) => {
                const card = document.createElement('div');
                card.className = 'museum-card';
                card.innerHTML = `
                    <div class="museum-card-header">
                        <div>
                            <h3>${museum.nom || 'N/A'}</h3>
                            <p>${museum.ville || 'N/A'}</p>
                        </div>
                        <div class="museum-card-actions">
                            <button class="button button-ghost" onclick="window.editMuseum('${museum.id}')">Modifier</button>
                            <button class="button button-danger" onclick="window.deleteMuseum('${museum.id}')">Supprimer</button>
                        </div>
                    </div>
                    <p>${museum.description && typeof museum.description === 'string' ? museum.description.substring(0, 200) : 'N/A'}...</p>
                `;
                museumsList.appendChild(card);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des musées :', error);
            alert('Erreur lors du chargement des musées');
        }
    };

    // Gestion du bouton d'ajout de musée
    addMuseumButton.addEventListener('click', async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Veuillez vous connecter pour ajouter un musée');
            return;
        }
        editingMuseumId = null;
        modalTitle.textContent = 'Ajouter un Musée';
        museumForm.reset();
        showModal();
    });

    // Gestion du bouton annuler
    cancelButton.addEventListener('click', () => {
        hideModal();
    });

    // Gestion de la soumission du formulaire
    museumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Veuillez vous connecter pour enregistrer un musée');
            return;
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.classList.add('loading');
        
        const museumData = {
            nom: document.getElementById('museumName').value,
            nom_court: document.getElementById('museumShortName') ? document.getElementById('museumShortName').value : '',
            ville: document.getElementById('museumLocation').value,
            adresse: document.getElementById('museumAddress') ? document.getElementById('museumAddress').value : '',
            telephone: document.getElementById('museumPhone') ? document.getElementById('museumPhone').value : '',
            email: document.getElementById('museumEmail') ? document.getElementById('museumEmail').value : '',
            site_web: document.getElementById('museumWebsite') ? document.getElementById('museumWebsite').value : '',
            lien_maps: document.getElementById('museumMaps') ? document.getElementById('museumMaps').value : '',
            horaires: document.getElementById('museumHours').value,
            description: document.getElementById('museumDescription').value,
            
        };

        try {
            let museeId = editingMuseumId || null;

            if (editingMuseumId) {
                // Mise à jour d'un musée existant
                console.log('Mise à jour du musée :', museumData);
                const { data, error } = await supabase
                    .from('musees')
                    .update(museumData)
                    .eq('id', editingMuseumId)
                    .select();

                if (error) {
                    console.error('Erreur de mise à jour :', error);
                    throw error;
                }
                console.log('Résultat de la mise à jour :', data);
            } else {
                // Ajout d'un nouveau musée
                console.log('Ajout d\'un nouveau musée :', museumData);
                const { data, error } = await supabase
                    .from('musees')
                    .insert([museumData])
                    .select();

                if (error) {
                    console.error('Erreur d\'insertion :', error);
                    throw error;
                }
                console.log('Résultat de l\'insertion :', data);
                museeId = data[0]?.id;
            }
            
            // 🔄 Enregistrer les expositions liées à ce musée
            const getInputsValues = (prefix, count = 6) => {
                let values = [];
                for (let i = 1; i <= count; i++) {
                    const val = document.getElementById(`${prefix}${i}`)?.value.trim();
                    if (val) values.push(val);
                }
                return values;
            };

            //const expositions = getInputsValues('expositions');
            const objets = getInputsValues('objets');
            const collections = getInputsValues('collections');
            const evenements = getInputsValues('evenements');
            const services = getInputsValues('services');
            
            //Récupération des données du formulaire
            const expositions = [];
            for (let i = 1; i <= 6; i++) {
                const titre = document.getElementById(`expositions${i}`)?.value.trim();
                const info = document.getElementById(`expositions_info${i}`)?.value.trim();

                if (titre || info) {  // au moins un des deux renseigné
                    expositions.push({ titre, infos: info, musee_id: museeId });
                }
            }
            
            // Supprimer les anciennes données expositions 
            await supabase
                .from('expositions')
                .delete()
                .eq('musee_id', museeId);
            // Réinsérer les nouvelles données pour expositions 
            for (const exposition of expositions) {
                const { error } = await supabase
                    .from('expositions')
                    .insert([exposition]);  // titre, infos, musee_id déjà dans l'objet

                if (error) {
                    console.error('Erreur lors de l’insertion d’une exposition :', error);
                }
            }


            /*// Supprimer les anciennes données objets 
            await supabase
                .from('objets')
                .delete()
                .eq('musee_id', museeId);
            // Réinsérer les nouvelles données pour objets 
            for (const nom of objets) {
                const { error } = await supabase.from('services').insert([
                    { nom: nom, musee_id: museeId }
                ]);
                if (error) console.error('Erreur lors de l’insertion d’un service :', error);
            }*/


            // Supprimer les anciennes données collections 
            await supabase.
                from('collections')
                .delete()
                .eq('musee_id', museeId);
            // Réinsérer les nouvelles données pour collections 
            for (const nom of collections) {
                const { error } = await supabase.from('collections').insert([
                    { description: nom, musee_id: museeId }
                ]);
                if (error) console.error('Erreur lors de l’insertion d’une collection :', error);
            }

            // Supprimer les anciennes données evenements 
            await supabase
                .from('evenements')
                .delete()
                .eq('musee_id', museeId);
            // Réinsérer les nouvelles données pour evenements 
            for (const titre of evenements) {
                const { error } = await supabase.from('evenements').insert([
                    { titre: titre, musee_id: museeId }
                ]);
                if (error) console.error('Erreur lors de l’insertion d’un événement :', error);
            }

            // Supprimer les anciennes données services 
            await supabase
                .from('services')
                .delete()
                .eq('musee_id', museeId);
            // Réinsérer les nouvelles données pour services
            for (const nom of services) {
                const { error } = await supabase.from('services').insert([
                    { service: nom, musee_id: museeId }
                ]);
                if (error) console.error('Erreur lors de l’insertion d’un service :', error);
            }



            ///////////////////

            hideModal();
            renderMuseums();
            alert('Musée enregistré avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement :', error);
            alert('Erreur lors de l\'enregistrement du musée. Veuillez réessayer.');
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
    });

    // Fonction d'édition d'un musée (accessible globalement pour onclick)
    window.editMuseum = async (id) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Veuillez vous connecter pour modifier un musée');
            return;
        }

        const editButton = document.querySelector(`button[onclick="window.editMuseum('${id}')"]`);
        try {
            editButton.disabled = true;
            editButton.classList.add('loading');
            console.log('Édition du musée avec ID :', id);

            // 1. Récupération des éléments du musée
            const { data: museum, error: museumError } = await supabase
                .from('musees')
                .select('*')
                .eq('id', id)
                .single();

                if (museumError) {
                    console.error('Erreur lors de la récupération du musée :', museumError);
                    throw museumError;
                }

                console.log('Données du musée récupérées :', museum);
                editingMuseumId = id;
                modalTitle.textContent = 'Modifier le Musée';
                document.getElementById('museumName').value = museum.nom || '';
                document.getElementById('museumShortName').value = museum.nom_court || '';
                document.getElementById('museumAddress').value = museum.adresse || '';
                document.getElementById('museumPhone').value = museum.telephone || '';
                document.getElementById('museumEmail').value = museum.email || '';
                document.getElementById('museumWebsite').value = museum.site_web || '';
                document.getElementById('museumMaps').value = museum.lien_maps || '';
                document.getElementById('museumLocation').value = museum.ville || '';
                document.getElementById('museumHours').value = museum.horaires || '';
                document.getElementById('museumDescription').value = museum.description || '';

                // 2. Récupération des tarifs liés au musée
                const { data: tarifs, error: tarifsError } = await supabase
                    .from('tarifs')
                    .select('categorie, prix')
                    .eq('musee_id', id);

                    if (tarifsError) {
                        console.error('Erreur en récupérant les tarifs :', tarifsError);
                    } else {
                        // 2.1. Remplissage des champs tarifaires selon la catégorie
                        tarifs.forEach(tarif => {
                            const cat = tarif.categorie.toLowerCase();
                            if (cat === 'enfant') {
                                document.getElementById('tarifEnfant').value = tarif.prix || '';
                            } else if (cat === 'adulte') {
                                document.getElementById('tarifAdulte').value = tarif.prix || '';
                            } else if (cat === 'étudiant' || cat === 'etudiant') {
                                document.getElementById('tarifEtudiant').value = tarif.prix || '';
                            } else if (cat === 'entree_generale' || cat === 'entree_generale') {
                                document.getElementById('entree_generale').value = tarif.prix || '';
                            }
                        });
                    }
                //3. Récupération des expositions ---
                const { data: expositions, error: exposError } = await supabase
                    .from('expositions')
                    .select('id, titre, infos')
                    .eq('musee_id', id);

                if (exposError) {
                    console.error('Erreur en récupérant les expositions :', exposError);
                } else {
                    // Remplir jusqu'à 6 champs avec les titres d'expositions
                    for (let i = 1; i <= 6; i++) {
                        const titreInput  = document.getElementById(`expositions${i}`);
                        const infosInput = document.getElementById(`expositions_info${i}`); 
                        if (titreInput) {
                            titreInput.value = expositions[i - 1]?.titre || '';
                        }
                        if (infosInput) {
                            infosInput.value = expositions[i - 1]?.infos || '';
                        }
                    }
                }

                //4. Récupération des collections ---
                const { data: collections, error: collectionsError } = await supabase
                    .from('collections')
                    .select('id, description')
                    .eq('musee_id', id);

                if (collectionsError) {
                    console.error('Erreur en récupérant les collections :', collectionsError);
                } else {
                    for (let i = 1; i <= 6; i++) {
                        const input = document.getElementById(`collections${i}`);
                        if (input) {
                            input.value = collections[i - 1]?.description || '';
                        }
                    }
                }
                
                //5. Récupération des événements ---
                const { data: evenements, error: evenementsError } = await supabase
                    .from('evenements')
                    .select('id, titre')
                    .eq('musee_id', id);

                if (evenementsError) {
                    console.error('Erreur en récupérant les événements :', evenementsError);
                } else {
                    for (let i = 1; i <= 6; i++) {
                        const input = document.getElementById(`evenements${i}`);
                        if (input) {
                            input.value = evenements[i - 1]?.titre || '';
                        }
                    }
                }

                //6. Récupération des services ---
                const { data: services, error: servicesError } = await supabase
                    .from('services')
                    .select('id, service')
                    .eq('musee_id', id);

                if (servicesError) {
                    console.error('Erreur en récupérant les services :', servicesError);
                } else {
                    for (let i = 1; i <= 8; i++) {
                        const input = document.getElementById(`services${i}`);
                        if (input) {
                            input.value = services[i - 1]?.service || '';
                        }
                    }
                }



            showModal();
            } catch (error) {
                console.error('Erreur lors du chargement du musée :', error);
                alert('Erreur lors du chargement du musée');
            } finally {
                if (editButton) {
                    editButton.disabled = false;
                    editButton.classList.remove('loading');
                }
        }
    };

    // Fonction de suppression d'un musée (accessible globalement pour onclick)
    window.deleteMuseum = async (id) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Veuillez vous connecter pour supprimer un musée');
            return;
        }

        if (confirm('Êtes-vous sûr de vouloir supprimer ce musée ?')) {
            const deleteButton = document.querySelector(`button[onclick="window.deleteMuseum('${id}')"]`);
            try {
                deleteButton.disabled = true;
                deleteButton.classList.add('loading');
                console.log('Suppression du musée :', id);
                
                const { error } = await supabase
                    .from('musees')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                await renderMuseums();
            } catch (error) {
                console.error('Erreur lors de la suppression du musée :', error);
                alert('Erreur lors de la suppression du musée');
            } finally {
                if (deleteButton) {
                    deleteButton.disabled = false;
                    deleteButton.classList.remove('loading');
                }
            }
        }
    };

    // Fermer la fenêtre modale en cliquant en dehors
    museumModal.addEventListener('click', (e) => {
        if (e.target === museumModal) {
            hideModal();
        }
    });

    // Ensure modal is hidden when escape key is pressed
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal();
        }
    });

    // Initialisation
    checkAuth();
});
