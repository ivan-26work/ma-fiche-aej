// ===== index.js - Site Stagiaire =====
// Version sans overlay - Redirection vers profil.html si profil incomplet

(function() {
  const SUPABASE_URL = 'https://lnwrwvwunwsqeuluupis.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxud3J3dnd1bndzcWV1bHV1cGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjU2ODYsImV4cCI6MjA4OTM0MTY4Nn0.gfnPMtR3mNBFMTo3GtZ9t1A9_8gxEHY4loLgLdLJxLs';

  // ---------------------------------------------
  // ÉTAT INTERNE
  // ---------------------------------------------
  let supabase = null;
  let currentUser = null;
  let currentSecurite = null;
  let currentFile = null;
  let currentFileCategorie = null;
  let searchTimeout = null;
  let messageTimeout = null;
  let messageInterval = null;

  const DEFAULT_MESSAGE = 'Saisissez votre matricule pour accéder à votre fiche';

  // ---------------------------------------------
  // ÉLÉMENTS DOM
  // ---------------------------------------------
  const loadingOverlay = document.getElementById('loadingOverlay');
  const miniLoader = document.getElementById('miniLoader');
  const infoMessage = document.getElementById('infoMessage');
  const filePlaceholder = document.getElementById('filePlaceholder');
  const filePreview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const fileNameText = document.getElementById('fileNameText');
  const fileActions = document.getElementById('fileActions');
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn = document.getElementById('shareBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // Cases matricule header
  const cases = [
    document.getElementById('case1'),
    document.getElementById('case2'),
    document.getElementById('case3'),
    document.getElementById('case4'),
    document.getElementById('case5'),
    document.getElementById('case6'),
    document.getElementById('case7'),
    document.getElementById('case8'),
    document.getElementById('case9')
  ];

  // ---------------------------------------------
  // GESTION MESSAGES
  // ---------------------------------------------
  function clearMessageTimers() {
    if (messageTimeout) clearTimeout(messageTimeout);
    if (messageInterval) clearInterval(messageInterval);
    messageTimeout = null;
    messageInterval = null;
  }

  function setAutoMessage(messages, index = 0) {
    if (!messages || messages.length === 0) return;
    
    clearMessageTimers();
    
    const showMessage = (idx) => {
      if (idx >= messages.length) {
        updateInfoMessage(DEFAULT_MESSAGE, 'info');
        return;
      }
      
      const msg = messages[idx];
      updateInfoMessage(msg.text, msg.type);
      
      messageTimeout = setTimeout(() => {
        showMessage(idx + 1);
      }, msg.duration || 6000);
    };
    
    showMessage(0);
  }

  function updateInfoMessage(msg, type = 'info', isError = false) {
    const span = infoMessage?.querySelector('span');
    const icon = infoMessage?.querySelector('i');
    if (!span) return;
    
    span.textContent = msg;
    infoMessage.className = 'info-message';
    
    if (type === 'error' || isError) {
      infoMessage.classList.add('error');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else if (type === 'success') {
      infoMessage.classList.add('success');
    } else {
      infoMessage.classList.add('info');
    }
  }

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
      
      setAutoMessage([
        { text: 'Chargement de votre profil...', type: 'info', duration: 2000 }
      ]);
      
      await loadUserData();
      setupMatriculeCases();
      setupEventListeners();
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
      setAutoMessage([
        { text: 'Erreur de chargement', type: 'error', duration: 8000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);
    } finally {
      setTimeout(() => loadingOverlay?.classList.add('hidden'), 700);
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
  // CHARGEMENT DONNÉES UTILISATEUR
  // ---------------------------------------------
  async function loadUserData() {
    try {
      const { data, error } = await supabase
        .from('securite')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement securite:', error);
        handleIncompleteProfile();
        return;
      }

      if (!data) {
        handleIncompleteProfile();
        return;
      }

      currentSecurite = data;
      enableMatriculeCases();
      loadUserMatricule();
      
      if (!data.filiere) {
        setAutoMessage([
          { text: `Bienvenue ${data.prenom} ${data.nom}`, type: 'success', duration: 4000 },
          { text: 'Renseignez votre filière dans Profil', type: 'info', duration: 6000 },
          { text: DEFAULT_MESSAGE, type: 'info' }
        ]);
      } else {
        setAutoMessage([
          { text: `Bienvenue ${data.prenom} ${data.nom}`, type: 'success', duration: 4000 },
          { text: DEFAULT_MESSAGE, type: 'info' }
        ]);
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      handleIncompleteProfile();
    }
  }

  function handleIncompleteProfile() {
    currentSecurite = null;
    disableMatriculeCases();
    setAutoMessage([
      { text: '⚠️ Complétez vos informations dans Profil', type: 'info', duration: 6000 },
      { text: 'Allez dans le menu Profil pour continuer', type: 'info', duration: 6000 },
      { text: DEFAULT_MESSAGE, type: 'info' }
    ]);
  }

  function loadUserMatricule() {
    if (!currentSecurite || !cases[0]) return;
    
    const matricule = currentSecurite.matricule;
    const parts = matricule.split(' ');
    if (parts.length !== 2) return;
    
    const chiffres = parts[0];
    const lettre = parts[1];
    
    for (let i = 0; i < 8; i++) {
      if (cases[i] && chiffres[i]) cases[i].value = chiffres[i];
    }
    if (cases[8] && lettre) cases[8].value = lettre;
  }

  // ---------------------------------------------
  // GESTION CASES HEADER
  // ---------------------------------------------
  function disableMatriculeCases() {
    cases.forEach(c => { if (c) c.disabled = true; });
  }

  function enableMatriculeCases() {
    cases.forEach(c => { if (c) c.disabled = false; });
  }

  function setupMatriculeCases() {
    cases.forEach((input, index) => {
      if (!input) return;
      
      input.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        if (index < 8) value = value.replace(/[^0-9]/g, '');
        else value = value.replace(/[^A-Z]/g, '');
        e.target.value = value;
        
        if (value.length === 1 && index < 8) {
          cases[index + 1]?.focus();
        }
        
        if (index === 8 && value.length === 1) {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            if (validateHeaderCases()) startSearch();
          }, 300);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          cases[index - 1]?.focus();
        }
        if (e.key === 'Enter' && validateHeaderCases()) {
          e.preventDefault();
          startSearch();
        }
      });
    });
  }

  function validateHeaderCases() {
    for (let i = 0; i < 9; i++) {
      if (!cases[i]?.value) return false;
    }
    return true;
  }

  function getHeaderMatricule() {
    let mat = '';
    for (let i = 0; i < 8; i++) mat += cases[i]?.value || '';
    const lettre = cases[8]?.value || '';
    return mat + ' ' + lettre;
  }

  function clearHeaderCases() {
    cases.forEach(c => { if (c) c.value = ''; });
  }

  // ---------------------------------------------
  // RECHERCHE
  // ---------------------------------------------
  function startSearch() {
    if (!currentSecurite) {
      setAutoMessage([
        { text: '⚠️ Complétez d\'abord votre profil', type: 'error', duration: 8000 },
        { text: 'Allez dans Profil pour continuer', type: 'info' }
      ]);
      return;
    }
    
    miniLoader?.classList.remove('hidden');
    setAutoMessage([
      { text: 'Recherche en cours...', type: 'info', duration: 2000 }
    ]);
    searchFile();
  }

  function stopSearch() {
    miniLoader?.classList.add('hidden');
  }

  function resetInterface() {
    stopSearch();
    filePlaceholder?.classList.remove('hidden');
    filePreview?.classList.add('hidden');
    filePreview.innerHTML = '';
    fileName?.classList.add('hidden');
    fileActions?.classList.add('hidden');
    currentFile = null;
    currentFileCategorie = null;
  }

  function showFile(file, url) {
    stopSearch();
    fileNameText.textContent = file.nom;
    fileName?.classList.remove('hidden');
    filePreview.innerHTML = `<iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true" style="width:100%; height:100%; border:none;"></iframe>`;
    filePreview?.classList.remove('hidden');
    filePlaceholder?.classList.add('hidden');
    fileActions?.classList.remove('hidden');
    currentFile = { file, url };
    
    const nomSansExt = file.nom.replace(/\.pdf$/i, '');
    const parties = nomSansExt.split(' ');
    currentFileCategorie = parties.length >= 4 ? parties[3] : 'Fiche';
  }

  async function searchFile() {
    if (!validateHeaderCases()) {
      stopSearch();
      setAutoMessage([
        { text: 'Veuillez remplir toutes les cases du matricule', type: 'error', duration: 8000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);
      return;
    }

    const matriculeSaisi = getHeaderMatricule();

    if (!currentSecurite) {
      stopSearch();
      setAutoMessage([
        { text: 'Profil non chargé - Complétez votre profil', type: 'error', duration: 8000 },
        { text: 'Allez dans Profil pour continuer', type: 'info' }
      ]);
      return;
    }

    const matSaisiNorm = matriculeSaisi.replace(/\s+/g, ' ').trim();
    const matBaseNorm = currentSecurite.matricule.replace(/\s+/g, ' ').trim();

    if (matSaisiNorm !== matBaseNorm) {
      stopSearch();
      setAutoMessage([
        { text: 'Ce matricule ne correspond pas à votre compte', type: 'error', duration: 8000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);
      resetInterface();
      clearHeaderCases();
      loadUserMatricule();
      return;
    }

    try {
      const { data: fichiers, error } = await supabase
        .from('fichiers')
        .select('*')
        .filter('nom', 'ilike', `${matSaisiNorm}%`);

      if (error || !fichiers?.length) {
        stopSearch();
        setAutoMessage([
          { text: 'Aucun fichier trouvé pour ce matricule', type: 'error', duration: 8000 },
          { text: 'Vérifiez auprès de l\'administration', type: 'info' }
        ]);
        resetInterface();
        return;
      }

      const file = fichiers[0];
      const { data: urlData } = supabase.storage
        .from(file.bucket || 'fichiers')
        .getPublicUrl(file.chemin_storage);

      showFile(file, urlData.publicUrl);
      setAutoMessage([
        { text: 'Fichier trouvé', type: 'success', duration: 4000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);

    } catch (error) {
      console.error(error);
      stopSearch();
      setAutoMessage([
        { text: 'Erreur lors de la recherche', type: 'error', duration: 8000 },
        { text: 'Réessayez plus tard', type: 'info' }
      ]);
    }
  }

  // ---------------------------------------------
  // TÉLÉCHARGEMENT
  // ---------------------------------------------
  async function downloadFile() {
    if (!currentFile) return;
    
    if (!currentSecurite?.filiere) {
      setAutoMessage([
        { text: '⛔ Téléchargement bloqué : renseignez d\'abord votre filière dans Profil', type: 'error', duration: 8000 },
        { text: 'Menu → Profil → Renseigner filière', type: 'info' }
      ]);
      return;
    }
    
    try {
      window.open(currentFile.url, '_blank');
      
      await supabase
        .from('telechargements')
        .insert({
          user_id: currentUser.id,
          date_telechargement: new Date().toISOString(),
          categorie: currentFileCategorie || 'Fiche',
          filiere: currentSecurite.filiere
        })
        .then(({ error }) => {
          if (error) console.warn('Erreur enregistrement:', error);
        });
      
      setAutoMessage([
        { text: 'Téléchargement démarré', type: 'success', duration: 4000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);
      
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      setAutoMessage([
        { text: 'Erreur lors du téléchargement', type: 'error', duration: 8000 },
        { text: 'Réessayez ou contactez l\'assistance', type: 'info' }
      ]);
    }
  }

  function openFileDirect() {
    if (!currentFile) return;
    window.open(currentFile.url, '_blank');
    setAutoMessage([
      { text: 'Ouverture du fichier...', type: 'info', duration: 2000 }
    ]);
  }

  function shareFile() {
    if (!currentFile) return;
    if (navigator.share) {
      navigator.share({
        title: 'Ma fiche AEJ',
        url: currentFile.url
      }).catch(() => copyToClipboard());
    } else {
      copyToClipboard();
    }
  }

  function copyToClipboard() {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.url).then(() => {
      setAutoMessage([
        { text: 'Lien copié dans le presse-papier', type: 'success', duration: 4000 },
        { text: DEFAULT_MESSAGE, type: 'info' }
      ]);
    }).catch(() => {
      setAutoMessage([
        { text: 'Impossible de copier le lien', type: 'error', duration: 8000 },
        { text: 'Utilisez le bouton Partager', type: 'info' }
      ]);
    });
  }

  function cancelFile() {
    clearHeaderCases();
    loadUserMatricule();
    resetInterface();
    setAutoMessage([
      { text: 'Saisie annulée', type: 'info', duration: 3000 },
      { text: DEFAULT_MESSAGE, type: 'info' }
    ]);
  }

  // ---------------------------------------------
  // ÉCOUTEURS
  // ---------------------------------------------
  function setupEventListeners() {
    downloadBtn?.addEventListener('click', downloadFile);
    shareBtn?.addEventListener('click', shareFile);
    cancelBtn?.addEventListener('click', cancelFile);
    
    filePlaceholder?.addEventListener('click', () => {
      if (currentSecurite && validateHeaderCases()) startSearch();
    });
    
    fileName?.addEventListener('click', openFileDirect);
  }

  // ---------------------------------------------
  // DÉMARRAGE
  // ---------------------------------------------
  init();
})();
