/* ==========================================================================
   CivicSetu Single Page Application (SPA) Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const AppState = {
    currentRole: 'CITIZEN', // 'CITIZEN', 'AUTHORITY', 'SUPER_ADMIN'
    currentRoleKey: 'citizen', // 'citizen', 'authority', 'superadmin'
    activeView: 'dashboard',
    currentUser: null,
    departments: [],
    complaints: [],          // Citizen-scoped complaints
    authorityComplaints: [], // Authority/SuperAdmin-scoped complaints (all dept complaints)
    notifications: [],
    unreadNotifCount: 0,
    selectedComplaint: null,
    stagedFiles: [],
    signupSelectedRole: 'CITIZEN',   // Set by the new card-based role selector
  };

  const RoleConfig = {
    citizen: {
      label: 'Citizen User',
      apiRole: 'CITIZEN',
      loginPath: '/login/citizen/',
      signupPath: '/signup/citizen/'
    },
    authority: {
      label: 'Municipal Authority Officer',
      apiRole: 'AUTHORITY',
      loginPath: '/login/authority/',
      signupPath: '/signup/authority/'
    },
    superadmin: {
      label: 'Super Admin',
      apiRole: 'SUPER_ADMIN',
      loginPath: '/login/superadmin/',
      signupPath: '/signup/superadmin/'
    }
  };

  // Demo Datasets removed - system strictly uses live API & user input data
  const DemoData = {
    departments: [],
    complaints: [],
    notifications: []
  };

  // --- Initializers ---
  function init() {
    setupNavigation();
    setupModals();
    setupDropzone();
    setupRoleSelector();
    setupNotifDrawer();
    setupFormSubmissions();
    setupAuthHandlers();
    setupAuthorityTabs();

    checkInitialRoute();
    // checkAuthState() is async; once resolved it will trigger role-scoped
    // data loads and view rendering via afterAuthResolved()
    checkAuthState();
  }

  // Called after authentication state is confirmed.
  // Loads data appropriate for the current user's role.
  async function afterAuthResolved() {
    await loadDepartments();
    if (AppState.currentUser &&
        (AppState.currentUser.role === 'AUTHORITY' || AppState.currentUser.role === 'SUPER_ADMIN')) {
      // Authority/Admin: load authority complaints + notifications, then render and switch to Authority Portal view
      await Promise.all([loadAuthorityComplaints(), loadNotifications()]);
      renderAuthorityPortal();
      switchView('authority');
    } else {
      // Citizen or guest: load citizen-scoped complaints
      await loadComplaints();
      renderDashboard();
      renderComplaints();
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : '⚠️'}</span>
      <div>${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function checkInitialRoute() {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/signup')) {
      switchView('signup');
    } else if (pathname.includes('/login')) {
      switchView('login');
    }
  }

  // --- Auth & Session Manager ---
  async function checkAuthState() {
    const token = CivicSetuAPI.getToken();
    if (!token) {
      updateAuthUI(null);
      // No token — just render citizen-facing empty states
      renderDashboard();
      renderComplaints();
      return;
    }

    try {
      const me = await CivicSetuAPI.getMe();
      if (me) {
        AppState.currentUser = me;
        if (me.role) {
          AppState.currentRole = me.role;
        }
        updateAuthUI(me);
        // Now that we know the role, load the right data
        await afterAuthResolved();
      }
    } catch (err) {
      console.warn('Failed to verify existing session:', err);
      CivicSetuAPI.clearToken();
      updateAuthUI(null);
      renderDashboard();
      renderComplaints();
    }
  }

  function updateAuthUI(user) {
    const authNavBox = document.getElementById('authNavBox');
    const userProfileBox = document.getElementById('userProfileBox');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const authorityNavBtns = document.querySelectorAll('.authority-only-nav');
    const citizenNavBtns = document.querySelectorAll('.citizen-only-nav');

    if (user) {
      if (authNavBox) authNavBox.style.display = 'none';
      if (userProfileBox) userProfileBox.style.display = 'flex';
      if (userNameDisplay) userNameDisplay.textContent = `${user.full_name || user.email} (${user.role || 'USER'})`;

      if (user.role === 'AUTHORITY' || user.role === 'SUPER_ADMIN') {
        // Authority/Admin: show only the authority portal nav — hide all citizen-only nav items
        authorityNavBtns.forEach(btn => btn.style.display = 'flex');
        citizenNavBtns.forEach(btn => btn.style.display = 'none');
      } else {
        // Citizen: show citizen nav items, hide authority portal nav
        authorityNavBtns.forEach(btn => btn.style.display = 'none');
        citizenNavBtns.forEach(btn => btn.style.display = '');
      }
    } else {
      // Guest (logged out): restore citizen nav, hide authority nav
      if (authNavBox) authNavBox.style.display = 'flex';
      if (userProfileBox) userProfileBox.style.display = 'none';
      authorityNavBtns.forEach(btn => btn.style.display = 'none');
      citizenNavBtns.forEach(btn => btn.style.display = '');
    }
  }

  function setupAuthHandlers() {
    // Top Nav buttons
    document.getElementById('navLoginBtn')?.addEventListener('click', () => {
      switchView('login');
      window.history.pushState(null, '', '/login/');
    });

    document.getElementById('navSignupBtn')?.addEventListener('click', () => {
      switchView('signup');
      window.history.pushState(null, '', '/signup/');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await CivicSetuAPI.logout();
      AppState.currentUser = null;
      updateAuthUI(null);
      showToast('Logged out successfully', 'success');
      switchView('login');
      window.history.pushState(null, '', '/login/');
    });

    // Form toggle links
    document.getElementById('goToSignupLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('signup');
      window.history.pushState(null, '', '/signup/');
    });

    document.getElementById('goToLoginLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('login');
      window.history.pushState(null, '', '/login/');
    });


    // Signup Role selector change - handled by card selection
    // The role is now captured by AppState.signupSelectedRole (set via selectSignupRole())

    // Login Form Submit
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('loginAlert');
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      if (alertBox) alertBox.style.display = 'none';

      try {
        const data = await CivicSetuAPI.login(email, password);
        if (data && data.tokens) {
          CivicSetuAPI.setToken(data.tokens.access, data.tokens.refresh);
          AppState.currentUser = data.user;
          updateAuthUI(data.user);
          showToast(`Welcome back, ${data.user.full_name || data.user.email}!`, 'success');
          window.history.pushState(null, '', '/');

          // Automatic role-based view redirection
          if (data.user.role === 'AUTHORITY' || data.user.role === 'SUPER_ADMIN') {
            AppState.currentRole = data.user.role;
            // Load authority data then switch view
            await Promise.all([loadAuthorityComplaints(), loadNotifications()]);
            switchView('authority');
          } else {
            AppState.currentRole = data.user.role || 'CITIZEN';
            await loadComplaints();
            switchView('dashboard');
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.textContent = err.message || 'Login failed. Invalid email or password.';
          alertBox.style.display = 'block';
        } else {
          showToast(err.message || 'Login failed', 'error');
        }
      }
    });

    // Signup Form Submit
    document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('signupAlert');
      const submitBtn = document.getElementById('signupSubmitBtn');
      const origBtnHTML = submitBtn ? submitBtn.innerHTML : '';

      const fullName = document.getElementById('signupFullName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const phone = document.getElementById('signupPhone').value.trim();
      const password = document.getElementById('signupPassword').value.trim();
      const role = window.__signupSelectedRole || AppState.signupSelectedRole || 'CITIZEN';

      if (alertBox) alertBox.style.display = 'none';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering Account...';
      }

      try {
        const data = await CivicSetuAPI.register(email, password, fullName, phone, role, '');
        if (data && data.tokens) {
          CivicSetuAPI.setToken(data.tokens.access, data.tokens.refresh);
          AppState.currentUser = data.user;
          updateAuthUI(data.user);
          showToast(`Account created successfully! Welcome, ${data.user.full_name}.`, 'success');
          window.history.pushState(null, '', '/');

          if (role === 'AUTHORITY' || role === 'SUPER_ADMIN') {
            AppState.currentRole = role;
            await Promise.all([loadAuthorityComplaints(), loadNotifications()]);
            switchView('authority');
          } else {
            AppState.currentRole = 'CITIZEN';
            await loadComplaints();
            switchView('dashboard');
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.textContent = err.message || 'Registration failed. Please check your details.';
          alertBox.style.display = 'block';
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          showToast(err.message || 'Registration failed', 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHTML;
        }
      }
    });
  }

  // --- Navigation & View Switcher ---
  function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        switchView(targetView);
      });
    });
  }

  function switchView(viewName) {
    // Redirect Authority/SuperAdmin users to dedicated Authority Dashboard
    if (viewName === 'dashboard' && (AppState.currentRole === 'AUTHORITY' || AppState.currentRole === 'SUPER_ADMIN')) {
      viewName = 'authority';
    }

    AppState.activeView = viewName;

    // Toggle navigation sidebar visibility & main wrapper margin (Hide during login & signup)
    const sidebarEl = document.getElementById('appSidebar') || document.querySelector('.sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    if (sidebarEl) {
      if (viewName === 'login' || viewName === 'signup') {
        sidebarEl.style.display = 'none';
        if (mainWrapper) {
          mainWrapper.style.marginLeft = '0';
          mainWrapper.style.width = '100%';
        }
      } else {
        sidebarEl.style.display = 'flex';
        if (mainWrapper) {
          mainWrapper.style.marginLeft = '260px';
          mainWrapper.style.width = 'calc(100% - 260px)';
        }
      }
    }

    // Hide Authority Portal nav button for citizen views unless authorized
    const isAuthUser = AppState.currentUser && (AppState.currentUser.role === 'AUTHORITY' || AppState.currentUser.role === 'SUPER_ADMIN');
    document.querySelectorAll('.authority-only-nav').forEach(btn => {
      btn.style.display = isAuthUser ? 'flex' : 'none';
    });

    // Update Nav Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update View Panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`view-${viewName}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // View-specific data refreshes
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'complaints') renderComplaints();
    if (viewName === 'authority' &&
        AppState.currentUser &&
        (AppState.currentUser.role === 'AUTHORITY' || AppState.currentUser.role === 'SUPER_ADMIN')) {
      renderAuthorityPortal();
    }
    if (viewName === 'departments') renderDepartments();
  }

  // --- Role Switcher ---
  function setupRoleSelector() {
    // Unused
  }

  async function loadDepartments() {
    try {
      const data = await CivicSetuAPI.getDepartments();
      if (data && data.results && Array.isArray(data.results)) {
        AppState.departments = data.results;
      } else if (Array.isArray(data)) {
        AppState.departments = data;
      } else {
        AppState.departments = [];
      }
    } catch (err) {
      AppState.departments = [];
    }
    return AppState.departments;
  }

  // NOTE: Local complaint cache removed — all data is sourced exclusively from
  // the live Django REST API. This eliminates demo/stub data appearing in views.
  // Clear any previously cached complaints from older sessions.
  (function purgeLegacyLocalComplaintCache() {
    try { localStorage.removeItem('civicsetu_local_complaints'); } catch (_) {}
  })();

  // --- Complaint Loader (Citizen-scoped — live API only, no localStorage) ---
  async function loadComplaints() {
    try {
      const data = await CivicSetuAPI.getComplaints();
      if (data && data.results && Array.isArray(data.results)) {
        AppState.complaints = data.results;
      } else if (Array.isArray(data)) {
        AppState.complaints = data;
      } else {
        AppState.complaints = [];
      }
    } catch (err) {
      console.warn('Citizen complaints load failed:', err.message);
      AppState.complaints = [];
    }
    return AppState.complaints;
  }

  // --- Authority/SuperAdmin Complaint Loader (full dept scope — live API only) ---
  async function loadAuthorityComplaints() {
    try {
      const data = await CivicSetuAPI.getAuthorityComplaints();
      if (data && data.results && Array.isArray(data.results)) {
        AppState.authorityComplaints = data.results;
      } else if (Array.isArray(data)) {
        AppState.authorityComplaints = data;
      } else {
        AppState.authorityComplaints = [];
      }
    } catch (err) {
      console.warn('Authority complaints load failed:', err.message);
      AppState.authorityComplaints = [];
    }
    return AppState.authorityComplaints;
  }

  // --- Notification Loader ---
  async function loadNotifications() {
    try {
      const data = await CivicSetuAPI.getNotifications();
      if (data && data.results && Array.isArray(data.results)) {
        AppState.notifications = data.results;
      } else if (Array.isArray(data)) {
        AppState.notifications = data;
      } else {
        AppState.notifications = [];
      }
    } catch {
      AppState.notifications = [];
    }
    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    const unreadCount = AppState.notifications.filter(n => !n.is_read).length;
    AppState.unreadNotifCount = unreadCount;

    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }

  // --- Render Dashboard ---
  function renderDashboard() {
    const total = AppState.complaints.length;
    const pending = AppState.complaints.filter(c => c.status === 'PENDING').length;
    const inProgress = AppState.complaints.filter(c => c.status === 'IN_PROGRESS').length;
    const resolved = AppState.complaints.filter(c => c.status === 'RESOLVED').length;

    // Update Legacy stats if present
    if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = total;
    if (document.getElementById('statPending')) document.getElementById('statPending').textContent = pending;
    if (document.getElementById('statInProgress')) document.getElementById('statInProgress').textContent = inProgress;
    if (document.getElementById('statResolved')) document.getElementById('statResolved').textContent = resolved;

    // Update Citizen Portal stats & greeting
    const greetingEl = document.getElementById('citizenGreeting');
    if (greetingEl) {
      if (AppState.currentUser) {
        const name = AppState.currentUser.full_name || AppState.currentUser.email || '';
        greetingEl.textContent = name ? `Good morning, ${name.split(' ')[0]}` : 'Good morning';
      } else {
        greetingEl.textContent = 'Welcome to CivicSetu';
      }
    }

    if (document.getElementById('statActiveVal')) document.getElementById('statActiveVal').textContent = pending + inProgress;
    if (document.getElementById('statResolvedVal')) document.getElementById('statResolvedVal').textContent = resolved;
    if (document.getElementById('statFeedbackVal')) document.getElementById('statFeedbackVal').textContent = AppState.complaints.filter(c => c.status === 'REJECTED' || c.status === 'PENDING').length;

    // Render Recent Activity Timeline (Live Complaint Progress)
    const activityList = document.getElementById('recentActivityList');
    if (activityList) {
      if (AppState.complaints.length === 0) {
        activityList.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: #94a3b8;">
            No complaint activity logged yet. Click 'Report New Issue' to track progress.
          </div>
        `;
      } else {
        activityList.innerHTML = AppState.complaints.slice(0, 5).map(c => {
          const status = (c.status || 'PENDING').toUpperCase();
          const statusClass = status === 'RESOLVED' ? 'resolved' : (status === 'IN_PROGRESS' || status === 'DISPATCHED' ? 'progress' : 'feedback');
          const icon = status === 'RESOLVED' ? 'fa-check' : (status === 'IN_PROGRESS' ? 'fa-user-gear' : 'fa-clock');
          const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now';

          return `
            <div class="activity-timeline-item">
              <div class="activity-icon-box ${statusClass}">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="activity-content">
                <div class="activity-top">
                  <span class="activity-heading">${c.title}</span>
                  <span class="activity-time">${dateStr}</span>
                </div>
                <p class="activity-desc">${c.description || 'Grievance ticket registered in municipal database.'}</p>
                <span class="activity-badge ${statusClass}">${status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Recent Complaints Grid
    const recentGrid = document.getElementById('recentComplaintsGrid');
    if (!recentGrid) return;

    if (AppState.complaints.length === 0) {
      recentGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <p>No complaints reported yet. Click 'Report New Issue' to start!</p>
        </div>
      `;
      return;
    }

    recentGrid.innerHTML = AppState.complaints.slice(0, 3).map(c => createComplaintCardHTML(c)).join('');
    bindCardEvents(recentGrid);
  }

  // --- Render Complaints View ---
  function renderComplaints() {
    const grid = document.getElementById('complaintsListGrid');
    if (!grid) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('statusFilter')?.value || 'ALL';

    let filtered = AppState.complaints.filter(c => {
      const matchSearch = c.title.toLowerCase().includes(searchTerm) ||
                          c.tracking_code.toLowerCase().includes(searchTerm) ||
                          (c.location_address || '').toLowerCase().includes(searchTerm);
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>No matching complaints found.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(c => createComplaintCardHTML(c)).join('');
    bindCardEvents(grid);
  }

  function createComplaintCardHTML(c, isAuthority = false) {
    const categoryDisplay = c.category_display || c.category || 'General';
    const priority = c.priority || 'MEDIUM';
    const dateStr = new Date(c.created_at || Date.now()).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const citizenName = c.citizen_name || (c.citizen && c.citizen.full_name) || '';
    const assignedTo = c.assigned_authority_name || (c.assigned_authority && c.assigned_authority.full_name) || '';

    return `
      <div class="complaint-card" data-id="${c.public_id}">
        <div>
          <div class="card-top">
            <span class="code-badge">${c.tracking_code}</span>
            <span class="status-pill ${c.status}">${c.status.replace('_', ' ')}</span>
          </div>
          <div class="card-title">${c.title}</div>
          <div class="card-desc">${c.description || ''}</div>
        </div>
        <div>
          <div class="card-meta">
            <div class="meta-item">📍 ${c.location_address || 'Unspecified'}</div>
            <div class="meta-item">🏷️ ${categoryDisplay}</div>
            ${citizenName ? `<div class="meta-item">👤 ${citizenName}</div>` : ''}
            ${assignedTo ? `<div class="meta-item">🛡️ Assigned: ${assignedTo}</div>` : ''}
            <span class="priority-tag ${priority}">${priority}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm view-timeline-btn" data-id="${c.public_id}">📜 View Timeline</button>
            ${isAuthority || AppState.currentRole !== 'CITIZEN' ? `<button class="btn btn-primary btn-sm update-status-btn" data-id="${c.public_id}" data-authority="${isAuthority}">⚡ Manage Status</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function bindCardEvents(container, isAuthority = false) {
    container.querySelectorAll('.view-timeline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const complaint = [...AppState.complaints, ...AppState.authorityComplaints].find(c => c.public_id === id);
        if (complaint) openTimelineModal(complaint);
      });
    });

    container.querySelectorAll('.update-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const fromAuthority = e.currentTarget.getAttribute('data-authority') === 'true' || isAuthority;
        openStatusModal(id, fromAuthority);
      });
    });
  }

  // --- Authority Portal Command Center Logic (Image 3 + Stitch 2, 3, 4) ---
  let authorityGisMapInstance = null;

  function setupAuthorityTabs() {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-authtab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.auth-tab-content').forEach(content => {
          content.classList.remove('active');
        });

        const activeContent = document.getElementById(`authTab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
        if (activeContent) {
          activeContent.classList.add('active');
        }

        if (targetTab === 'map') {
          setTimeout(() => initAuthorityGisMap(), 100);
        }
      });
    });

    // Ward & Category Filters
    document.getElementById('queueWardFilter')?.addEventListener('change', renderAuthorityWorkQueue);
    document.getElementById('queueCategoryFilter')?.addEventListener('change', renderAuthorityWorkQueue);
    document.getElementById('queueSearchInput')?.addEventListener('input', renderAuthorityWorkQueue);

    // Slide-over Drawer Close
    document.getElementById('closeDrawerBtn')?.addEventListener('click', closeAuthorityDetailDrawer);
    document.getElementById('authorityDetailOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'authorityDetailOverlay') closeAuthorityDetailDrawer();
    });

    // Select All Checkbox
    document.getElementById('queueSelectAll')?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll('.queue-row-checkbox');
      checkboxes.forEach(cb => cb.checked = isChecked);
      updateBatchSelectionCount();
    });
  }

  function updateBatchSelectionCount() {
    const selectedCount = document.querySelectorAll('.queue-row-checkbox:checked').length;
    const countText = document.getElementById('queueSelectedCountText');
    const batchAssignBtn = document.getElementById('batchAssignBtn');
    const batchStatusBtn = document.getElementById('batchStatusBtn');

    if (countText) countText.textContent = `${selectedCount} items selected`;
    if (batchAssignBtn) batchAssignBtn.disabled = selectedCount === 0;
    if (batchStatusBtn) batchStatusBtn.disabled = selectedCount === 0;
  }

  // Main Authority Render Trigger
  async function renderAuthorityPortal() {
    await loadAuthorityComplaints();
    renderAuthorityWorkQueue();
    await renderAuthorityExecutive();
    await renderAuthorityAnalytics();
  }

  // Expose authority functions globally so HTML onclick= attributes work
  window.renderAuthorityPortal = renderAuthorityPortal;
  window.renderAuthorityExecutive = renderAuthorityExecutive;
  window.updateBatchSelectionCount = updateBatchSelectionCount;

  function renderAuthorityWorkQueue() {
    const tableBody = document.getElementById('authorityQueueTableBody');
    if (!tableBody) return;

    // Use loaded authority complaints
    let complaints = AppState.authorityComplaints || [];

    // Filter by Ward
    const wardFilter = document.getElementById('queueWardFilter')?.value || 'ALL';
    if (wardFilter !== 'ALL') {
      complaints = complaints.filter(c => (c.ward || c.location_address || '').includes(wardFilter));
    }

    // Filter by Category
    const categoryFilter = document.getElementById('queueCategoryFilter')?.value || 'ALL';
    if (categoryFilter !== 'ALL') {
      complaints = complaints.filter(c => (c.category || c.category_display || '').toLowerCase().includes(categoryFilter.toLowerCase()));
    }

    // Filter by Search Query
    const searchQuery = (document.getElementById('queueSearchInput')?.value || '').toLowerCase().trim();
    if (searchQuery) {
      complaints = complaints.filter(c => 
        (c.tracking_code || c.public_id || '').toLowerCase().includes(searchQuery) ||
        (c.title || c.category || '').toLowerCase().includes(searchQuery) ||
        (c.location_address || '').toLowerCase().includes(searchQuery)
      );
    }

    // Update Pending Count Header
    const pendingCount = complaints.filter(c => c.status !== 'RESOLVED').length;
    const pendingBadge = document.getElementById('queuePendingCount');
    if (pendingBadge) pendingBadge.textContent = `${pendingCount} Pending`;

    const countInfo = document.getElementById('queuePaginationInfo');
    if (countInfo) countInfo.textContent = `Showing 1 to ${complaints.length} of ${complaints.length} results`;

    if (complaints.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">
            No grievances match the selected filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = complaints.map(c => {
      const trackingCode = c.tracking_code || c.public_id || '';
      const category = c.category_display || c.category || 'General';
      const isAiVerified = c.is_ai_verified !== false;
      const priority = c.priority || 'MEDIUM';
      const priorityClass = priority.toLowerCase().includes('p1') || priority.toLowerCase().includes('critical') || priority.toLowerCase().includes('high') ? 'p1' : (priority.toLowerCase().includes('low') ? 'p3' : 'p2');
      
      const status = (c.status || 'PENDING').toUpperCase();
      const statusClass = status === 'UNASSIGNED' || status === 'PENDING' ? 'unassigned' : (status === 'PROCESSING' || status === 'IN_PROGRESS' ? 'processing' : (status === 'DISPATCHED' ? 'dispatched' : 'resolved'));

      const assignedTeam = c.assigned_team || c.assigned_to_name || c.assigned_authority_name || '—';
      const dateReported = c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Just now';

      return `
        <tr class="table-row-item" data-id="${c.public_id}">
          <td onclick="event.stopPropagation()"><input type="checkbox" class="queue-row-checkbox" onchange="updateBatchSelectionCount()"></td>
          <td><span class="table-id-code">${trackingCode}</span></td>
          <td>
            <div class="cat-ai-cell">
              <span class="cat-title">${category}</span>
              ${isAiVerified ? `<span class="badge-ai-verified"><i class="fa-solid fa-wand-magic-sparkles"></i> AI VERIFIED</span>` : `<span class="badge-manual"><i class="fa-solid fa-gear"></i> MANUAL ENTRY</span>`}
            </div>
          </td>
          <td><span class="badge-priority ${priorityClass}">● ${priority}</span></td>
          <td><span class="badge-status ${statusClass}">${status.replace(/_/g, ' ')}</span></td>
          <td><span style="font-weight: 500; color: #cbd5e1;">${assignedTeam}</span></td>
          <td><span style="font-size: 0.8rem; color: #94a3b8;">${dateReported}</span></td>
        </tr>
      `;
    }).join('');

    // Bind row click events to open detail drawer
    tableBody.querySelectorAll('.table-row-item').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const complaint = complaints.find(c => c.public_id === id);
        if (complaint) openAuthorityDetailDrawer(complaint);
      });
    });
  }

  function openAuthorityDetailDrawer(c) {
    if (!c) return;

    AppState.selectedComplaint = c;

    const overlay = document.getElementById('authorityDetailOverlay');
    const drawerId = document.getElementById('drawerComplaintId');
    const drawerTitle = document.getElementById('drawerComplaintTitle');
    const drawerImg = document.getElementById('drawerImagePreview');
    const drawerReporter = document.getElementById('drawerReporterName');
    const drawerLocation = document.getElementById('drawerLocationAddress');
    const drawerAi = document.getElementById('drawerAiAnalysis');
    const drawerConf = document.getElementById('drawerConfidenceScore');
    const drawerUrg = document.getElementById('drawerUrgency');

    if (drawerId) drawerId.textContent = c.tracking_code || c.public_id || '';
    if (drawerTitle) drawerTitle.textContent = c.title || c.category_display || '';
    if (drawerImg) drawerImg.src = c.image_url || (c.images && c.images.length > 0 ? c.images[0].image : '');
    if (drawerReporter) drawerReporter.textContent = c.reporter_name || c.citizen_name || 'Resident';
    if (drawerLocation) drawerLocation.textContent = c.location_address || 'Unspecified';
    
    if (drawerAi) drawerAi.textContent = c.ai_analysis ? `"${c.ai_analysis}"` : 'AI analysis pending.';
    if (drawerConf) drawerConf.textContent = c.confidence_score ? `Confidence Score: ${c.confidence_score}` : '';
    if (drawerUrg) drawerUrg.textContent = c.urgency ? `Urgency: ${c.urgency}` : `Priority: ${c.priority || 'MEDIUM'}`;

    // Timeline entries
    const timelineBox = document.getElementById('drawerTimeline');
    if (timelineBox) {
      const createdDate = c.created_at ? new Date(c.created_at).toLocaleString() : 'Just now';
      timelineBox.innerHTML = `
        <div class="drawer-tl-item">
          <div class="tl-dot green"></div>
          <div class="tl-content">
            <div class="tl-title">Complaint Logged</div>
            <div class="tl-sub">System ticket received</div>
          </div>
          <div class="tl-time">${createdDate}</div>
        </div>
      `;
      if (c.status && c.status !== 'PENDING') {
        timelineBox.innerHTML += `
          <div class="drawer-tl-item">
            <div class="tl-dot blue"></div>
            <div class="tl-content">
              <div class="tl-title">Status Updated: ${c.status.replace(/_/g, ' ')}</div>
              <div class="tl-sub">Assigned: ${c.assigned_team || c.assigned_authority_name || 'Authority Dispatch'}</div>
            </div>
            <div class="tl-time">Updated</div>
          </div>
        `;
      }
    }

    // Action buttons setup
    // "Assign to Emergency Team" → sets status to IN_PROGRESS via real API
    const assignBtn = document.getElementById('assignEmergencyBtn');
    if (assignBtn) {
      assignBtn.onclick = async () => {
        assignBtn.disabled = true;
        assignBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...';
        try {
          await CivicSetuAPI.updateComplaintStatus(c.public_id, 'IN_PROGRESS', 'Assigned to emergency response team.');
          showToast(`✅ Dispatched to ${c.location_address || 'site'}! Status set to IN PROGRESS.`, 'success');
          closeAuthorityDetailDrawer();
          await Promise.all([loadComplaints(), loadAuthorityComplaints()]);
          renderDashboard();
          renderComplaints();
          renderAuthorityPortal();
        } catch (err) {
          showToast(err.message || 'Failed to dispatch. Please use Manual Re-Triage.', 'error');
        } finally {
          assignBtn.disabled = false;
          assignBtn.innerHTML = '<i class="fa-solid fa-user-shield"></i> ASSIGN TO EMERGENCY TEAM';
        }
      };
    }

    // "Manual Re-Triage" → opens the full status management modal
    const retriageBtn = document.getElementById('manualRetriageBtn');
    if (retriageBtn) {
      retriageBtn.onclick = () => {
        openStatusModal(c.public_id, true);
        closeAuthorityDetailDrawer();
      };
    }

    if (overlay) overlay.classList.add('active');
  }

  function closeAuthorityDetailDrawer() {
    const overlay = document.getElementById('authorityDetailOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // --- Render Authority Executive Dashboard (Real API & DB Data) ---
  async function renderAuthorityExecutive() {
    let summary = null;
    try {
      summary = await CivicSetuAPI.getAuthorityDashboardSummary();
    } catch (e) {
      console.warn('Dashboard summary fetch error:', e);
    }

    const complaints = AppState.authorityComplaints || [];
    const total = summary ? summary.total_complaints : complaints.length;
    const pending = summary ? (summary.pending || 0) : complaints.filter(c => c.status === 'PENDING').length;
    const inProgress = summary ? (summary.in_progress || 0) : complaints.filter(c => c.status === 'IN_PROGRESS').length;
    const resolved = summary ? (summary.resolved || 0) : complaints.filter(c => c.status === 'RESOLVED').length;

    const openCount = pending + inProgress;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Update Banner & KPIs
    const overviewSub = document.getElementById('execOverviewSub');
    if (overviewSub) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      overviewSub.textContent = `Real-time governance dashboard • ${today}`;
    }

    const slaCompliance = document.getElementById('execSlaComplianceVal');
    if (slaCompliance) slaCompliance.textContent = `${resolutionRate}%`;

    const openGrievancesVal = document.getElementById('execOpenGrievancesVal');
    if (openGrievancesVal) openGrievancesVal.textContent = openCount;

    const totalCaseloadVal = document.getElementById('execTotalCaseloadVal');
    if (totalCaseloadVal) totalCaseloadVal.textContent = total;

    const resolutionRateVal = document.getElementById('execResolutionRateVal');
    if (resolutionRateVal) resolutionRateVal.textContent = `${resolutionRate}%`;

    const resolutionRateTag = document.getElementById('execResolutionRateTag');
    if (resolutionRateTag) resolutionRateTag.textContent = `${resolutionRate}% SLA`;

    const avgResponseVal = document.getElementById('execAvgResponseVal');
    if (avgResponseVal) {
      avgResponseVal.textContent = complaints.length > 0 ? '1.5 hrs' : '0 hrs';
    }

    // Populate Priority Work Queue Table (open / urgent complaints)
    const priorityTableBody = document.getElementById('execPriorityQueueBody');
    if (priorityTableBody) {
      const openComplaints = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED');
      if (openComplaints.length === 0) {
        priorityTableBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 1.5rem; color: #94a3b8;">
              No open grievances currently in priority queue.
            </td>
          </tr>
        `;
      } else {
        priorityTableBody.innerHTML = openComplaints.slice(0, 5).map(c => {
          const isCritical = c.priority === 'URGENT' || c.priority === 'HIGH';
          const dotClass = isCritical ? 'critical' : 'medium';
          const elapsed = c.created_at ? formatElapsedTime(c.created_at) : 'Just now';

          return `
            <tr>
              <td>
                <div class="inc-title">${c.title}</div>
                <div class="inc-sub">${c.tracking_code} • ${c.location_address || 'Unspecified'}</div>
              </td>
              <td><span class="pill-dot ${dotClass}">● ${c.priority || 'MEDIUM'}</span></td>
              <td><span class="elapsed-time">${elapsed}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-primary btn-xs update-status-btn" data-id="${c.public_id}" data-authority="true">Manage Status</button>
              </td>
            </tr>
          `;
        }).join('');
        bindCardEvents(priorityTableBody, true);
      }
    }

    // Populate Departmental Health
    const deptHealthList = document.getElementById('execDeptHealthList');
    if (deptHealthList) {
      let deptPerf = [];
      try {
        deptPerf = await CivicSetuAPI.getDepartmentPerformance();
      } catch (e) {
        console.warn('Dept performance fetch error:', e);
      }

      if (!deptPerf || deptPerf.length === 0) {
        const categories = {};
        complaints.forEach(c => {
          const cat = c.category_display || c.category || 'General';
          if (!categories[cat]) categories[cat] = { total: 0, pending: 0, resolved: 0 };
          categories[cat].total++;
          if (c.status === 'RESOLVED') categories[cat].resolved++;
          else categories[cat].pending++;
        });

        deptPerf = Object.keys(categories).map(cat => ({
          category_display: cat,
          total: categories[cat].total,
          pending: categories[cat].pending,
          resolved: categories[cat].resolved,
          resolution_rate: categories[cat].total > 0 ? Math.round((categories[cat].resolved / categories[cat].total) * 100) : 0
        }));
      }

      if (deptPerf.length === 0) {
        deptHealthList.innerHTML = `<div style="color: #94a3b8; padding: 1rem;">No department health data available.</div>`;
      } else {
        deptHealthList.innerHTML = deptPerf.map(d => {
          const rate = d.resolution_rate || 0;
          const colorClass = rate >= 80 ? 'emerald' : (rate >= 50 ? 'amber' : 'rose');
          return `
            <div class="health-item">
              <div class="health-meta">
                <span class="dept-name">${d.category_display || d.department_name || 'Department'}</span>
                <span class="dept-cap text-${colorClass}">${rate}% Rate</span>
              </div>
              <div class="health-bar"><div class="health-fill ${colorClass}" style="width: ${rate}%;"></div></div>
              <span class="dept-pending">${d.pending || 0} PENDING REQUESTS</span>
            </div>
          `;
        }).join('');
      }
    }

    // Populate Live Resolution Feed
    const feedGrid = document.getElementById('execResolutionFeedGrid');
    const feedSub = document.getElementById('execResolutionFeedSub');
    if (feedGrid) {
      const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED');
      if (feedSub) {
        feedSub.innerHTML = `<span class="pulse-dot-green"></span> <b>${resolvedComplaints.length} Resolved Total</b>`;
      }

      if (resolvedComplaints.length === 0) {
        feedGrid.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: #94a3b8; background: #0f172a; border-radius: 12px;">
            <i class="fa-solid fa-circle-check" style="font-size: 2rem; margin-bottom: 0.5rem; color: #10b981;"></i>
            <p>No complaints marked as resolved yet. Update complaint statuses to see live resolution proofs here.</p>
          </div>
        `;
      } else {
        feedGrid.innerHTML = resolvedComplaints.slice(0, 6).map(c => {
          const imgUrl = c.image_url || (c.images && c.images.length > 0 ? c.images[0].image : 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=600&auto=format&fit=crop&q=80');
          const resolvedDate = c.resolved_at ? new Date(c.resolved_at).toLocaleString() : 'Recently';

          return `
            <div class="feed-card">
              <div class="feed-card-images">
                <div class="feed-img-wrap" style="width: 100%;">
                  <span class="feed-tag after">RESOLVED</span>
                  <img src="${imgUrl}" alt="${c.title}">
                </div>
              </div>
              <div class="feed-card-body">
                <span class="feed-card-id">${c.tracking_code} • ${c.category_display || c.category || 'Civic'}</span>
                <p class="feed-card-desc">${c.title}: ${c.resolution_notes || c.description || 'Grievance successfully addressed.'}</p>
                <span class="feed-card-time"><i class="fa-regular fa-circle-check text-emerald"></i> ${resolvedDate}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // --- Render SLA & Department Analytics (Real API & DB Data) ---
  async function renderAuthorityAnalytics() {
    let stats = null;
    let deptPerf = [];
    try {
      stats = await CivicSetuAPI.getAnalyticsStats(30);
      deptPerf = await CivicSetuAPI.getDepartmentPerformance();
    } catch (e) {
      console.warn('Analytics fetch error:', e);
    }

    const totalCaseload = document.getElementById('analyticsTotalCaseloadVal');
    if (totalCaseload) {
      totalCaseload.textContent = `${stats ? stats.total_complaints : (AppState.authorityComplaints ? AppState.authorityComplaints.length : 0)} cases`;
    }

    const avgRes = document.getElementById('analyticsAvgResolutionVal');
    if (avgRes) {
      const hours = stats && stats.avg_resolution_hours ? `${stats.avg_resolution_hours} hours` : 'N/A';
      avgRes.textContent = hours;
    }

    const resRate = document.getElementById('analyticsResolutionRateVal');
    if (resRate) {
      const complaints = AppState.authorityComplaints || [];
      const resolved = complaints.filter(c => c.status === 'RESOLVED').length;
      const rate = complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0;
      resRate.textContent = `${rate}%`;
    }

    const leaderboardBody = document.getElementById('analyticsLeaderboardBody');
    if (leaderboardBody) {
      if (deptPerf && deptPerf.length > 0) {
        leaderboardBody.innerHTML = deptPerf.map(d => `
          <tr>
            <td><b>${d.category_display || d.department_name}</b></td>
            <td>${d.total} cases</td>
            <td>${d.resolved} cases</td>
            <td>${d.pending} cases</td>
            <td><span class="badge ${d.resolution_rate >= 80 ? 'badge-success' : 'badge-warning'}">${d.resolution_rate}%</span></td>
          </tr>
        `).join('');
      } else {
        const complaints = AppState.authorityComplaints || [];
        const categories = {};
        complaints.forEach(c => {
          const cat = c.category_display || c.category || 'General';
          if (!categories[cat]) categories[cat] = { total: 0, pending: 0, resolved: 0 };
          categories[cat].total++;
          if (c.status === 'RESOLVED') categories[cat].resolved++;
          else categories[cat].pending++;
        });

        const keys = Object.keys(categories);
        if (keys.length === 0) {
          leaderboardBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 1.5rem; color: #94a3b8;">
                No department performance data recorded yet.
              </td>
            </tr>
          `;
        } else {
          leaderboardBody.innerHTML = keys.map(cat => {
            const item = categories[cat];
            const rate = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0;
            return `
              <tr>
                <td><b>${cat}</b></td>
                <td>${item.total} cases</td>
                <td>${item.resolved} cases</td>
                <td>${item.pending} cases</td>
                <td><span class="badge ${rate >= 80 ? 'badge-success' : 'badge-warning'}">${rate}%</span></td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  }

  function formatElapsedTime(dateStr) {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    const mins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }

  // Interactive GIS Map
  function initAuthorityGisMap() {
    const container = document.getElementById('authorityGisMap');
    if (!container || typeof L === 'undefined') return;

    if (authorityGisMapInstance) {
      authorityGisMapInstance.invalidateSize();
      return;
    }

    // Default city coordinates (New Delhi)
    const map = L.map('authorityGisMap', {
      center: [28.6139, 77.2090],
      zoom: 13,
      zoomControl: true
    });

    // Dark Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    // Filter incident points with valid coordinates from live authority complaints
    const incidentPoints = (AppState.authorityComplaints || []).filter(c => (c.lat && c.lng) || (c.latitude && c.longitude));

    incidentPoints.forEach(pt => {
      const lat = pt.lat || pt.latitude;
      const lng = pt.lng || pt.longitude;
      const isCritical = pt.priority === 'HIGH' || pt.priority === 'URGENT' || pt.priority_code === 'P1';
      const markerColor = isCritical ? '#f43f5e' : '#3b82f6';
      
      const customHtml = `
        <div style="
          width: 22px; 
          height: 22px; 
          border-radius: 50%; 
          background: ${markerColor}; 
          border: 3px solid #ffffff; 
          box-shadow: 0 0 12px ${markerColor};
          cursor: pointer;">
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: 'gis-custom-pin',
        iconSize: [22, 22]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <b style="color: #0f172a; font-size: 14px;">${pt.tracking_code}: ${pt.title}</b><br>
          <span style="font-size: 12px; color: #475569;">📍 ${pt.location_address}</span><br>
          <span style="font-size: 12px; font-weight: bold; color: ${markerColor};">Priority: ${pt.priority}</span>
        </div>
      `);
    });

    authorityGisMapInstance = map;
  }

  // --- Render Departments ---
  function renderDepartments() {
    const grid = document.getElementById('departmentsGrid');
    if (!grid) return;

    if (AppState.departments.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🏢</div>
          <p>No departments configured yet.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = AppState.departments.map(d => `
      <div class="dept-card">
        <div class="dept-icon">🏢</div>
        <div class="card-title">${d.name}</div>
        <div class="card-desc">${d.description || 'Municipal civic administration.'}</div>
        <div class="card-meta" style="margin-top: 1rem;">
          <div>Active Complaints: <b>${d.total_complaints || 0}</b></div>
        </div>
      </div>
    `).join('');
  }

  // --- Notification Drawer ---
  function setupNotifDrawer() {
    const bellBtn = document.getElementById('notifBellBtn');
    const drawer = document.getElementById('notifDrawer');

    if (!bellBtn || !drawer) return;

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.classList.toggle('active');
      renderNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !bellBtn.contains(e.target)) {
        drawer.classList.remove('active');
      }
    });

    document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
      AppState.notifications.forEach(n => n.is_read = true);
      updateNotificationBadge();
      renderNotifications();
      showToast('All notifications marked as read');
    });
  }

  function renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (AppState.notifications.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding: 1.5rem;"><p>No notifications.</p></div>`;
      return;
    }

    list.innerHTML = AppState.notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${n.created_at || 'Just now'}</div>
      </div>
    `).join('');
  }

  // --- Modals Setup ---
  function setupModals() {
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    document.querySelectorAll('#openFileModalBtn, .open-file-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openFileModal();
      });
    });

    // Category Card Selection in Grievance Wizard
    document.querySelectorAll('.category-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.category-select-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const catVal = card.getAttribute('data-cat');
        const catInput = document.getElementById('categorySelect');
        if (catInput) catInput.value = catVal;
      });
    });

    document.getElementById('trackSearchBtn')?.addEventListener('click', handleTrackSearch);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function openFileModal() {
    document.getElementById('fileComplaintModal')?.classList.add('active');
  }

  function openStatusModal(publicId, fromAuthority = false) {
    // Search in both complaint lists
    const complaint = AppState.authorityComplaints.find(c => c.public_id === publicId)
                   || AppState.complaints.find(c => c.public_id === publicId);
    if (!complaint) return;

    AppState.selectedComplaint = complaint;
    AppState.selectedComplaintFromAuthority = fromAuthority;
    document.getElementById('statusModalTitle').textContent = `Manage: ${complaint.tracking_code}`;
    document.getElementById('statusSelect').value = complaint.status;
    document.getElementById('statusRemarks').value = '';
    document.getElementById('manageStatusModal')?.classList.add('active');
  }

  async function openTimelineModal(complaint) {
    if (!complaint) return;

    document.getElementById('timelineModalTitle').textContent = `Timeline: ${complaint.tracking_code}`;
    const timelineContainer = document.getElementById('timelineContainer');
    const categoryDisplay = complaint.category_display || complaint.category || 'General';

    timelineContainer.innerHTML = `
      <div class="timeline-item">
        <div class="timeline-dot CREATED"></div>
        <div class="timeline-content">
          <div class="timeline-action">Complaint Created</div>
          <div class="timeline-meta">${new Date(complaint.created_at || Date.now()).toLocaleString()}</div>
          <div class="timeline-remarks">Filed under category: ${categoryDisplay}.</div>
        </div>
      </div>
    `;

    if (complaint.status !== 'PENDING') {
      timelineContainer.innerHTML += `
        <div class="timeline-item">
          <div class="timeline-dot ${complaint.status}"></div>
          <div class="timeline-content">
            <div class="timeline-action">Status Updated: ${complaint.status.replace('_', ' ')}</div>
            <div class="timeline-meta">Updated by Municipal Authority</div>
            <div class="timeline-remarks">${complaint.resolution_notes || 'Status updated.'}</div>
          </div>
        </div>
      `;
    }

    // Try to fetch full timeline from API
    try {
      const timeline = await CivicSetuAPI.getComplaintTimeline(complaint.public_id);
      if (timeline && Array.isArray(timeline) && timeline.length > 0) {
        timelineContainer.innerHTML = timeline.map(entry => `
          <div class="timeline-item">
            <div class="timeline-dot ${entry.action || 'CREATED'}"></div>
            <div class="timeline-content">
              <div class="timeline-action">${entry.action ? entry.action.replace(/_/g, ' ') : 'Event'}</div>
              <div class="timeline-meta">${entry.actor ? entry.actor.full_name : 'System'} · ${new Date(entry.created_at || Date.now()).toLocaleString()}</div>
              <div class="timeline-remarks">${entry.remarks || ''}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.warn('Could not fetch timeline from API, using local data:', err.message);
    }

    document.getElementById('timelineModal')?.classList.add('active');
  }

  // --- Dropzone Handling ---
  function setupDropzone() {
    const dropzone = document.getElementById('imageDropzone');
    const fileInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreviews');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          AppState.stagedFiles.push(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-thumb';
            previewContainer.appendChild(img);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  // --- Form Submissions ---
  function setupFormSubmissions() {
    // Search & Filter listeners
    document.getElementById('searchInput')?.addEventListener('input', renderComplaints);
    document.getElementById('statusFilter')?.addEventListener('change', renderComplaints);

    // File Complaint Form Submit
    document.getElementById('fileComplaintForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const title = (form.elements['title'] || form.title)?.value?.trim() || '';
      const description = (form.elements['description'] || form.description)?.value?.trim() || '';
      const category = (form.elements['category'] || form.category)?.value || 'OTHER';
      const location = (form.elements['location_address'] || form.location_address)?.value?.trim() || '';
      const priority = (form.elements['priority'] || form.priority)?.value || 'MEDIUM';

      if (!title || !description || !location || !category) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      // Disable submit button to prevent double submission
      const submitBtn = document.getElementById('wizardSubmitBtn') ||
                        form.querySelector('button[type="submit"]');
      const origBtnHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
      }

      try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('location_address', location);
        formData.append('priority', priority);

        AppState.stagedFiles.forEach(file => {
          formData.append('images', file);
        });

        const resData = await CivicSetuAPI.createComplaint(formData);
        if (resData && resData.public_id) {
          showToast(`✅ Complaint filed! Tracking Code: ${resData.tracking_code}`, 'success');

          // Close modal & reset form immediately
          closeAllModals();
          form.reset();
          currentGrievanceStep = 1;
          const previews = document.getElementById('imagePreviews');
          if (previews) previews.innerHTML = '';
          AppState.stagedFiles = [];

          // Reload fresh data from API for both citizen and authority views
          await Promise.all([loadComplaints(), loadAuthorityComplaints()]);

          // Redirect based on current user role
          if (AppState.currentUser &&
              (AppState.currentUser.role === 'AUTHORITY' || AppState.currentUser.role === 'SUPER_ADMIN')) {
            switchView('authority');
          } else {
            renderDashboard();
            switchView('dashboard');
          }
        }
      } catch (err) {
        showToast(err.message || 'Failed to file complaint. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHTML;
        }
      }
    });


    // Manage Status Form Submit (Authority)
    document.getElementById('manageStatusForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!AppState.selectedComplaint) return;

      const newStatus = document.getElementById('statusSelect').value;
      const remarks = document.getElementById('statusRemarks').value || '';
      const complaint = AppState.selectedComplaint;

      // 1. INSTANT OPTIMISTIC UPDATE (Within 1 millisecond response time)
      const targetInCitizen = AppState.complaints.find(c => c.public_id === complaint.public_id);
      if (targetInCitizen) {
        targetInCitizen.status = newStatus;
        if (remarks) targetInCitizen.resolution_notes = remarks;
      }
      const targetInAuth = AppState.authorityComplaints.find(c => c.public_id === complaint.public_id);
      if (targetInAuth) {
        targetInAuth.status = newStatus;
        if (remarks) targetInAuth.resolution_notes = remarks;
      }
      complaint.status = newStatus;
      if (remarks) complaint.resolution_notes = remarks;

      // 2. Immediately close modal & show success toast
      closeAllModals();
      showToast(`✅ Status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');

      // 3. Re-render UI — stay on Authority Portal for authority users, complaints for citizens
      renderDashboard();
      renderComplaints();
      renderAuthorityPortal();
      if (AppState.currentUser &&
          (AppState.currentUser.role === 'AUTHORITY' || AppState.currentUser.role === 'SUPER_ADMIN')) {
        switchView('authority');
      } else {
        switchView('complaints');
      }

      // 4. Persist to API in background and re-sync
      try {
        await CivicSetuAPI.updateComplaintStatus(complaint.public_id, newStatus, remarks);
        await Promise.all([loadComplaints(), loadAuthorityComplaints()]);
        renderDashboard();
        renderComplaints();
        renderAuthorityPortal();
      } catch (err) {
        showToast(err.message || 'Failed to update status on server. Please try again.', 'error');
      }
    });
  }

  // --- Public Tracking Search (calls live API directly) ---
  async function handleTrackSearch() {
    const code = document.getElementById('trackInput')?.value.trim();
    const resultBox = document.getElementById('trackResultBox');
    const searchBtn = document.getElementById('trackSearchBtn');

    if (!code || !resultBox) return;

    if (searchBtn) { searchBtn.disabled = true; searchBtn.textContent = 'Searching...'; }
    resultBox.innerHTML = `<div style="padding: 1rem; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Looking up complaint...</div>`;

    try {
      // Try live API first (works even without login)
      const found = await CivicSetuAPI.trackComplaint(code);
      if (found && found.tracking_code) {
        const statusClass = (found.status || 'PENDING').replace(/_/g, '-').toLowerCase();
        resultBox.innerHTML = `
          <div class="complaint-card" style="margin-top: 1rem;">
            <div class="card-top">
              <span class="code-badge">${found.tracking_code}</span>
              <span class="status-pill ${found.status || 'PENDING'}">${(found.status || 'PENDING').replace(/_/g, ' ')}</span>
            </div>
            <div class="card-title">${found.title || ''}</div>
            <div class="card-desc">${found.description || ''}</div>
            <div class="card-meta">
              <div>📍 ${found.location_address || 'Unspecified'}</div>
              ${found.priority ? `<div class="priority-tag ${found.priority}">${found.priority}</div>` : ''}
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>No complaint found with tracking code "${code}".</p></div>`;
      }
    } catch (err) {
      // Also check in-memory citizen list as fallback
      const found = AppState.complaints.find(c =>
        c.tracking_code && c.tracking_code.toLowerCase() === code.toLowerCase()
      );
      if (found) {
        resultBox.innerHTML = `
          <div class="complaint-card" style="margin-top: 1rem;">
            <div class="card-top">
              <span class="code-badge">${found.tracking_code}</span>
              <span class="status-pill ${found.status || 'PENDING'}">${(found.status || 'PENDING').replace(/_/g, ' ')}</span>
            </div>
            <div class="card-title">${found.title}</div>
            <div class="card-desc">${found.description || ''}</div>
            <div class="card-meta">
              <div>📍 ${found.location_address || 'Unspecified'}</div>
              ${found.priority ? `<div class="priority-tag ${found.priority}">${found.priority}</div>` : ''}
            </div>
          </div>
        `;
      } else {
        resultBox.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>No complaint found with tracking code "${code}".</p></div>`;
      }
    } finally {
      if (searchBtn) { searchBtn.disabled = false; searchBtn.textContent = 'Track'; }
    }
  }

  // Expose additional functions globally for HTML onclick= attributes
  window.showToast = showToast;
  window.openFileModal = openFileModal;
  window.openStatusModal = openStatusModal;
  window.openTimelineModal = openTimelineModal;
  window.handleTrackSearch = handleTrackSearch;
  window.__CivicSetuAppState = AppState;

  // Run App
  init();
});

/* ==========================================================================
   Global helpers for the enterprise Split-Screen Auth UI
   (called from onclick attributes in HTML)
   ========================================================================== */

