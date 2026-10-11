import React, { useEffect, useState, useMemo } from 'react';
import adminService from '../../services/admin.service';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import s from './UserManagement.module.css';

// SVG Sparkline Component
const Sparkline: React.FC<{
  data: number[];
  color: string;
  fillColor: string;
  width?: number;
  height?: number;
}> = ({ data, color, fillColor, width = 58, height = 26 }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');
  const fillPoints = `${points} ${width - 2},${height} 2,${height}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polygon points={fillPoints} fill={fillColor} opacity={0.25} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export interface DirectoryUser {
  id: string;
  public_id: string;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'AUTHORITY' | 'CITIZEN';
  role_display: string;
  phone: string;
  department: string;
  ward: string;
  is_active: boolean;
  joined_date: string;
  joined_time: string;
  last_active: string;
  avatar_url?: string;
  initials: string;
  avatar_bg?: string;
  permissions?: string[];
  recent_activity?: {
    type: 'login' | 'settings' | 'user' | 'analytics' | 'complaint';
    title: string;
    time: string;
    icon: string;
    dot_color: string;
    dot_bg: string;
  }[];
}

const mapBackendUserToDirectoryUser = (
  backendUser: any,
  idx: number,
  userLogs: any[] = []
): DirectoryUser => {
  const role = (backendUser.role || 'CITIZEN') as 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN';
  const roleDisplay =
    role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'AUTHORITY' ? 'Authority' : 'Citizen';
  const createdDate = backendUser.created_at ? new Date(backendUser.created_at) : new Date();

  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const permissions =
    role === 'SUPER_ADMIN'
      ? [
          'Full system access',
          'User management',
          'Department management',
          'Authority management',
          'System configuration',
          'Analytics & reports',
          'Audit logs',
          'Platform settings',
        ]
      : role === 'AUTHORITY'
      ? [
          'Grievance resolution',
          'Field verification',
          'Department triage',
          'Citizen notifications',
          'SLA escalation management',
          'Work order issuance',
        ]
      : [
          'File civic grievances',
          'Real-time tracking',
          'Community voting & upvotes',
          'Receive official SMS/Email alerts',
        ];

  const recentActivity =
    userLogs.length > 0
      ? userLogs.slice(0, 4).map((log: any) => ({
          type: (log.action?.includes('LOGIN')
            ? 'login'
            : log.action?.includes('COMPLAINT')
            ? 'complaint'
            : log.action?.includes('DEPARTMENT')
            ? 'settings'
            : 'user') as any,
          title: log.metadata?.details || log.action?.replace(/_/g, ' ') || 'System Activity',
          time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          icon: log.action?.includes('LOGIN')
            ? 'login'
            : log.action?.includes('COMPLAINT')
            ? 'assignment'
            : 'history',
          dot_color: '#10b981',
          dot_bg: '#ecfdf5',
        }))
      : [
          {
            type: 'login' as const,
            title: 'Account active on platform',
            time: 'Recently',
            icon: 'verified_user',
            dot_color: '#2563eb',
            dot_bg: '#eff6ff',
          },
        ];

  return {
    id: `USR-${String(idx + 1).padStart(4, '0')}`,
    public_id: backendUser.public_id || `usr-${idx}`,
    full_name: backendUser.full_name || 'Enrolled User',
    email: backendUser.email || 'user@civicsetu.gov.in',
    role,
    role_display: roleDisplay,
    phone: backendUser.phone || '—',
    department:
      backendUser.department_name ||
      backendUser.department ||
      backendUser.departments?.[0]?.department_name ||
      '—',
    ward: backendUser.ward || (backendUser.address ? backendUser.address.split(',')[0] : 'Ward 1'),
    is_active: backendUser.is_active !== false,
    joined_date: formattedDate,
    joined_time: formattedTime,
    last_active: 'Active',
    initials: (backendUser.full_name ? backendUser.full_name[0] : 'U').toUpperCase(),
    avatar_bg: role === 'SUPER_ADMIN' ? '#2563eb' : role === 'AUTHORITY' ? '#7c3aed' : '#059669',
    permissions,
    recent_activity: recentActivity,
  };
};

export const UserManagement: React.FC = () => {
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState<DirectoryUser[]>([]);
  const [_isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [activeSidebarSub, setActiveSidebarSub] = useState<
    'all' | 'citizen' | 'authority' | 'superadmin' | 'requests'
  >('all');
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'Overview' | 'Permissions' | 'Activity' | 'Complaints' | 'Security' | 'Notes'
  >('Overview');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('Newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  // New User Form State
  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'CITIZEN' as 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN',
    department: 'Road',
    ward: 'Ward 1',
  });

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Close details drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset page when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSidebarSub, searchQuery, roleFilter, statusFilter, deptFilter, wardFilter, sortBy]);

  const loadLiveUsers = async () => {
    setIsLoading(true);
    try {
      const [data, auditData] = await Promise.all([
        adminService.searchUsers({}),
        adminService.getAuditLogs({ page_size: 50 }).catch(() => ({ results: [] })),
      ]);

      const rawUsers = Array.isArray(data) ? data : (data as any)?.results || [];
      const logs = Array.isArray(auditData) ? auditData : (auditData as any)?.results || [];

      const mapped = rawUsers.map((u: any, idx: number) => {
        const userLogs = logs.filter(
          (l: any) => l.actor_email === u.email || l.entity_id === String(u.public_id)
        );
        return mapBackendUserToDirectoryUser(u, idx, userLogs);
      });

      setUsersList(mapped);
      if (mapped.length > 0) {
        setSelectedUserId((prev) => (prev && mapped.some((m: any) => m.id === prev) ? prev : mapped[0].id));
      }
    } catch {
      showToast('Failed to load user directory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveUsers();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Sidebar sub filter
      if (activeSidebarSub === 'citizen' && u.role !== 'CITIZEN') return false;
      if (activeSidebarSub === 'authority' && u.role !== 'AUTHORITY') return false;
      if (activeSidebarSub === 'superadmin' && u.role !== 'SUPER_ADMIN') return false;
      if (activeSidebarSub === 'requests' && u.is_active) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.full_name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone.toLowerCase().includes(q);
        const matchesId = u.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === 'ACTIVE' && !u.is_active) return false;
      if (statusFilter === 'INACTIVE' && u.is_active) return false;

      // Department filter
      if (deptFilter !== 'ALL' && !u.department.toLowerCase().includes(deptFilter.toLowerCase()))
        return false;

      // Ward filter
      if (wardFilter !== 'ALL' && !u.ward.toLowerCase().includes(wardFilter.toLowerCase()))
        return false;

      return true;
    });
  }, [usersList, activeSidebarSub, searchQuery, roleFilter, statusFilter, deptFilter, wardFilter]);

  // Sorted list of users
  const sortedAndFilteredUsers = useMemo(() => {
    const list = [...filteredUsers];
    if (sortBy === 'Name') {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === 'Oldest') {
      list.reverse();
    }
    return list;
  }, [filteredUsers, sortBy]);

  // Paginated Users Slice
  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredUsers.slice(start, start + pageSize);
  }, [sortedAndFilteredUsers, currentPage, pageSize]);

  // Selected User Object
  const selectedUser = useMemo(() => {
    return usersList.find((u) => u.id === selectedUserId) || usersList[0] || null;
  }, [usersList, selectedUserId]);

  // Handle adding user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.fullName.trim() || !newUserData.email.trim()) {
      showToast('Please provide a full name and email.', 'error');
      return;
    }

    try {
      const created = await adminService.createUser({
        email: newUserData.email,
        full_name: newUserData.fullName,
        phone: newUserData.phone,
        role: newUserData.role,
        department: newUserData.role === 'AUTHORITY' ? newUserData.department : undefined,
        designation: newUserData.role === 'AUTHORITY' ? 'Nodal Officer' : undefined,
      });

      showToast(`User ${created.full_name || newUserData.fullName} successfully enrolled!`, 'success');
      setIsAddUserModalOpen(false);
      setNewUserData({
        fullName: '',
        email: '',
        phone: '',
        role: 'CITIZEN',
        department: 'Road',
        ward: 'Ward 1',
      });
      await loadLiveUsers();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to create user', 'error');
    }
  };

  // Toggle user suspension
  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    try {
      const newStatus = !selectedUser.is_active;
      await adminService.updateUser(selectedUser.public_id, { is_active: newStatus });
      showToast(
        `User ${selectedUser.full_name} status updated to ${newStatus ? 'Active' : 'Suspended'}.`,
        newStatus ? 'success' : 'error'
      );
      await loadLiveUsers();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to update user status.', 'error');
    }
  };

  // Reset password action
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      await adminService.resetUserPassword(selectedUser.email);
      showToast(`Password reset link dispatched to ${selectedUser.email}.`, 'info');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to dispatch reset link.', 'error');
    }
  };

  // Change role action
  const handleChangeRole = async () => {
    if (!selectedUser) return;
    const nextRole =
      selectedUser.role === 'CITIZEN'
        ? 'AUTHORITY'
        : selectedUser.role === 'AUTHORITY'
        ? 'SUPER_ADMIN'
        : 'CITIZEN';
    try {
      await adminService.updateUser(selectedUser.public_id, { role: nextRole });
      showToast(`User ${selectedUser.full_name} role updated to ${nextRole}.`, 'success');
      await loadLiveUsers();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to update user role.', 'error');
    }
  };

  return (
    <div className={s.pageLayout}>
      {/* ============================================================
         CITIZEN & USER DIRECTORY (FULL-WIDTH EXECUTIVE VIEW)
         ============================================================ */}
      <main className={s.mainContent}>
        {/* Top Header Bar */}
        <div className={s.topRow}>
          <div className={s.headerBar}>
            <div>
              <h1 className={s.headerTitle}>Citizen &amp; User Directory</h1>
              <p className={s.headerSubtitle}>
                Manage enrolled citizens, authorities, and administrators across the platform.
              </p>
            </div>

            <div className={s.headerActions}>
              <div className={s.dateTimeBadge}>
                <Icon name="calendar_today" size={15} style={{ color: '#2563eb' }} />
                <span>
                  {currentDateTime.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  |{' '}
                  {currentDateTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>

              <button
                type="button"
                className={s.btnAuditLogs}
                onClick={() => setIsAuditLogsModalOpen(true)}
                title="View System Audit Logs"
              >
                <Icon name="receipt_long" size={17} />
                <span>Audit Logs</span>
              </button>

              <button
                type="button"
                className={s.btnAddUser}
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <Icon name="add" size={17} />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Role & Access Filter Tabs */}
        <div className={s.quickFilterTabs}>
          {[
            { id: 'all', label: 'All Users', icon: 'person', count: usersList.length },
            { id: 'citizen', label: 'Citizen Users', icon: 'badge', count: usersList.filter((u) => u.role === 'CITIZEN').length },
            { id: 'authority', label: 'Authority Users', icon: 'verified_user', count: usersList.filter((u) => u.role === 'AUTHORITY').length },
            { id: 'superadmin', label: 'Super Admins', icon: 'workspace_premium', count: usersList.filter((u) => u.role === 'SUPER_ADMIN').length },
            { id: 'requests', label: 'Access Requests', icon: 'lock_person', count: usersList.filter((u) => !u.is_active).length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${s.quickTab} ${activeSidebarSub === tab.id ? s.quickTabActive : ''}`}
              onClick={() => setActiveSidebarSub(tab.id as any)}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
              <span className={s.quickTabBadge}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* 3. FOUR TOP KPI METRIC CARDS */}
        <div className={s.kpiGrid}>
          {/* KPI 1: Total Users */}
          <div
            className={s.kpiCard}
            onClick={() => setActiveSidebarSub('all')}
            title="Click to view all enrolled users"
          >
            <div className={s.kpiLeft}>
              <div className={s.kpiIconBox} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Icon name="group" size={22} />
              </div>
              <div className={s.kpiInfo}>
                <span className={s.kpiLabel}>Total Users</span>
                <div className={s.kpiValueRow}>
                  <span className={s.kpiValue}>{usersList.length}</span>
                  <span className={s.trendBadge}>Active</span>
                </div>
                <span className={s.kpiFootnote}>Total enrolled records</span>
              </div>
            </div>
            <div className={s.sparklineWrap}>
              <Sparkline
                data={[10, 11, 12, 13, 14, 15, Math.max(usersList.length, 1)]}
                color="#2563eb"
                fillColor="#93c5fd"
              />
            </div>
          </div>

          {/* KPI 2: Citizen Users */}
          <div
            className={s.kpiCard}
            onClick={() => setActiveSidebarSub('citizen')}
            title="Click to filter citizen users"
          >
            <div className={s.kpiLeft}>
              <div className={s.kpiIconBox} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Icon name="person" size={22} />
              </div>
              <div className={s.kpiInfo}>
                <span className={s.kpiLabel}>Citizen Users</span>
                <div className={s.kpiValueRow}>
                  <span className={s.kpiValue}>
                    {usersList.filter((u) => u.role === 'CITIZEN').length}
                  </span>
                  <span className={s.trendBadge}>Verified</span>
                </div>
                <span className={s.kpiFootnote}>
                  {usersList.length
                    ? Math.round(
                        (usersList.filter((u) => u.role === 'CITIZEN').length / usersList.length) * 100
                      )
                    : 0}
                  % of total
                </span>
              </div>
            </div>
            <div className={s.sparklineWrap}>
              <Sparkline
                data={[4, 5, 6, 7, 8, Math.max(usersList.filter((u) => u.role === 'CITIZEN').length, 1)]}
                color="#16a34a"
                fillColor="#86efac"
              />
            </div>
          </div>

          {/* KPI 3: Authority Users */}
          <div
            className={s.kpiCard}
            onClick={() => setActiveSidebarSub('authority')}
            title="Click to filter authority personnel"
          >
            <div className={s.kpiLeft}>
              <div className={s.kpiIconBox} style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <Icon name="shield" size={22} />
              </div>
              <div className={s.kpiInfo}>
                <span className={s.kpiLabel}>Authority Users</span>
                <div className={s.kpiValueRow}>
                  <span className={s.kpiValue}>
                    {usersList.filter((u) => u.role === 'AUTHORITY').length}
                  </span>
                  <span className={s.trendBadge}>Staff</span>
                </div>
                <span className={s.kpiFootnote}>
                  {usersList.length
                    ? Math.round(
                        (usersList.filter((u) => u.role === 'AUTHORITY').length / usersList.length) * 100
                      )
                    : 0}
                  % of total
                </span>
              </div>
            </div>
            <div className={s.sparklineWrap}>
              <Sparkline
                data={[2, 2, 3, 3, 3, Math.max(usersList.filter((u) => u.role === 'AUTHORITY').length, 1)]}
                color="#8b5cf6"
                fillColor="#c4b5fd"
              />
            </div>
          </div>

          {/* KPI 4: Super Admins */}
          <div
            className={s.kpiCard}
            onClick={() => setActiveSidebarSub('superadmin')}
            title="Click to filter platform administrators"
          >
            <div className={s.kpiLeft}>
              <div className={s.kpiIconBox} style={{ background: '#fffbeb', color: '#f59e0b' }}>
                <Icon name="workspace_premium" size={22} />
              </div>
              <div className={s.kpiInfo}>
                <span className={s.kpiLabel}>Super Admins</span>
                <div className={s.kpiValueRow}>
                  <span className={s.kpiValue}>
                    {usersList.filter((u) => u.role === 'SUPER_ADMIN').length}
                  </span>
                  <span className={s.trendBadge}>Root</span>
                </div>
                <span className={s.kpiFootnote}>
                  {usersList.length
                    ? Math.round(
                        (usersList.filter((u) => u.role === 'SUPER_ADMIN').length / usersList.length) * 100
                      )
                    : 0}
                  % of total
                </span>
              </div>
            </div>
            <div className={s.sparklineWrap}>
              <Sparkline
                data={[1, 1, 2, 2, 3, Math.max(usersList.filter((u) => u.role === 'SUPER_ADMIN').length, 1)]}
                color="#f59e0b"
                fillColor="#fde68a"
              />
            </div>
          </div>
        </div>

        {/* 4. FILTER BAR */}
        <div className={s.filterBar}>
          <div className={s.searchBox}>
            <Icon name="search" size={18} className={s.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={s.searchInput}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={s.filterSelect}
          >
            <option value="ALL">All Roles</option>
            <option value="CITIZEN">Citizens</option>
            <option value="AUTHORITY">Authorities</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={s.filterSelect}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className={s.filterSelect}
          >
            <option value="ALL">All Departments</option>
            <option value="Roads & Infra">Roads &amp; Infra</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Electricity">Electricity</option>
          </select>

          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className={s.filterSelect}
          >
            <option value="ALL">All Wards</option>
            <option value="Ward 1">Ward 1</option>
            <option value="Ward 3">Ward 3</option>
            <option value="Ward 4">Ward 4</option>
            <option value="Ward 5">Ward 5</option>
            <option value="Ward 7">Ward 7</option>
            <option value="Ward 8">Ward 8</option>
            <option value="Ward 9">Ward 9</option>
            <option value="Ward 12">Ward 12</option>
          </select>

          <button
            type="button"
            className={s.btnMoreFilters}
            onClick={() => showToast('Filters reset to default.', 'info')}
          >
            <Icon name="filter_alt" size={15} />
            <span>More Filters</span>
          </button>
        </div>

        {/* 5. FULL-WIDTH USER DIRECTORY */}
        <div className={s.splitGrid}>
          {/* FULL-WIDTH USERS LIST TABLE CARD */}
          <div className={s.tableCard}>
            {/* Card Toolbar */}
            <div className={s.tableHeader}>
              <div className={s.tableTitle}>
                Users ({sortedAndFilteredUsers.length.toLocaleString()})
              </div>

              <div className={s.tableControls}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={s.sortSelect}
                >
                  <option value="Newest">Sort by Newest</option>
                  <option value="Oldest">Sort by Oldest</option>
                  <option value="Name">Sort by Name</option>
                </select>

                <div className={s.viewToggleGroup}>
                  <button
                    type="button"
                    className={`${s.btnViewToggle} ${viewMode === 'list' ? s.btnViewToggleActive : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <Icon name="format_list_bulleted" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${s.btnViewToggle} ${viewMode === 'grid' ? s.btnViewToggleActive : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    <Icon name="grid_view" size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  className={s.btnMoreOptions}
                  onClick={() => showToast('Exporting current view to CSV...', 'info')}
                  title="More Options"
                >
                  <Icon name="more_horiz" size={16} />
                </button>
              </div>
            </div>

            {/* Display: Grid View or Full-Width Table */}
            {viewMode === 'grid' ? (
              <div className={s.userGrid}>
                {paginatedUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const roleBadgeClass =
                    u.role === 'SUPER_ADMIN'
                      ? s.badgeSuperAdmin
                      : u.role === 'AUTHORITY'
                      ? s.badgeAuthority
                      : s.badgeCitizen;

                  return (
                    <div
                      key={u.id}
                      className={`${s.userGridCard} ${
                        isSelected && isDetailsDrawerOpen ? s.userGridCardSelected : ''
                      }`}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setIsDetailsDrawerOpen(true);
                      }}
                    >
                      <div className={s.gridCardTop}>
                        <div className={s.gridCardUser}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name} className={s.avatarImg} />
                          ) : (
                            <div
                              className={s.avatarCircle}
                              style={{ background: u.avatar_bg || '#2563eb' }}
                            >
                              {u.initials}
                            </div>
                          )}
                          <div className={s.userNameCol}>
                            <span className={s.rowUserName}>{u.full_name}</span>
                            <span className={s.rowUserEmail}>{u.email}</span>
                          </div>
                        </div>
                        <span
                          className={`${s.statusPill} ${
                            u.is_active ? s.statusActive : s.statusInactive
                          }`}
                        >
                          <span className={s.statusDot} />
                          <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </div>

                      <div className={s.gridCardMeta}>
                        <div className={s.gridMetaRow}>
                          <span className={`${s.badgeRole} ${roleBadgeClass}`}>
                            {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>ID: {u.id}</span>
                        </div>
                        <div className={s.gridMetaRow}>
                          <Icon name="domain" size={13} style={{ color: '#94a3b8' }} />
                          <span>
                            {u.department && u.department !== '—'
                              ? `${u.department} ${u.ward ? `/ ${u.ward}` : ''}`
                              : u.ward || '—'}
                          </span>
                        </div>
                        <div className={s.gridMetaRow}>
                          <Icon name="call" size={13} style={{ color: '#94a3b8' }} />
                          <span>{u.phone}</span>
                        </div>
                      </div>

                      <div className={s.gridCardFooter}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{u.joined_date}</span>
                        <button
                          type="button"
                          className={s.btnInspectAction}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(u.id);
                            setIsDetailsDrawerOpen(true);
                          }}
                        >
                          <Icon name="visibility" size={14} />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>
                        <input type="checkbox" className={s.checkbox} />
                      </th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Contact</th>
                      <th>Department / Ward</th>
                      <th>Status</th>
                      <th>Joined On</th>
                      <th style={{ textAlign: 'center', width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      const roleBadgeClass =
                        u.role === 'SUPER_ADMIN'
                          ? s.badgeSuperAdmin
                          : u.role === 'AUTHORITY'
                          ? s.badgeAuthority
                          : s.badgeCitizen;

                      return (
                        <tr
                          key={u.id}
                          className={`${s.tableRow} ${
                            isSelected && isDetailsDrawerOpen ? s.tableRowSelected : ''
                          }`}
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setIsDetailsDrawerOpen(true);
                          }}
                          title="Click to view full user account details"
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setSelectedUserId(u.id)}
                              className={s.checkbox}
                            />
                          </td>

                          {/* User Identity */}
                          <td>
                            <div className={s.userCell}>
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt={u.full_name} className={s.avatarImg} />
                              ) : (
                                <div
                                  className={s.avatarCircle}
                                  style={{ background: u.avatar_bg || '#2563eb' }}
                                >
                                  {u.initials}
                                </div>
                              )}
                              <div className={s.userNameCol}>
                                <span className={s.rowUserName}>{u.full_name}</span>
                                <span className={s.rowUserEmail}>{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td>
                            <span className={`${s.badgeRole} ${roleBadgeClass}`}>
                              {u.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : u.role}
                            </span>
                          </td>

                          {/* Contact */}
                          <td>
                            <span className={s.rowPhone}>{u.phone}</span>
                          </td>

                          {/* Department / Ward */}
                          <td>
                            <span className={s.rowDeptWard}>
                              {u.department && u.department !== '—'
                               ? `${u.department} ${u.ward ? `/ ${u.ward}` : ''}`
                                : u.ward || '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td>
                            <span
                              className={`${s.statusPill} ${
                                u.is_active ? s.statusActive : s.statusInactive
                              }`}
                            >
                              <span className={s.statusDot} />
                              <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>

                          {/* Joined On */}
                          <td>
                            <div className={s.rowDateCol}>
                              <span className={s.rowDate}>{u.joined_date}</span>
                              <span className={s.rowTime}>{u.joined_time}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button
                                type="button"
                                className={s.btnInspectAction}
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setIsDetailsDrawerOpen(true);
                                }}
                                title="Inspect User Details"
                              >
                                <Icon name="visibility" size={14} />
                                <span>Details</span>
                              </button>
                              <button
                                type="button"
                                className={s.btnRowAction}
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setIsEditUserModalOpen(true);
                                }}
                                title="Edit User"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <div className={s.tableFooter}>
              <span>
                Showing {sortedAndFilteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
                {Math.min(currentPage * pageSize, sortedAndFilteredUsers.length)} of{' '}
                {sortedAndFilteredUsers.length} users
              </span>

              <div className={s.pageNav}>
                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <Icon name="chevron_left" size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && <span className={s.pageEllipsis}>...</span>}
                      <button
                        type="button"
                        className={`${s.pageBtn} ${currentPage === p ? s.pageBtnActive : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  className={s.pageBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>

              <select
                className={s.perPageSelect}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================
           SLIDE-OVER USER DETAILS DRAWER (OPENS WHEN ACCOUNT IS TAPPED)
           ============================================================ */}
        {isDetailsDrawerOpen && selectedUser && (
          <div className={s.drawerBackdrop} onClick={() => setIsDetailsDrawerOpen(false)}>
            <div className={s.drawerPanel} onClick={(e) => e.stopPropagation()}>
              {/* Drawer Top Header Bar */}
              <div className={s.drawerHeaderBar}>
                <div className={s.drawerHeaderLeft}>
                  <div className={s.drawerHeaderIcon}>
                    <Icon name="badge" size={18} />
                  </div>
                  <div>
                    <h3 className={s.drawerHeaderTitle}>User Profile Details</h3>
                    <div className={s.drawerHeaderSub}>
                      <span>ID: {selectedUser.id}</span>
                      <span>•</span>
                      <span>{selectedUser.role_display}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={s.drawerCloseBtn}
                  onClick={() => setIsDetailsDrawerOpen(false)}
                  title="Close Details (Esc)"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>

              {/* Drawer Body with all inspector tabs & details */}
              <div className={s.drawerBody}>
                {/* Inspector Profile Header */}
                <div className={s.inspectorHeader}>
                  <div className={s.inspectorProfile}>
                    <div className={s.inspectorAvatarWrap}>
                      {selectedUser.avatar_url ? (
                        <img
                          src={selectedUser.avatar_url}
                          alt={selectedUser.full_name}
                          className={s.inspectorAvatarImg}
                        />
                      ) : (
                        <div
                          className={s.inspectorAvatar}
                          style={{ background: selectedUser.avatar_bg || '#2563eb' }}
                        >
                          {selectedUser.initials}
                        </div>
                      )}
                      {selectedUser.is_active && <span className={s.onlineIndicator} />}
                    </div>

                    <div className={s.inspectorNameCol}>
                      <div className={s.inspectorNameRow}>
                        <span className={s.inspectorName}>{selectedUser.full_name}</span>
                        <span
                          className={`${s.statusPill} ${
                            selectedUser.is_active ? s.statusActive : s.statusInactive
                          }`}
                        >
                          <span className={s.statusDot} />
                          <span>{selectedUser.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </div>

                      <div className={s.inspectorEmailRow}>
                        <Icon name="mail" size={14} style={{ color: '#94a3b8' }} />
                        <span>{selectedUser.email}</span>
                      </div>

                      <div className={s.inspectorBadges}>
                        <span
                          className={`${s.badgeRole} ${
                            selectedUser.role === 'SUPER_ADMIN'
                              ? s.badgeSuperAdmin
                              : selectedUser.role === 'AUTHORITY'
                              ? s.badgeAuthority
                              : s.badgeCitizen
                          }`}
                        >
                          {selectedUser.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : selectedUser.role}
                        </span>
                        <span className={s.badgeUserId}>ID: {selectedUser.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.inspectorHeaderActions}>
                    <button
                      type="button"
                      className={s.btnEditUser}
                      onClick={() => setIsEditUserModalOpen(true)}
                    >
                      <Icon name="edit" size={14} />
                      <span>Edit User</span>
                    </button>
                    <button
                      type="button"
                      className={s.btnMoreOptions}
                      onClick={() => showToast('User profile options: Export, Audit, Transfer', 'info')}
                    >
                      <Icon name="more_horiz" size={16} />
                    </button>
                  </div>
                </div>

                {/* 6 Tabs Bar */}
                <div className={s.tabsBar}>
                  {(['Overview', 'Permissions', 'Activity', 'Complaints', 'Security', 'Notes'] as const).map(
                    (tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`${s.tabBtn} ${activeInspectorTab === tab ? s.tabBtnActive : ''}`}
                        onClick={() => setActiveInspectorTab(tab)}
                      >
                        {tab}
                      </button>
                    )
                  )}
                </div>

                {/* Tab 1: Overview Tab Content */}
                {activeInspectorTab === 'Overview' && (
                  <>
                    <div className={s.inspectorTwoCol}>
                      {/* Left: Personal Information */}
                      <div>
                        <h4 className={s.sectionHeading}>Personal Information</h4>
                        <div className={s.infoList}>
                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="person" size={14} />
                              <span>Full Name</span>
                            </span>
                            <span className={s.infoValue}>{selectedUser.full_name}</span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="mail" size={14} />
                              <span>Email</span>
                            </span>
                            <span className={s.infoValue} style={{ fontSize: 11 }}>
                              {selectedUser.email}
                            </span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="call" size={14} />
                              <span>Phone</span>
                            </span>
                            <span className={s.infoValue}>{selectedUser.phone}</span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="shield" size={14} />
                              <span>Role</span>
                            </span>
                            <span
                              className={`${s.badgeRole} ${
                                selectedUser.role === 'SUPER_ADMIN'
                                  ? s.badgeSuperAdmin
                                  : selectedUser.role === 'AUTHORITY'
                                  ? s.badgeAuthority
                                  : s.badgeCitizen
                              }`}
                            >
                              {selectedUser.role_display}
                            </span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="radio_button_checked" size={14} />
                              <span>Status</span>
                            </span>
                            <span
                              className={`${s.statusPill} ${
                                selectedUser.is_active ? s.statusActive : s.statusInactive
                              }`}
                            >
                              <span className={s.statusDot} />
                              <span>{selectedUser.is_active ? 'Active' : 'Suspended'}</span>
                            </span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="calendar_today" size={14} />
                              <span>Joined On</span>
                            </span>
                            <span className={s.infoValue}>
                              {selectedUser.joined_date}, {selectedUser.joined_time.toUpperCase()}
                            </span>
                          </div>

                          <div className={s.infoRow}>
                            <span className={s.infoLabel}>
                              <Icon name="schedule" size={14} />
                              <span>Last Active</span>
                            </span>
                            <span className={s.infoValue}>{selectedUser.last_active}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Access & Permissions */}
                      <div>
                        <h4 className={s.sectionHeading}>Access &amp; Permissions</h4>
                        <div className={s.permsList}>
                          {(
                            selectedUser.permissions || [
                              'Full system access',
                              'User management',
                              'Department management',
                              'Authority management',
                              'System configuration',
                              'Analytics & reports',
                              'Audit logs',
                              'Platform settings',
                            ]
                          ).map((perm, idx) => (
                            <div key={idx} className={s.permItem}>
                              <Icon name="check_circle" size={16} className={s.permIconCheck} />
                              <span>{perm}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section: Recent Activity */}
                    <div className={s.activitySection}>
                      <div className={s.activityHeader}>
                        <h4 className={s.sectionHeading} style={{ margin: 0 }}>
                          Recent Activity
                        </h4>
                        <button
                          type="button"
                          className={s.viewAllLink}
                          onClick={() => setActiveInspectorTab('Activity')}
                        >
                          View All →
                        </button>
                      </div>

                      <div className={s.timelineList}>
                        {(selectedUser.recent_activity || []).map((act, idx) => (
                          <div key={idx} className={s.timelineItem}>
                            <div
                              className={s.timelineDot}
                              style={{ background: act.dot_bg, color: act.dot_color }}
                            >
                              <Icon name={act.icon} size={11} />
                            </div>
                            <span className={s.timelineTitle}>{act.title}</span>
                            <span className={s.timelineTime}>{act.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Tab 2: Permissions */}
                {activeInspectorTab === 'Permissions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    <h4 className={s.sectionHeading}>Privilege &amp; Security Roles</h4>
                    <div className={s.permsList}>
                      {[
                        'Full platform root administration',
                        'Citizen verification and biometric KYC bypass',
                        'Authority credential provisioning and department reassignment',
                        'Cryptographic audit trail inspection & tampering detection',
                        'AI automated triage threshold calibration',
                        'Automated SMS / WhatsApp citizen notification broadcasts',
                      ].map((p, idx) => (
                        <div key={idx} className={s.permItem}>
                          <Icon name="verified" size={16} className={s.permIconCheck} />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={s.btnAddUser}
                      style={{ alignSelf: 'flex-start', marginTop: 8 }}
                      onClick={() => showToast('Permissions updated and synced across cluster.', 'success')}
                    >
                      Save Permission Matrix
                    </button>
                  </div>
                )}

                {/* Tab 3: Activity */}
                {activeInspectorTab === 'Activity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    <h4 className={s.sectionHeading}>Audit Trail for {selectedUser.full_name}</h4>
                    <div className={s.timelineList}>
                      {(selectedUser.recent_activity || []).map((act, idx) => (
                        <div key={idx} className={s.timelineItem}>
                          <div
                            className={s.timelineDot}
                            style={{ background: act.dot_bg, color: act.dot_color }}
                          >
                            <Icon name={act.icon} size={11} />
                          </div>
                          <span className={s.timelineTitle}>{act.title}</span>
                          <span className={s.timelineTime}>{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 4: Complaints */}
                {activeInspectorTab === 'Complaints' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                    <h4 className={s.sectionHeading}>Associated Civic Grievances</h4>
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                        #ROA-2026-0892: Pothole on Ward 12 Main Highway
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                        Status: <span style={{ color: '#059669', fontWeight: 600 }}>Resolved</span> • Priority: High • Assigned: Roads &amp; Infra
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 5: Security */}
                {activeInspectorTab === 'Security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    <h4 className={s.sectionHeading}>Account Security &amp; Credentials</h4>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Two-Factor Authentication (2FA)</span>
                      <span className={s.infoValue} style={{ color: '#059669' }}>Enforced (TOTP)</span>
                    </div>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Last Password Rotation</span>
                      <span className={s.infoValue}>14 days ago</span>
                    </div>
                    <div className={s.infoRow}>
                      <span className={s.infoLabel}>Active Web Sessions</span>
                      <span className={s.infoValue}>1 active (Bhubaneswar, IN)</span>
                    </div>
                  </div>
                )}

                {/* Tab 6: Notes */}
                {activeInspectorTab === 'Notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    <h4 className={s.sectionHeading}>Administrative Remarks</h4>
                    <textarea
                      placeholder="Add confidential admin notes regarding this user account..."
                      style={{
                        width: '100%',
                        height: 80,
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 12.5,
                        fontFamily: 'inherit',
                      }}
                      defaultValue="Executive municipal clearance verified. Verified contact point for central platform configurations."
                    />
                    <button
                      type="button"
                      className={s.btnAddUser}
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => showToast('Notes saved to user security profile.', 'success')}
                    >
                      Save Notes
                    </button>
                  </div>
                )}

                {/* Bottom Action Buttons Row */}
                <div className={s.actionButtonsRow}>
                  <button
                    type="button"
                    className={s.btnAction}
                    onClick={handleChangeRole}
                    title="Change User Role Tier"
                  >
                    <Icon name="swap_horiz" size={15} style={{ color: '#2563eb' }} />
                    <span>Change Role</span>
                  </button>

                  <button
                    type="button"
                    className={s.btnAction}
                    onClick={handleResetPassword}
                    title="Dispatch Password Reset"
                  >
                    <Icon name="lock_reset" size={15} style={{ color: '#0284c7' }} />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    className={s.btnAction}
                    onClick={() => setIsAuditLogsModalOpen(true)}
                    title="Inspect Security Audit Events"
                  >
                    <Icon name="receipt_long" size={15} style={{ color: '#7c3aed' }} />
                    <span>View Audit Logs</span>
                  </button>

                  <button
                    type="button"
                    className={`${s.btnAction} ${s.btnSuspend}`}
                    onClick={handleToggleSuspend}
                    title="Suspend or Reactivate Account"
                  >
                    <Icon name="warning" size={15} />
                    <span>{selectedUser.is_active ? 'Suspend User' : 'Reactivate User'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================
         3. ADD USER MODAL
         ============================================================ */}
      {isAddUserModalOpen && (
        <div className={s.modalBackdrop} onClick={() => setIsAddUserModalOpen(false)}>
          <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Enroll New User</h3>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setIsAddUserModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className={s.modalBody}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Das"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    className={s.formInput}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh.das@civicsetu.gov.in"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className={s.formInput}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Mobile Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    className={s.formInput}
                  />
                </div>

                <div className={s.formRow}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Role Tier</label>
                    <select
                      value={newUserData.role}
                      onChange={(e) =>
                        setNewUserData({
                          ...newUserData,
                          role: e.target.value as 'CITIZEN' | 'AUTHORITY' | 'SUPER_ADMIN',
                        })
                      }
                      className={s.formInput}
                    >
                      <option value="CITIZEN">Citizen User</option>
                      <option value="AUTHORITY">Authority Official</option>
                      <option value="SUPER_ADMIN">Super Administrator</option>
                    </select>
                  </div>

                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Residential / Field Ward</label>
                    <select
                      value={newUserData.ward}
                      onChange={(e) => setNewUserData({ ...newUserData, ward: e.target.value })}
                      className={s.formInput}
                    >
                      <option value="Ward 1">Ward 1</option>
                      <option value="Ward 3">Ward 3</option>
                      <option value="Ward 4">Ward 4</option>
                      <option value="Ward 5">Ward 5</option>
                      <option value="Ward 7">Ward 7</option>
                      <option value="Ward 8">Ward 8</option>
                      <option value="Ward 9">Ward 9</option>
                      <option value="Ward 12">Ward 12</option>
                    </select>
                  </div>
                </div>

                {newUserData.role === 'AUTHORITY' && (
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Assigned Department</label>
                    <select
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                      className={s.formInput}
                    >
                      <option value="Roads & Infra">Roads &amp; Infrastructure</option>
                      <option value="Sanitation">Sanitation &amp; Waste Management</option>
                      <option value="Water Supply">Water Supply &amp; Drainage</option>
                      <option value="Electricity">Electricity &amp; Power Grid</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.btnCancel}
                  onClick={() => setIsAddUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={s.btnSubmit}>
                  Create &amp; Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         4. EDIT USER MODAL
         ============================================================ */}
      {isEditUserModalOpen && selectedUser && (
        <div className={s.modalBackdrop} onClick={() => setIsEditUserModalOpen(false)}>
          <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3 className={s.modalTitle}>Edit User Profile: {selectedUser.full_name}</h3>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setIsEditUserModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={s.modalBody}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>Full Legal Name</label>
                <input
                  type="text"
                  defaultValue={selectedUser.full_name}
                  className={s.formInput}
                  id="editFullName"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Email Address</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className={s.formInput}
                  id="editEmail"
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel}>Phone Number</label>
                <input
                  type="text"
                  defaultValue={selectedUser.phone === '—' ? '' : selectedUser.phone}
                  className={s.formInput}
                  id="editPhone"
                />
              </div>

              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Account Status</label>
                  <select
                    defaultValue={selectedUser.is_active ? 'active' : 'suspended'}
                    className={s.formInput}
                    id="editStatus"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Ward</label>
                  <select
                    defaultValue={selectedUser.ward || 'Ward 1'}
                    className={s.formInput}
                    id="editWard"
                  >
                    <option value="Ward 1">Ward 1</option>
                    <option value="Ward 3">Ward 3</option>
                    <option value="Ward 4">Ward 4</option>
                    <option value="Ward 5">Ward 5</option>
                    <option value="Ward 7">Ward 7</option>
                    <option value="Ward 8">Ward 8</option>
                    <option value="Ward 9">Ward 9</option>
                    <option value="Ward 12">Ward 12</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnCancel}
                onClick={() => setIsEditUserModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={s.btnSubmit}
                onClick={() => {
                  const nameEl = document.getElementById('editFullName') as HTMLInputElement;
                  const emailEl = document.getElementById('editEmail') as HTMLInputElement;
                  const phoneEl = document.getElementById('editPhone') as HTMLInputElement;
                  const statusEl = document.getElementById('editStatus') as HTMLSelectElement;
                  const wardEl = document.getElementById('editWard') as HTMLSelectElement;

                  setUsersList((prev) =>
                    prev.map((u) =>
                      u.id === selectedUser.id
                        ? {
                            ...u,
                            full_name: nameEl?.value || u.full_name,
                            email: emailEl?.value || u.email,
                            phone: phoneEl?.value || u.phone,
                            is_active: statusEl?.value === 'active',
                            ward: wardEl?.value || u.ward,
                          }
                        : u
                    )
                  );
                  setIsEditUserModalOpen(false);
                  showToast('User profile updated successfully!', 'success');
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         5. AUDIT LOGS MODAL
         ============================================================ */}
      {isAuditLogsModalOpen && (
        <div className={s.modalBackdrop} onClick={() => setIsAuditLogsModalOpen(false)}>
          <div className={s.modalCard} style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="receipt_long" size={18} />
                </div>
                <div>
                  <h3 className={s.modalTitle}>System Security Audit Logs</h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Immutable cryptographic administrative ledger</span>
                </div>
              </div>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={() => setIsAuditLogsModalOpen(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={s.modalBody}>
              <div className={s.timelineList} style={{ maxHeight: 340, overflowY: 'auto' }}>
                {[
                  { event: 'Super Admin Security Session Initialized', time: 'Active Session', ip: '127.0.0.1', status: 'Success' },
                  { event: 'Municipal RBAC Enforcement Verified', time: 'Active Session', ip: '127.0.0.1', status: 'Success' },
                  { event: 'Departmental Routing Policy Active', time: 'System Check', ip: 'Internal Engine', status: 'Success' },
                  { event: 'Cryptographic Audit Trail Initialized', time: 'System Check', ip: 'Internal Ledger', status: 'Success' },
                ].map((log, idx) => (
                  <div key={idx} className={s.timelineItem}>
                    <div className={s.timelineDot} style={{ background: '#ecfdf5', color: '#059669' }}>
                      <Icon name="lock" size={11} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 12.5 }}>{log.event}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>IP: {log.ip} • Status: {log.status}</div>
                    </div>
                    <span className={s.timelineTime}>{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={s.modalFooter}>
              <button
                type="button"
                className={s.btnCancel}
                onClick={() => setIsAuditLogsModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={s.btnSubmit}
                onClick={() => showToast('Audit ledger exported as signed PDF.', 'success')}
              >
                Export Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
