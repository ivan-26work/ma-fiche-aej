// ===== info.js =====
// Page d'actualités - Version publique sans authentification
// Tout le monde peut voir et interagir avec les publications

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
  let publications = [];
  let filteredPublications = [];
  let searchTerm = '';

  // ---------------------------------------------
  // ÉLÉMENTS DOM
  // ---------------------------------------------
  const loadingOverlay = document.getElementById('loadingOverlay');
  const searchInput = document.getElementById('searchInput');
  const feedContainer = document.getElementById('feedContainer');
  const fullscreenOverlay = document.getElementById('fullscreenOverlay');
  const fullscreenBackdrop = document.getElementById('fullscreenBackdrop');
  const fullscreenClose = document.getElementById('fullscreenClose');
  const fullscreenContent = document.getElementById('fullscreenContent');

  // ---------------------------------------------
  // INITIALISATION
  // ---------------------------------------------
  async function init() {
    try {
      await waitForDom();
      await initSupabase();
      await loadPublications();
      
      setupEventListeners();
      renderPublications();
      
    } catch (error) {
      console.error('Erreur initialisation:', error);
      showNotification('Erreur de chargement', 'error');
    } finally {
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
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

  async function loadPublications() {
    try {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      publications = data || [];
      filterPublications();
      
    } catch (error) {
      console.error('Erreur chargement publications:', error);
      publications = [];
      filteredPublications = [];
    }
  }

  function filterPublications() {
    if (!searchTerm.trim()) {
      filteredPublications = [...publications];
    } else {
      const term = searchTerm.toLowerCase();
      filteredPublications = publications.filter(pub => 
        pub.texte?.toLowerCase().includes(term) ||
        (pub.type === 'audio' && 'message vocal'.includes(term))
      );
    }
    renderPublications();
  }

  async function incrementLike(publicationId, button) {
    const pub = publications.find(p => p.id === publicationId);
    if (!pub) return;
    
    const isLiked = button.classList.contains('liked');
    const newCount = isLiked ? (pub.likes_count || 0) - 1 : (pub.likes_count || 0) + 1;
    
    // Mettre à jour l'affichage immédiatement
    if (isLiked) {
      button.classList.remove('liked');
    } else {
      button.classList.add('liked');
    }
    const span = button.querySelector('span');
    if (span) span.textContent = newCount;
    pub.likes_count = newCount;
    
    // Mettre à jour en base de données
    try {
      const { error } = await supabase
        .from('publications')
        .update({ likes_count: newCount })
        .eq('id', publicationId);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Erreur mise à jour like:', error);
      // Revert en cas d'erreur
      button.classList.toggle('liked');
      if (span) span.textContent = pub.likes_count;
      showNotification('Erreur lors du like', 'error');
    }
  }

  async function incrementView(publicationId) {
    const pub = publications.find(p => p.id === publicationId);
    if (!pub) return;
    
    const newCount = (pub.vu_count || 0) + 1;
    pub.vu_count = newCount;
    
    try {
      const { error } = await supabase
        .from('publications')
        .update({ vu_count: newCount })
        .eq('id', publicationId);
      
      if (error) throw error;
      
      // Mettre à jour l'affichage
      const viewBtn = document.querySelector(`.publication-card[data-id="${publicationId}"] .view-btn span`);
      if (viewBtn) viewBtn.textContent = newCount;
      
    } catch (error) {
      console.error('Erreur mise à jour vue:', error);
      pub.vu_count = newCount - 1;
    }
  }

  function renderPublications() {
    if (!feedContainer) return;
    
    if (filteredPublications.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-feed">
          <i class="fas fa-newspaper"></i>
          <p>Aucune publication trouvée</p>
        </div>
      `;
      return;
    }
    
    feedContainer.innerHTML = filteredPublications.map(pub => renderPublicationCard(pub)).join('');
    
    setupAudioPlayers();
    setupLikeButtons();
    setupFullscreenButtons();
    setupSeeMoreButtons();
    
    // Incrémenter les vues pour les publications visibles
    filteredPublications.forEach(pub => {
      incrementView(pub.id);
    });
  }

  function renderPublicationCard(pub) {
    const date = new Date(pub.created_at);
    const formattedDate = `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const adminName = 'AEJ';
    
    let mediaHtml = '';
    if (pub.type === 'image' && pub.contenu) {
      mediaHtml = `<div class="publication-media"><img src="${pub.contenu}" alt="Image" loading="lazy"></div>`;
    } else if (pub.type === 'video' && pub.contenu) {
      mediaHtml = `<div class="publication-media"><video src="${pub.contenu}" controls></video></div>`;
    } else if (pub.type === 'pdf' && pub.contenu) {
      mediaHtml = `<div class="publication-media"><iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(pub.contenu)}&embedded=true"></iframe></div>`;
    } else if (pub.type === 'audio' && pub.contenu) {
      mediaHtml = `
        <div class="publication-media">
          <div class="audio-player-wrapper" data-audio="${pub.contenu}">
            <div class="audio-player">
              <button class="audio-play-btn"><i class="fas fa-play"></i></button>
              <audio src="${pub.contenu}" preload="metadata"></audio>
              <span class="audio-label">Message vocal</span>
              <span class="audio-duration">--:--</span>
            </div>
          </div>
        </div>
      `;
    }
    
    const texteHtml = pub.texte ? `
      <div class="publication-text collapsed" id="text-${pub.id}">${escapeHtml(pub.texte)}</div>
      ${pub.texte.length > 100 ? `<button class="see-more-btn" data-id="${pub.id}">Voir plus</button>` : ''}
    ` : '';
    
    return `
      <div class="publication-card" data-id="${pub.id}">
        <div class="publication-header">
          <div class="publication-user">
            <div class="publication-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="publication-author">${escapeHtml(adminName)}</div>
          </div>
          <div class="publication-date">${formattedDate}</div>
        </div>
        ${texteHtml}
        ${mediaHtml}
        <div class="publication-footer">
          <div class="publication-stats">
            <button class="stat-btn like-btn" data-id="${pub.id}">
              <i class="fas fa-heart"></i>
              <span>${pub.likes_count || 0}</span>
            </button>
            <button class="stat-btn view-btn">
              <i class="fas fa-eye"></i>
              <span>${pub.vu_count || 0}</span>
            </button>
          </div>
          <button class="fullscreen-btn" data-id="${pub.id}">
            <i class="fas fa-expand"></i>
          </button>
        </div>
      </div>
    `;
  }

  function setupAudioPlayers() {
    document.querySelectorAll('.audio-player-wrapper').forEach(wrapper => {
      const audio = wrapper.querySelector('audio');
      const playBtn = wrapper.querySelector('.audio-play-btn');
      const durationSpan = wrapper.querySelector('.audio-duration');
      
      if (audio && playBtn) {
        audio.addEventListener('loadedmetadata', () => {
          if (durationSpan && !isNaN(audio.duration)) {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60);
            durationSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
        });
        
        audio.addEventListener('ended', () => {
          playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (audio.paused) {
            document.querySelectorAll('audio').forEach(otherAudio => {
              if (otherAudio !== audio && !otherAudio.paused) {
                otherAudio.pause();
                const otherWrapper = otherAudio.closest('.audio-player-wrapper');
                const otherBtn = otherWrapper?.querySelector('.audio-play-btn');
                if (otherBtn) otherBtn.innerHTML = '<i class="fas fa-play"></i>';
              }
            });
            audio.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
          } else {
            audio.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
          }
        });
      }
    });
  }

  function setupLikeButtons() {
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        incrementLike(id, btn);
      });
    });
  }

  function setupFullscreenButtons() {
    document.querySelectorAll('.fullscreen-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const pub = publications.find(p => p.id === id);
        if (pub) openFullscreen(pub);
      });
    });
  }

  function setupSeeMoreButtons() {
    document.querySelectorAll('.see-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const textDiv = document.getElementById(`text-${id}`);
        if (textDiv) {
          textDiv.classList.toggle('collapsed');
          btn.textContent = textDiv.classList.contains('collapsed') ? 'Voir plus' : 'Voir moins';
        }
      });
    });
  }

  function openFullscreen(pub) {
    const date = new Date(pub.created_at);
    const formattedDate = `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    const adminName = 'AEJ';
    
    let mediaHtml = '';
    if (pub.type === 'image' && pub.contenu) {
      mediaHtml = `<div class="fullscreen-media"><img src="${pub.contenu}" alt="Image"></div>`;
    } else if (pub.type === 'video' && pub.contenu) {
      mediaHtml = `<div class="fullscreen-media"><video src="${pub.contenu}" controls autoplay></video></div>`;
    } else if (pub.type === 'pdf' && pub.contenu) {
      mediaHtml = `<div class="fullscreen-media"><iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(pub.contenu)}&embedded=true"></iframe></div>`;
    } else if (pub.type === 'audio' && pub.contenu) {
      mediaHtml = `<div class="fullscreen-media audio-full"><audio src="${pub.contenu}" controls autoplay></audio></div>`;
    }
    
    const texteHtml = pub.texte ? `<div class="fullscreen-text">${escapeHtml(pub.texte)}</div>` : '';
    
    fullscreenContent.innerHTML = `
      <div class="fullscreen-header">
        <div class="fullscreen-user">
          <div class="fullscreen-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="fullscreen-author">${escapeHtml(adminName)}</div>
        </div>
        <div class="fullscreen-date">${formattedDate}</div>
      </div>
      ${texteHtml}
      ${mediaHtml}
      <div class="fullscreen-footer">
        <div class="fullscreen-stats">
          <span><i class="fas fa-eye"></i> ${pub.vu_count || 0} vues</span>
          <span><i class="fas fa-heart"></i> ${pub.likes_count || 0} likes</span>
        </div>
      </div>
    `;
    
    fullscreenOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeFullscreen() {
    fullscreenOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    fullscreenContent.innerHTML = '';
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

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------
  // ÉCOUTEURS
  // ---------------------------------------------
  function setupEventListeners() {
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          searchTerm = searchInput.value;
          filterPublications();
        }, 300);
      });
    }
    
    if (fullscreenClose) {
      fullscreenClose.addEventListener('click', closeFullscreen);
    }
    if (fullscreenBackdrop) {
      fullscreenBackdrop.addEventListener('click', closeFullscreen);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !fullscreenOverlay.classList.contains('hidden')) {
        closeFullscreen();
      }
    });
  }

  // Démarrer l'application
  init();
})();