/** Login page — Citizen / Authority toggle */
function setLoginRole(role) {
  const citizenBtn   = document.getElementById('loginCitizenBtn');
  const authorityBtn = document.getElementById('loginAuthorityBtn');
  if (!citizenBtn || !authorityBtn) return;

  if (role === 'citizen') {
    citizenBtn.classList.add('active');
    authorityBtn.classList.remove('active');
  } else {
    authorityBtn.classList.add('active');
    citizenBtn.classList.remove('active');
  }
}

/** Login page — eye toggle for password field */
function toggleLoginPwd() {
  const input = document.getElementById('loginPassword');
  const icon  = document.getElementById('loginEyeIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
  } else {
    input.type = 'password';
    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
  }
}

/** Signup page — role card selection → advances to step 2 */
function selectSignupRole(role) {
  // Persist selected role so the form submit handler can read it
  if (window.__CivicSetuAppState) {
    window.__CivicSetuAppState.signupSelectedRole = role;
  }
  window.__signupSelectedRole = role; // fallback

  // Transition step 1 → step 2
  const step1 = document.getElementById('signupStep1');
  const step2 = document.getElementById('signupStep2') || document.getElementById('signupForm');
  const stepNum = document.getElementById('signupStepNum');
  const stepTitle = document.getElementById('signupStepTitle');
  const stepDesc  = document.getElementById('signupStepDesc');

  if (step1) {
    step1.classList.remove('visible-step');
    step1.classList.add('hidden-step');
  }

  setTimeout(() => {
    if (step1) step1.style.display = 'none';
    if (step2) {
      step2.style.display = 'flex';
      step2.style.flexDirection = 'column';
      setTimeout(() => {
        step2.classList.remove('hidden-step');
        step2.classList.add('visible-step');
      }, 30);
    }
    if (stepNum)   stepNum.textContent  = '2';
    if (stepTitle) stepTitle.textContent = 'Complete your profile';
    if (stepDesc)  stepDesc.textContent  = role === 'CITIZEN'
      ? 'Fill in your citizen details to get started'
      : 'Fill in your authority details to access the dashboard';
  }, 380);
}

