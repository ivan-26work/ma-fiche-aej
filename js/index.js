// ===== index.js - Site Stagiaire =====
// Version avec vérification filière + enregistrement filière dans téléchargements

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
  let etape = 1;

  // Données temporaires pour l'overlay
  let tempData = {
    nom: '',
    prenom: '',
    matricule: '',
    telephone: ''
  };

  // ---------------------------------------------
  // ÉLÉMENTS DOM PRINCIPAUX
  // ---------------------------------------------
  const loadingOverlay = document.getElementById('loadingOverlay');
  const infoOverlay = document.getElementById('infoOverlay');
  const miniLoader = document.getElementById('miniLoader');
  const infoMessage = document.getElementById('infoMessage');
  const infoBar = document.getElementById('infoBar');
  const filePlaceholder = document.getElementById('filePlaceholder');
  const filePreview = document.getElementById('filePreview');
  const fileName = document.getElementById('fileName');
  const fileNameText = document.getElementById('fileNameText');
  const fileActions = document.getElementById('fileActions');
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn = document.getElementById('shareBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // Éléments des cases matricule (header)
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

  // Éléments overlay étape 1
  const step1 = document.getElementById('step1');
  const step1Next = document.getElementById('step1Next');
  const stepNom = document.getElementById('stepNom');
  const stepPrenom = document.getElementById('stepPrenom');

  // Éléments overlay étape 2
  const step2 = document.getElementById('step2');
  const step2Back = document.getElementById('step2Back');
  const step2Next = document.getElementById('step2Next');
  const stepCases = [
    document.getElementById('stepCase1'),
    document.getElementById('stepCase2'),
    document.getElementById('stepCase3'),
    document.getElementById('stepCase4'),
    document.getElementById('stepCase5'),
    document.getElementById('stepCase6'),
    document.getElementById('stepCase7'),
    document.getElementById('stepCase8'),
    document.getElementById('stepCase9')
  ];
  const stepTelephone = document.getElementById('stepTelephone');

  // Éléments overlay étape 3
  const step3 = document.getElementById('step3');
  const step3Back = document.getElementById('step3Back');
  const step3Save = document.getElementById('step3Save');
  const confirmNom = document.getElementById('confirmNom');
  const confirmPrenom = document.getElementById('confirmPrenom');
  const confirmMatricule = document.getElementById('confirmMatricule');
  const confirmTelephone = document.getElementById('confirmTelephone');

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
      
      await checkUserData();
      setupMatriculeCases();
      setupOverlayCases();
      setupEventListeners();
      loadLastMatricule();
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
      updateInfoMessage('Erreur de chargement', 'error');
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
  // VÉRIFICATION DONNÉES UTILISATEUR
  // ---------------------------------------------
  async function checkUserData() {
    try {
      const { data, error } = await supabase
        .from('securite')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement securite:', error);
        showInfoOverlay();
        return;
      }

      if (!data) {
        showInfoOverlay();
        return;
      }

      currentSecurite = data;
      enableMatriculeCases();
      
      // Vérifier si la filière est renseignée
      if (!data.filiere) {
        updateInfoMessage('Veuillez renseigner votre filière dans Profil', 'info');
        // Désactiver le bouton téléchargement (sera géré dans download)
      } else {
        updateInfoMessage(`Bienvenue ${data.prenom} ${data.nom}`, 'success');
      }
      
    } catch (error) {
      console.error('Erreur:', error);
      showInfoOverlay();
    }
  }

  // ---------------------------------------------
  // GESTION OVERLAY 3 ÉTAPES
  // ---------------------------------------------
  function showInfoOverlay() {
    disableMatriculeCases();
    resetOverlayData();
    infoOverlay.classList.remove('hidden');
    showStep(1);
  }

  function hideInfoOverlay() {
    infoOverlay.classList.add('hidden');
  }

  function showStep(num) {
    etape = num;
    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');
    
    if (num === 1) {
      step1.classList.remove('hidden');
      stepNom?.focus();
    } else if (num === 2) {
      step2.classList.remove('hidden');
      stepCases[0]?.focus();
      loadTempDataToStep2();
    } else if (num === 3) {
      step3.classList.remove('hidden');
      updateConfirmStep();
    }
  }

  function resetOverlayData() {
    tempData = { nom: '', prenom: '', matricule: '', telephone: '' };
    if (stepNom) stepNom.value = '';
    if (stepPrenom) stepPrenom.value = '';
    if (stepTelephone) stepTelephone.value = '';
    stepCases.forEach(c => { if (c) c.value = ''; });
  }

  function loadTempDataToStep2() {
    if (!tempData.matricule) return;
    
    const parts = tempData.matricule.split(' ');
    if (parts.length !== 2) return;
    
    const chiffres = parts[0];
    const lettre = parts[1];
    
    for (let i = 0; i < 8; i++) {
      if (stepCases[i] && chiffres[i]) stepCases[i].value = chiffres[i];
    }
    if (stepCases[8] && lettre) stepCases[8].value = lettre;
    if (stepTelephone) stepTelephone.value = tempData.telephone;
  }

  function updateConfirmStep() {
    if (confirmNom) confirmNom.textContent = tempData.nom || '-';
    if (confirmPrenom) confirmPrenom.textContent = tempData.prenom || '-';
    if (confirmMatricule) confirmMatricule.textContent = tempData.matricule || '-';
    if (confirmTelephone) confirmTelephone.textContent = tempData.telephone || '-';
  }

  function validateStep1() {
    if (!stepNom?.value.trim()) {
      updateInfoMessage('Nom requis', 'error', true);
      stepNom?.focus();
      return false;
    }
    if (!stepPrenom?.value.trim()) {
      updateInfoMessage('Prénom requis', 'error', true);
      stepPrenom?.focus();
      return false;
    }
    return true;
  }

  function validateStep2() {
    for (let i = 0; i < 8; i++) {
      if (!stepCases[i]?.value) {
        updateInfoMessage('Matricule incomplet', 'error', true);
        return false;
      }
    }
    if (!stepCases[8]?.value) {
      updateInfoMessage('Lettre du matricule manquante', 'error', true);
      return false;
    }

    const tel = stepTelephone?.value.replace(/\D/g, '');
    if (!tel || tel.length !== 10) {
      updateInfoMessage('Téléphone doit contenir 10 chiffres', 'error', true);
      return false;
    }

    return true;
  }

  function getMatriculeFromOverlay() {
    let chiffres = '';
    for (let i = 0; i < 8; i++) {
      chiffres += stepCases[i]?.value || '';
    }
    const lettre = stepCases[8]?.value || '';
    return chiffres + ' ' + lettre;
  }

  // ---------------------------------------------
  // SAUVEGARDE DANS SECURITE
  // ---------------------------------------------
  async function saveToSecurite() {
    try {
      const { error } = await supabase
        .from('securite')
        .insert({
          id: currentUser.id,
          nom: tempData.nom,
          prenom: tempData.prenom,
          matricule: tempData.matricule,
          telephone: tempData.telephone
          // filière sera renseignée plus tard dans profil
        });

      if (error) throw error;

      currentSecurite = {
        id: currentUser.id,
        nom: tempData.nom,
        prenom: tempData.prenom,
        matricule: tempData.matricule,
        telephone: tempData.telephone,
        filiere: null
      };

      hideInfoOverlay();
      enableMatriculeCases();
      updateInfoMessage('Informations enregistrées. Renseignez votre filière dans Profil', 'info');
      
      localStorage.setItem('lastMatricule', tempData.matricule);
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      updateInfoMessage('Erreur lors de la sauvegarde', 'error', true);
    }
  }

  // ---------------------------------------------
  // GESTION CASES MATRICULE (HEADER)
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
        
        if (index < 8) {
          value = value.replace(/[^0-9]/g, '');
        } else {
          value = value.replace(/[^A-Z]/g, '');
        }
        
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
    cases[0]?.focus();
  }

  function loadLastMatricule() {
    const saved = localStorage.getItem('lastMatricule');
    if (!saved || !currentSecurite) return;
    
    const parts = saved.split(' ');
    if (parts.length !== 2) return;
    
    const chiffres = parts[0];
    const lettre = parts[1];
    
    for (let i = 0; i < 8; i++) {
      if (cases[i] && chiffres[i]) cases[i].value = chiffres[i];
    }
    if (cases[8] && lettre) cases[8].value = lettre;
  }

  // ---------------------------------------------
  // GESTION CASES OVERLAY
  // ---------------------------------------------
  function setupOverlayCases() {
    stepCases.forEach((input, index) => {
      if (!input) return;
      
      input.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase();
        
        if (index < 8) {
          value = value.replace(/[^0-9]/g, '');
        } else {
          value = value.replace(/[^A-Z]/g, '');
        }
        
        e.target.value = value;
        
        if (value.length === 1 && index < 8) {
          stepCases[index + 1]?.focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          stepCases[index - 1]?.focus();
        }
      });
    });
  }

  // ---------------------------------------------
  // RECHERCHE
  // ---------------------------------------------
  function startSearch() {
    miniLoader?.classList.remove('hidden');
    updateInfoMessage('Recherche en cours...', 'info');
    searchFile();
  }

  function stopSearch() {
    miniLoader?.classList.add('hidden');
  }

  function updateInfoMessage(msg, type = 'info', isError = false) {
    const span = infoMessage?.querySelector('span');
    if (!span) return;
    
    span.textContent = msg;
    infoMessage.className = 'info-message ' + type;
    
    if (type === 'error' || isError) {
      infoMessage.classList.add('error');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else if (type === 'success') {
      infoMessage.classList.add('success');
    } else {
      infoMessage.classList.add('info');
    }
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
    
    // Extraire la catégorie du nom du fichier
    const nomSansExt = file.nom.replace(/\.pdf$/i, '');
    const parties = nomSansExt.split(' ');
    currentFileCategorie = parties.length >= 4 ? parties[3] : 'Fiche';
  }

  async function searchFile() {
    if (!validateHeaderCases()) {
      stopSearch();
      updateInfoMessage('Remplissez toutes les cases', 'error');
      return;
    }

    const matriculeSaisi = getHeaderMatricule();

    if (!currentSecurite || matriculeSaisi !== currentSecurite.matricule) {
      stopSearch();
      updateInfoMessage('Vous ne pouvez consulter que votre propre fiche', 'error');
      resetInterface();
      clearHeaderCases();
      return;
    }

    try {
      const { data: fichiers, error } = await supabase
        .from('fichiers')
        .select('*')
        .filter('nom', 'ilike', `${matriculeSaisi}%`);

      if (error || !fichiers?.length) {
        stopSearch();
        updateInfoMessage('Aucun fichier trouvé', 'error');
        resetInterface();
        return;
      }

      const file = fichiers[0];
      const { data: urlData } = supabase.storage
        .from(file.bucket || 'fichiers')
        .getPublicUrl(file.chemin_storage);

      showFile(file, urlData.publicUrl);
      updateInfoMessage('Fichier trouvé', 'success');
      localStorage.setItem('lastMatricule', matriculeSaisi);

    } catch (error) {
      console.error(error);
      stopSearch();
      updateInfoMessage('Erreur de recherche', 'error');
    }
  }

  // ---------------------------------------------
  // TÉLÉCHARGEMENT AVEC VÉRIFICATION FILIÈRE
  // ---------------------------------------------
  async function downloadFile() {
    if (!currentFile) return;
    
    // Vérifier si la filière est renseignée
    if (!currentSecurite || !currentSecurite.filiere) {
      updateInfoMessage('Veuillez d\'abord renseigner votre filière dans Profil', 'error', true);
      return;
    }
    
    try {
      // Ouvrir le fichier
      window.open(currentFile.url, '_blank');
      
      // Enregistrer le téléchargement avec la filière
      if (currentUser) {
        await supabase
          .from('telechargements')
          .insert({
            user_id: currentUser.id,
            date_telechargement: new Date().toISOString(),
            categorie: currentFileCategorie || 'Fiche',
            filiere: currentSecurite.filiere
          })
          .then(({ error }) => {
            if (error) console.warn('Erreur enregistrement téléchargement:', error);
          });
      }
      
      updateInfoMessage('Téléchargement démarré', 'success');
      
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      updateInfoMessage('Erreur de téléchargement', 'error');
    }
  }

  // ---------------------------------------------
  // AUTRES ACTIONS
  // ---------------------------------------------
  function openFileDirect() {
    if (!currentFile) return;
    window.open(currentFile.url, '_blank');
    updateInfoMessage('Ouverture du fichier...', 'info');
  }

  function shareFile() {
    if (!currentFile) return;
    if (navigator.share) {
      navigator.share({
        title: 'Ma fiche AEJ',
        text: 'Voici ma fiche d\'inscription',
        url: currentFile.url
      }).catch(() => copyToClipboard());
    } else {
      copyToClipboard();
    }
  }

  function copyToClipboard() {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.url).then(() => {
      updateInfoMessage('Lien copié', 'success');
    }).catch(() => {
      updateInfoMessage('Erreur de copie', 'error');
    });
  }

  function cancelFile() {
    clearHeaderCases();
    resetInterface();
    updateInfoMessage('Veuillez saisir votre matricule', 'info');
  }

  // ---------------------------------------------
  // ÉCOUTEURS
  // ---------------------------------------------
  function setupEventListeners() {
    step1Next?.addEventListener('click', () => {
      if (!validateStep1()) return;
      tempData.nom = stepNom.value.trim();
      tempData.prenom = stepPrenom.value.trim();
      showStep(2);
    });

    step2Back?.addEventListener('click', () => showStep(1));
    
    step2Next?.addEventListener('click', () => {
      if (!validateStep2()) return;
      tempData.matricule = getMatriculeFromOverlay();
      tempData.telephone = stepTelephone.value.trim();
      showStep(3);
    });

    step3Back?.addEventListener('click', () => showStep(2));
    step3Save?.addEventListener('click', saveToSecurite);

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