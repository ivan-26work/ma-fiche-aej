// ===== auth.js =====
// Authentification stagiaire - Mobile first - Mode nuit intégré

(function() {
  // ---------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------
  const SUPABASE_URL = 'https://lnwrwvwunwsqeuluupis.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxud3J3dnd1bndzcWV1bHV1cGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjU2ODYsImV4cCI6MjA4OTM0MTY4Nn0.gfnPMtR3mNBFMTo3GtZ9t1A9_8gxEHY4loLgLdLJxLs';

  // ---------------------------------------------
  // ÉTAT INTERNE
  // ---------------------------------------------
  let supabase = null;
  let currentMode = 'login';

  // ---------------------------------------------
  // ÉLÉMENTS DOM
  // ---------------------------------------------
  const loadingOverlay = document.getElementById('loadingOverlay');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const formLogin = document.getElementById('formLogin');
  const formSignup = document.getElementById('formSignup');
  const forgotLink = document.getElementById('forgotPassword');
  const forgotModal = document.getElementById('forgotModal');
  const cancelReset = document.getElementById('cancelReset');
  const sendReset = document.getElementById('sendReset');
  const resetEmail = document.getElementById('resetEmail');
  const themeToggle = document.getElementById('themeToggle');

  // ---------------------------------------------
  // INITIALISATION
  // ---------------------------------------------
  async function init() {
    try {
      await waitForDom();
      await initSupabase();
      await checkExistingSession();
      setupEventListeners();
      
      // Charger le thème sauvegardé
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'night') {
        document.body.classList.add('night-mode');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      }
      
    } catch (error) {
      console.warn('Mode démo - Supabase non disponible');
      setupEventListeners();
    } finally {
      setTimeout(() => {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
      }, 500);
    }
  }

  function waitForDom() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async function initSupabase() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return;
    }
    await loadSupabaseScript();
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase non disponible');
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="supabase"]')) {
        const checkInterval = setInterval(() => {
          if (window.supabase) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        setTimeout(() => reject(new Error('Timeout')), 5000);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => window.supabase ? resolve() : reject();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function checkExistingSession() {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.log('Pas de session active');
    }
  }

  function setupEventListeners() {
    if (!tabLogin || !tabSignup || !formLogin || !formSignup) {
      console.error('Éléments DOM manquants');
      return;
    }

    tabLogin.addEventListener('click', () => switchTab('login'));
    tabSignup.addEventListener('click', () => switchTab('signup'));
    formLogin.addEventListener('submit', handleLogin);
    formSignup.addEventListener('submit', handleSignup);

    if (forgotLink) {
      forgotLink.addEventListener('click', openForgotModal);
    }

    if (cancelReset) {
      cancelReset.addEventListener('click', closeForgotModal);
    }

    if (sendReset) {
      sendReset.addEventListener('click', handlePasswordReset);
    }

    if (forgotModal) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !forgotModal.classList.contains('hidden')) {
          closeForgotModal();
        }
      });
      forgotModal.addEventListener('click', (e) => {
        if (e.target === forgotModal) {
          closeForgotModal();
        }
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    checkUrlParams();
  }

  function toggleTheme() {
    document.body.classList.toggle('night-mode');
    const isNight = document.body.classList.contains('night-mode');
    localStorage.setItem('theme', isNight ? 'night' : 'light');
    if (themeToggle) {
      themeToggle.innerHTML = isNight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
  }

  function switchTab(mode) {
    currentMode = mode;
    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      formLogin.classList.remove('hidden');
      formSignup.classList.add('hidden');
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      formSignup.classList.remove('hidden');
      formLogin.classList.add('hidden');
    }
  }

  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function showNotification(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.temp-notification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.className = `temp-notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, duration);
  }

  function showError(element, message) {
    clearError(element);
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.style.color = '#ff7e9f';
    errorEl.style.fontSize = '0.75rem';
    errorEl.style.marginTop = '0.3rem';
    errorEl.style.paddingLeft = '1rem';
    element.parentElement.appendChild(errorEl);
    
    showNotification(message, 'error');
  }

  function clearError(element) {
    const errorEl = element.parentElement.querySelector('.error-message');
    if (errorEl) errorEl.remove();
  }

  function shakeForm() {
    const activeForm = currentMode === 'login' ? formLogin : formSignup;
    if (activeForm) {
      activeForm.classList.add('shake');
      setTimeout(() => activeForm.classList.remove('shake'), 500);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  }

  // ---------------------------------------------
  // CONNEXION
  // ---------------------------------------------
  async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail');
    const password = document.getElementById('loginPassword');
    const rememberMe = document.getElementById('rememberMe');

    if (!email || !password) return;

    [email, password].forEach(field => clearError(field));

    let hasError = false;

    if (!email.value.trim()) {
      showError(email, 'Email requis');
      hasError = true;
    } else if (!isValidEmail(email.value.trim())) {
      showError(email, 'Email invalide');
      hasError = true;
    }

    if (!password.value) {
      showError(password, 'Mot de passe requis');
      hasError = true;
    }

    if (hasError) {
      shakeForm();
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion...';

    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });

        if (error) throw error;
        
        showNotification('Connexion réussie', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      } else {
        setTimeout(() => {
          showNotification('Mode démo: Connexion réussie', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      showError(password, 'Email ou mot de passe incorrect');
      shakeForm();
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  // ---------------------------------------------
  // INSCRIPTION
  // ---------------------------------------------
  async function handleSignup(e) {
    e.preventDefault();

    const firstname = document.getElementById('signupFirstname');
    const lastname = document.getElementById('signupLastname');
    const email = document.getElementById('signupEmail');
    const password = document.getElementById('signupPassword');
    const confirm = document.getElementById('signupConfirm');
    const terms = document.getElementById('acceptTerms');

    [firstname, lastname, email, password, confirm].forEach(field => {
      if (field) clearError(field);
    });

    let hasError = false;

    if (firstname && !firstname.value.trim()) {
      showError(firstname, 'Prénom requis');
      hasError = true;
    }

    if (lastname && !lastname.value.trim()) {
      showError(lastname, 'Nom requis');
      hasError = true;
    }

    if (email && !email.value.trim()) {
      showError(email, 'Email requis');
      hasError = true;
    } else if (email && !isValidEmail(email.value.trim())) {
      showError(email, 'Email invalide');
      hasError = true;
    }

    if (password && !password.value) {
      showError(password, 'Mot de passe requis');
      hasError = true;
    }

    if (password && confirm && password.value !== confirm.value) {
      showError(confirm, 'Les mots de passe ne correspondent pas');
      hasError = true;
    }

    if (terms && !terms.checked) {
      showNotification('Vous devez accepter les conditions', 'error');
      hasError = true;
    }

    if (hasError) {
      shakeForm();
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Création...';

    try {
      if (supabase) {
        const { error, data } = await supabase.auth.signUp({
          email: email.value.trim(),
          password: password.value,
          options: {
            data: {
              first_name: firstname?.value.trim() || '',
              last_name: lastname?.value.trim() || ''
            }
          }
        });

        if (error) throw error;

        // Créer l'entrée dans la table securite
        if (data.user) {
          await supabase
            .from('securite')
            .insert({
              id: data.user.id,
              prenom: firstname?.value.trim() || '',
              nom: lastname?.value.trim() || '',
              email: email.value.trim(),
              matricule: null,
              telephone: null,
              filiere: null
            });
        }

        showNotification('Compte créé ! Vérifiez vos emails', 'success');
        
        setTimeout(() => {
          switchTab('login');
          const loginEmail = document.getElementById('loginEmail');
          if (loginEmail && email) {
            loginEmail.value = email.value.trim();
          }
        }, 1500);
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
      } else {
        setTimeout(() => {
          showNotification('Mode démo: Inscription réussie', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      if (email) showError(email, error.message || 'Erreur inscription');
      shakeForm();
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  // ---------------------------------------------
  // MODALE RÉINITIALISATION
  // ---------------------------------------------
  function openForgotModal(e) {
    e.preventDefault();
    if (forgotModal) {
      forgotModal.classList.remove('hidden');
      setTimeout(() => resetEmail?.focus(), 100);
    }
  }

  function closeForgotModal() {
    if (forgotModal) {
      forgotModal.classList.add('hidden');
      if (resetEmail) {
        resetEmail.value = '';
        clearError(resetEmail);
      }
    }
  }

  async function handlePasswordReset() {
    if (!resetEmail) return;

    clearError(resetEmail);

    let hasError = false;

    if (!resetEmail.value.trim()) {
      showError(resetEmail, 'Email requis');
      hasError = true;
    } else if (!isValidEmail(resetEmail.value.trim())) {
      showError(resetEmail, 'Email invalide');
      hasError = true;
    }

    if (hasError) return;

    const originalText = sendReset.textContent;
    sendReset.disabled = true;
    sendReset.textContent = 'Envoi...';

    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          resetEmail.value.trim()
        );

        if (error) throw error;

        showNotification('Email de réinitialisation envoyé', 'success');
        setTimeout(() => closeForgotModal(), 1500);
      } else {
        setTimeout(() => {
          showNotification('Mode démo: Email envoyé', 'success');
          setTimeout(() => closeForgotModal(), 1500);
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur:', error);
      showError(resetEmail, error.message || 'Erreur envoi');
      sendReset.disabled = false;
      sendReset.textContent = originalText;
    }
  }

  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'login') switchTab('login');
    else if (mode === 'signup') switchTab('signup');
  }

  init();
})();