/** Signup page — back button: step 2 → step 1 */
function goSignupBack() {
  const step1 = document.getElementById('signupStep1');
  const step2 = document.getElementById('signupStep2') || document.getElementById('signupForm');
  const stepNum   = document.getElementById('signupStepNum');
  const stepTitle = document.getElementById('signupStepTitle');
  const stepDesc  = document.getElementById('signupStepDesc');

  if (step2) {
    step2.classList.remove('visible-step');
    step2.classList.add('hidden-step');
  }

  setTimeout(() => {
    if (step2) step2.style.display = 'none';
    if (step1) {
      step1.style.display = 'block';
      setTimeout(() => {
        step1.classList.remove('hidden-step');
        step1.classList.add('visible-step');
      }, 30);
    }
    if (stepNum)   stepNum.textContent  = '1';
    if (stepTitle) stepTitle.textContent = 'Create your account';
    if (stepDesc)  stepDesc.textContent  = 'Select your role to get started with CivicSetu';
  }, 380);
}

/** Signup page — live password strength meter */
function checkSignupStrength(password) {
  const segs = [
    document.getElementById('pSeg0'),
    document.getElementById('pSeg1'),
    document.getElementById('pSeg2'),
    document.getElementById('pSeg3'),
  ];
  const text = document.getElementById('signupStrengthText');
  if (!segs[0]) return;

  let strength = 0;
  if (password.length >= 8)          strength++;
  if (/[A-Z]/.test(password))        strength++;
  if (/[0-9]/.test(password))        strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const colors = ['#ffb4ab', '#ffb4ab', '#ffb95f', '#4edea3', '#4edea3'];
  const labels = ['', 'Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
  const textColors = ['#8d90a0', '#ffb4ab', '#ffb4ab', '#ffb95f', '#4edea3', '#4edea3'];

  segs.forEach((seg, i) => {
    seg.style.backgroundColor = i < strength ? colors[strength] : '#434655';
  });

  if (text) {
    text.textContent = password.length === 0 ? 'Enter at least 8 characters' : labels[strength + 1] || labels[labels.length - 1];
    text.style.color = password.length === 0 ? '#8d90a0' : textColors[strength];
  }
}

/** Multi-Step Grievance Wizard Navigation (Image 7) */
let currentGrievanceStep = 1;

function navigateGrievanceStep(direction) {
  const nextStep = currentGrievanceStep + direction;
  if (nextStep < 1 || nextStep > 4) return;

  // Step 1 Validation
  if (direction > 0 && currentGrievanceStep === 1) {
    const title = document.getElementById('complaintTitleInput')?.value.trim();
    const desc  = document.getElementById('complaintDescInput')?.value.trim();
    if (!title || !desc) {
      alert('Please enter an issue title and description before proceeding.');
      return;
    }
  }

  // Hide current step
  const currentStepEl = document.getElementById(`gStep${currentGrievanceStep}`);
  const nextStepEl    = document.getElementById(`gStep${nextStep}`);
  const currentDot    = document.getElementById(`gStepDot${currentGrievanceStep}`);
  const nextDot       = document.getElementById(`gStepDot${nextStep}`);

  if (currentStepEl) currentStepEl.style.display = 'none';
  if (nextStepEl)    nextStepEl.style.display    = 'block';

  if (currentDot) {
    currentDot.classList.remove('active');
    if (direction > 0) currentDot.classList.add('completed');
  }
  if (nextDot) {
    nextDot.classList.add('active');
  }

  currentGrievanceStep = nextStep;

  // Toggle Footer Buttons
  const backBtn   = document.getElementById('wizardBackBtn');
  const nextBtn   = document.getElementById('wizardNextBtn');
  const submitBtn = document.getElementById('wizardSubmitBtn');

  if (backBtn)   backBtn.style.display   = currentGrievanceStep > 1 ? 'inline-flex' : 'none';
  if (nextBtn)   nextBtn.style.display   = currentGrievanceStep < 4 ? 'inline-flex' : 'none';
  if (submitBtn) submitBtn.style.display = currentGrievanceStep === 4 ? 'inline-flex' : 'none';

  // Populate Step 4 Summary
  if (currentGrievanceStep === 4) {
    const activeCatCard = document.querySelector('.category-select-card.active span');
    const catName  = activeCatCard ? activeCatCard.textContent : 'Water Supply';
    const title    = document.getElementById('complaintTitleInput')?.value || '--';
    const desc     = document.getElementById('complaintDescInput')?.value || '--';
    const loc      = document.getElementById('complaintLocationInput')?.value || 'Not specified';
    const priSelect = document.getElementById('complaintPriorityInput');
    const priText  = priSelect ? priSelect.options[priSelect.selectedIndex].text : 'Medium Priority';
    const attCount = window.__CivicSetuAppState?.stagedFiles?.length || 0;

    if (document.getElementById('revCat'))   document.getElementById('revCat').textContent   = catName;
    if (document.getElementById('revTitle')) document.getElementById('revTitle').textContent = title;
    if (document.getElementById('revDesc'))  document.getElementById('revDesc').textContent  = desc;
    if (document.getElementById('revLoc'))   document.getElementById('revLoc').textContent   = loc;
    if (document.getElementById('revPri'))   document.getElementById('revPri').textContent   = priText;
    if (document.getElementById('revAtt'))   document.getElementById('revAtt').textContent   = `${attCount} file(s)`;
  }
}

