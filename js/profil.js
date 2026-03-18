// ===== profil.js =====
// Page profil stagiaire avec filière définitive

(function() {
  const SUPABASE_URL = 'https://lnwrwvwunwsqeuluupis.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxud3J3dnd1bndzcWV1bHV1cGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjU2ODYsImV4cCI6MjA4OTM0MTY4Nn0.gfnPMtR3mNBFMTo3GtZ9t1A9_8gxEHY4loLgLdLJxLs';

  let supabase = null;
  let currentUser = null;
  let currentSecurite = null;

  // Éléments DOM
  const loadingOverlay = document.getElementById('loadingOverlay');
  const backBtn = document.getElementById('backBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Éléments affichage
  const displayNom = document.getElementById('displayNom');
  const displayPrenom = document.getElementById('displayPrenom');
  const displayMatricule = document.getElementById('displayMatricule');
  const displayEmail = document.getElementById('displayEmail');
  const displayTelephone = document.getElementById('displayTelephone');
  const displayFiliere = document.getElementById('displayFiliere');
  
  // Éléments modification téléphone
  const editTelephoneBtn = document.getElementById('editTelephoneBtn');
  const editTelephoneForm = document.getElementById('editTelephoneForm');
  const editTelephoneInput = document.getElementById('editTelephoneInput');
  const cancelEditTelephone = document.getElementById('cancelEditTelephone');
  const saveEditTelephone = document.getElementById('saveEditTelephone');
  
  // Éléments filière
  const editFiliereBtn = document.getElementById('editFiliereBtn');
  const filiereOverlay = document.getElementById('filiereOverlay');
  const cancelFiliere = document.getElementById('cancelFiliere');
  const confirmFiliere = document.getElementById('confirmFiliere');
  const filiereInput = document.getElementById('filiereInput');
  
  // Éléments historique
  const historiqueList = document.getElementById('historiqueList');

  // ---------------------------------------------
  // INITIALISATION
  // ---------------------------------------------
  async function init() {
    try {
      await initSupabase();
      const connecte = await checkUser();
      
      if (!connecte) {
        window.location.href = 'auth.html';
        return;
      }
      
      await loadUserData();
      await loadHistorique();
      setupEventListeners();
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
      showNotification('Erreur de chargement', 'error');
    } finally {
      setTimeout(() => loadingOverlay?.classList.add('hidden'), 500);
    }
  }

  async function initSupabase() {
    if (window.supabase?.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      await loadScript();
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }

  function loadScript() {
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      currentUser = user;
      return true;
    } catch (error) {
      console.error('Erreur vérification utilisateur:', error);
      return false;
    }
  }

  // ---------------------------------------------
  // CHARGEMENT DONNÉES
  // ---------------------------------------------
  async function loadUserData() {
    try {
      const { data, error } = await supabase
        .from('securite')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      
      currentSecurite = data;
      
      // Afficher les données
      if (displayNom) displayNom.textContent = data.nom || '-';
      if (displayPrenom) displayPrenom.textContent = data.prenom || '-';
      if (displayMatricule) displayMatricule.textContent = data.matricule || '-';
      if (displayEmail) displayEmail.textContent = currentUser.email || '-';
      if (displayTelephone) displayTelephone.textContent = data.telephone || '-';
      if (displayFiliere) displayFiliere.textContent = data.filiere || '-';
      if (editTelephoneInput) editTelephoneInput.value = data.telephone || '';
      
      // Gérer l'affichage du bouton filière
      updateFiliereButton();
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showNotification('Erreur chargement profil', 'error');
    }
  }

  function updateFiliereButton() {
    if (!editFiliereBtn || !displayFiliere) return;
    
    if (currentSecurite?.filiere) {
      // Filière déjà renseignée : bouton désactivé
      editFiliereBtn.disabled = true;
      editFiliereBtn.title = "Filière déjà renseignée (non modifiable)";
      editFiliereBtn.style.opacity = '0.5';
      editFiliereBtn.style.cursor = 'not-allowed';
      displayFiliere.classList.add('filiere-value');
    } else {
      // Filière non renseignée : bouton actif
      editFiliereBtn.disabled = false;
      editFiliereBtn.title = "Renseigner ma filière";
      editFiliereBtn.style.opacity = '1';
      editFiliereBtn.style.cursor = 'pointer';
    }
  }

  // ---------------------------------------------
  // GESTION FILIÈRE (DÉFINITIVE)
  // ---------------------------------------------
  function showFiliereOverlay() {
    if (currentSecurite?.filiere) {
      showNotification('La filière a déjà été renseignée et ne peut plus être modifiée', 'error');
      return;
    }
    
    filiereOverlay?.classList.remove('hidden');
    setTimeout(() => filiereInput?.focus(), 100);
  }

  function hideFiliereOverlay() {
    filiereOverlay?.classList.add('hidden');
    if (filiereInput) filiereInput.value = '';
  }

  async function saveFiliere() {
    if (!filiereInput || !currentSecurite) return;
    
    const newFiliere = filiereInput.value.trim();
    
    if (!newFiliere) {
      showNotification('Veuillez entrer votre filière', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('securite')
        .update({ filiere: newFiliere })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Mettre à jour l'affichage
      currentSecurite.filiere = newFiliere;
      if (displayFiliere) displayFiliere.textContent = newFiliere;
      
      hideFiliereOverlay();
      updateFiliereButton();
      showNotification('Filière enregistrée', 'success');
      
    } catch (error) {
      console.error('Erreur sauvegarde filière:', error);
      showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  }

  // ---------------------------------------------
  // GESTION MODIFICATION TÉLÉPHONE
  // ---------------------------------------------
  function showEditForm() {
    if (editTelephoneForm) {
      editTelephoneForm.classList.remove('hidden');
      editTelephoneInput?.focus();
    }
  }

  function hideEditForm() {
    if (editTelephoneForm) {
      editTelephoneForm.classList.add('hidden');
      if (editTelephoneInput) editTelephoneInput.value = currentSecurite?.telephone || '';
    }
  }

  function validateTelephone(tel) {
    const cleaned = tel.replace(/\D/g, '');
    return cleaned.length === 10;
  }

  async function saveTelephone() {
    if (!editTelephoneInput || !currentSecurite) return;

    const newTelephone = editTelephoneInput.value.trim();
    
    if (!validateTelephone(newTelephone)) {
      showNotification('Le téléphone doit contenir 10 chiffres', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('securite')
        .update({ telephone: newTelephone })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Mettre à jour l'affichage
      currentSecurite.telephone = newTelephone;
      if (displayTelephone) displayTelephone.textContent = newTelephone;
      
      hideEditForm();
      showNotification('Téléphone mis à jour', 'success');

    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  }

  // ---------------------------------------------
  // HISTORIQUE DES TÉLÉCHARGEMENTS
  // ---------------------------------------------
  async function loadHistorique() {
    try {
      const { data, error } = await supabase
        .from('telechargements')
        .select('date_telechargement, categorie, filiere')
        .eq('user_id', currentUser.id)
        .order('date_telechargement', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        historiqueList.innerHTML = `
          <div class="empty-historique">
            <i class="fas fa-download"></i>
            <p>Aucun téléchargement récent</p>
          </div>
        `;
        return;
      }

      let html = '';
      data.forEach(item => {
        const date = new Date(item.date_telechargement);
        const dateStr = date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
          <div class="historique-item">
            <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="historique-date">
                  <i class="fas fa-calendar"></i>
                  ${dateStr}
                </span>
                <span class="historique-time">
                  <i class="fas fa-clock"></i>
                  ${timeStr}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem; flex-wrap: wrap;">
                <span style="display: flex; align-items: center; gap: 0.3rem; background: var(--bg-soft); padding: 0.2rem 0.8rem; border-radius: 20px;">
                  <i class="fas fa-tag" style="color: var(--primary-pink); font-size: 0.8rem;"></i>
                  <span style="font-size: 0.8rem;">${item.categorie || 'Fiche'}</span>
                </span>
                ${item.filiere ? `
                <span style="display: flex; align-items: center; gap: 0.3rem; background: rgba(74,144,226,0.1); padding: 0.2rem 0.8rem; border-radius: 20px;">
                  <i class="fas fa-graduation-cap" style="color: var(--primary-blue); font-size: 0.8rem;"></i>
                  <span style="font-size: 0.8rem;">${item.filiere}</span>
                </span>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });

      historiqueList.innerHTML = html;

    } catch (error) {
      console.error('Erreur chargement historique:', error);
      historiqueList.innerHTML = `
        <div class="empty-historique">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur de chargement</p>
        </div>
      `;
    }
  }

  // ---------------------------------------------
  // DÉCONNEXION
  // ---------------------------------------------
  async function handleLogout() {
    if (!supabase) return;
    
    logoutBtn.classList.add('logging-out');
    logoutBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Déconnexion...';
    
    try {
      await supabase.auth.signOut();
      setTimeout(() => window.location.href = 'auth.html', 800);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      logoutBtn.classList.remove('logging-out');
      logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Déconnexion';
      showNotification('Erreur lors de la déconnexion', 'error');
    }
  }

  // ---------------------------------------------
  // NOTIFICATION
  // ---------------------------------------------
  function showNotification(message, type = 'info', duration = 2000) {
    const notif = document.createElement('div');
    notif.className = `temp-notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'notif-disappear 0.3s ease forwards';
      setTimeout(() => notif.remove(), 300);
    }, duration);
  }

  // ---------------------------------------------
  // ÉCOUTEURS
  // ---------------------------------------------
  function setupEventListeners() {
    // Retour à l'accueil
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'index.html';
      });
    }

    // Bouton déconnexion
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // Modification téléphone
    if (editTelephoneBtn) {
      editTelephoneBtn.addEventListener('click', showEditForm);
    }

    if (cancelEditTelephone) {
      cancelEditTelephone.addEventListener('click', hideEditForm);
    }

    if (saveEditTelephone) {
      saveEditTelephone.addEventListener('click', saveTelephone);
    }

    // Validation téléphone (uniquement chiffres)
    if (editTelephoneInput) {
      editTelephoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
      });

      editTelephoneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveTelephone();
        }
      });
    }

    // Gestion filière
    if (editFiliereBtn) {
      editFiliereBtn.addEventListener('click', showFiliereOverlay);
    }

    if (cancelFiliere) {
      cancelFiliere.addEventListener('click', hideFiliereOverlay);
    }

    if (confirmFiliere) {
      confirmFiliere.addEventListener('click', saveFiliere);
    }

    if (filiereInput) {
      filiereInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveFiliere();
        }
      });
    }

    // Fermer overlay en cliquant sur le backdrop
    if (filiereOverlay) {
      filiereOverlay.addEventListener('click', (e) => {
        if (e.target === filiereOverlay) {
          hideFiliereOverlay();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !filiereOverlay.classList.contains('hidden')) {
          hideFiliereOverlay();
        }
      });
    }

    // Recharger l'historique quand la page devient visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && currentUser) {
        loadHistorique();
      }
    });
  }

  // ---------------------------------------------
  // DÉMARRAGE
  // ---------------------------------------------
  init();
})();