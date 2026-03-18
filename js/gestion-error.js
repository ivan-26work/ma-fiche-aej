// ===== gestion-error.js =====
// Gestion stricte des cases matricule (1 chiffre max par case)

(function() {
  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGestionError);
  } else {
    initGestionError();
  }

  function initGestionError() {
    // Cases du header (index.html stagiaire)
    const headerCases = [
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

    // Cases de l'overlay (étape 2)
    const overlayCases = [
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

    // Appliquer la validation à toutes les cases
    headerCases.forEach(setupCaseValidation);
    overlayCases.forEach(setupCaseValidation);

    function setupCaseValidation(input) {
      if (!input) return;

      // Bloquer le collage
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        // Option: vibrer pour signaler l'erreur
        if (navigator.vibrate) navigator.vibrate(50);
      });

      // Bloquer le glisser-déposer
      input.addEventListener('drop', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(50);
      });

      // Validation à chaque saisie
      input.addEventListener('input', (e) => {
        let value = e.target.value;
        
        // Si plus d'un caractère, ne garder que le premier
        if (value.length > 1) {
          e.target.value = value.charAt(0);
          if (navigator.vibrate) navigator.vibrate(50);
          
          // Option: afficher un message dans la console (silencieux)
          console.log('Un seul caractère autorisé par case');
        }
      });

      // Validation à la perte de focus
      input.addEventListener('blur', (e) => {
        let value = e.target.value;
        if (value.length > 1) {
          e.target.value = value.charAt(0);
        }
      });

      // Empêcher les caractères non autorisés (déjà géré par le pattern)
      input.addEventListener('keypress', (e) => {
        const key = e.key;
        const index = headerCases.indexOf(input) !== -1 ? 
                      headerCases.indexOf(input) : 
                      overlayCases.indexOf(input);
        
        // 8 premières cases : chiffres uniquement
        if (index >= 0 && index < 8) {
          if (!/^\d$/.test(key)) {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }
        // 9ème case : lettre uniquement
        else if (index === 8) {
          if (!/^[A-Za-z]$/.test(key)) {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }
      });
    }

    // Fonction utilitaire pour vérifier que toutes les cases sont remplies
    window.checkMatriculeComplet = function(casesArray) {
      for (let i = 0; i < 9; i++) {
        if (!casesArray[i]?.value) return false;
      }
      return true;
    };

    // Fonction pour effacer toutes les cases
    window.clearMatriculeCases = function(casesArray) {
      casesArray.forEach(c => { if (c) c.value = ''; });
      if (casesArray[0]) casesArray[0].focus();
    };

    console.log('✅ Gestion-error.js chargé - Cases matricule sécurisées');
  }
})();