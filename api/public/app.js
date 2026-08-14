// Utility: Read cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Global Auth State
let currentUser = null;

// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

const queueContainer = document.getElementById('queue-container');
const feedContainer = document.getElementById('feed-container');
const clientsContainer = document.getElementById('clients-container');

// --- Networking ---
async function apiCall(endpoint, options = {}) {
  const headers = options.headers || {};
  
  if (options.method && options.method !== 'GET') {
    const csrf = getCookie('csrf_token');
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  if (res.status === 401) {
    // Session expired or missing
    handleLogout();
    throw new Error('Unauthorized');
  }

  return res;
}

// --- Auth ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      currentUserSpan.textContent = currentUser;
      
      authOverlay.classList.add('hidden');
      appContainer.classList.remove('hidden');
      loadView('queue-view');
    } else {
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.classList.remove('hidden');
    loginError.textContent = "Connection error.";
  }
});

logoutBtn.addEventListener('click', async () => {
  await apiCall('/api/v1/auth/logout', { method: 'POST' });
  handleLogout();
});

function handleLogout() {
  currentUser = null;
  appContainer.classList.add('hidden');
  authOverlay.classList.remove('hidden');
  loginError.classList.add('hidden');
  document.getElementById('password').value = '';
}

// --- Navigation ---
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadView(btn.dataset.view);
  });
});

function loadView(viewId) {
  views.forEach(v => v.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  
  if (viewId === 'queue-view') loadQueue();
  else if (viewId === 'feed-view') loadFeed();
  else if (viewId === 'clients-view') loadClients();
}

// --- Render Utilities (Strictly preventing XSS) ---
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  // STRICT RULE: Use textContent ONLY to prevent stored XSS from malicious STIX data
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

// --- Views ---

// 1. Triage Queue
document.getElementById('refresh-queue').addEventListener('click', loadQueue);

async function loadQueue() {
  queueContainer.innerHTML = '<div class="loading-shimmer">Loading...</div>';
  try {
    const res = await apiCall('/api/v1/ui/queue');
    const threats = await res.json();
    renderQueue(threats);
  } catch (e) {
    if (e.message !== 'Unauthorized') queueContainer.innerHTML = '<div class="error-msg">Failed to load queue.</div>';
  }
}

function renderQueue(threats) {
  queueContainer.innerHTML = '';
  if (threats.length === 0) {
    queueContainer.innerHTML = '<div class="empty-state">Queue is empty. You are all caught up!</div>';
    return;
  }

  threats.forEach(t => {
    const card = el('div', 'card');
    card.dataset.id = t.id;
    
    const content = el('div', 'card-content');
    content.appendChild(el('div', 'stix-id', t.stix_id));
    content.appendChild(el('h3', 'threat-title', t.stix_data.name || 'Unnamed Threat'));
    
    // Explicitly safe rendering of LLM-generated description
    content.appendChild(el('p', 'threat-desc', t.stix_data.description || 'No description provided.'));
    
    // Explicitly safe rendering of LLM-generated pattern
    content.appendChild(el('div', 'stix-pattern', t.stix_data.pattern));
    
    const meta = el('div', 'meta-info');
    meta.appendChild(el('span', '', `Reporter: ${t.client.cn}`));
    meta.appendChild(el('span', '', `Time: ${new Date(t.created_at).toLocaleString()}`));
    if (t.client.is_quarantined) {
      meta.appendChild(el('span', 'badge quarantined', 'QUARANTINED SOURCE'));
    }
    content.appendChild(meta);
    card.appendChild(content);

    const actions = el('div', 'card-actions');
    
    const approveBtn = el('button', 'btn-success', 'Approve');
    approveBtn.addEventListener('click', () => actOnThreat(t.id, 'approve', card));
    actions.appendChild(approveBtn);
    
    const rejectBtn = el('button', 'btn-danger', 'Reject');
    rejectBtn.addEventListener('click', () => actOnThreat(t.id, 'reject', card));
    actions.appendChild(rejectBtn);

    card.appendChild(actions);
    queueContainer.appendChild(card);
  });
}

async function actOnThreat(id, action, cardElement) {
  try {
    const res = await apiCall(`/api/v1/ui/queue/${id}/${action}`, { method: 'POST' });
    if (res.ok) {
      cardElement.classList.add('removing');
      setTimeout(() => cardElement.remove(), 300);
    } else {
      alert(`Failed to ${action}`);
    }
  } catch (e) {}
}

// 2. Active Feed
document.getElementById('refresh-feed').addEventListener('click', loadFeed);

async function loadFeed() {
  feedContainer.innerHTML = '<div class="loading-shimmer">Loading...</div>';
  try {
    const res = await apiCall('/api/v1/ui/feed');
    const threats = await res.json();
    renderFeed(threats);
  } catch (e) {
    if (e.message !== 'Unauthorized') feedContainer.innerHTML = '<div class="error-msg">Failed to load feed.</div>';
  }
}

function renderFeed(threats) {
  feedContainer.innerHTML = '';
  if (threats.length === 0) {
    feedContainer.innerHTML = '<div class="empty-state">No active blocks.</div>';
    return;
  }

  threats.forEach(t => {
    const card = el('div', 'card');
    card.dataset.id = t.id;
    
    const content = el('div', 'card-content');
    content.appendChild(el('div', 'stix-id', t.stix_id));
    content.appendChild(el('h3', 'threat-title', t.stix_data.name || 'Unnamed Threat'));
    content.appendChild(el('div', 'stix-pattern', t.stix_data.pattern));
    
    const meta = el('div', 'meta-info');
    meta.appendChild(el('span', '', `Reporter: ${t.client.cn}`));
    meta.appendChild(el('span', '', `Approved: ${new Date(t.reviewed_at).toLocaleString()}`));
    content.appendChild(meta);
    card.appendChild(content);

    const actions = el('div', 'card-actions');
    const revokeBtn = el('button', 'btn-secondary', 'Revoke');
    revokeBtn.addEventListener('click', () => actOnThreat(t.id, 'revoke', card));
    actions.appendChild(revokeBtn);

    card.appendChild(actions);
    feedContainer.appendChild(card);
  });
}

// 3. Client Health
document.getElementById('refresh-clients').addEventListener('click', loadClients);

async function loadClients() {
  clientsContainer.innerHTML = '<div class="loading-shimmer">Loading...</div>';
  try {
    const res = await apiCall('/api/v1/ui/clients');
    const clients = await res.json();
    renderClients(clients);
  } catch (e) {
    if (e.message !== 'Unauthorized') clientsContainer.innerHTML = '<div class="error-msg">Failed to load clients.</div>';
  }
}

function renderClients(clients) {
  clientsContainer.innerHTML = '';
  if (clients.length === 0) {
    clientsContainer.innerHTML = '<div class="empty-state">No clients registered.</div>';
    return;
  }

  clients.forEach(c => {
    const card = el('div', 'card');
    
    const content = el('div', 'card-content');
    content.appendChild(el('h3', 'threat-title', c.cn));
    
    const meta = el('div', 'meta-info');
    meta.appendChild(el('span', '', `Reputation: ${c.reputation}`));
    meta.appendChild(el('span', '', `Recent Submissions: ${c.hourly_submissions}/hr`));
    
    if (c.is_quarantined) {
      meta.appendChild(el('span', 'badge quarantined', 'QUARANTINED'));
    } else {
      meta.appendChild(el('span', 'badge healthy', 'HEALTHY'));
    }
    content.appendChild(meta);
    card.appendChild(content);

    if (c.is_quarantined) {
      const actions = el('div', 'card-actions');
      const unqBtn = el('button', 'btn-secondary', 'Un-quarantine');
      unqBtn.addEventListener('click', async () => {
        try {
          const res = await apiCall(`/api/v1/ui/clients/${c.id}/unquarantine`, { method: 'POST' });
          if (res.ok) loadClients();
        } catch (e) {}
      });
      actions.appendChild(unqBtn);
      card.appendChild(actions);
    }

    clientsContainer.appendChild(card);
  });
}

// Initial Check (if already logged in via cookie)
if (getCookie('session')) {
  // We can't know the username directly from the cookie unless we decode JWT on client,
  // but we can just attempt to load the queue. If it succeeds, we are authed.
  apiCall('/api/v1/ui/queue').then(() => {
    currentUserSpan.textContent = 'Analyst';
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
    loadView('queue-view');
  }).catch(() => {
    // Expected if session is invalid or expired
  });
}
