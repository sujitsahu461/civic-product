import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminService, {
  DepartmentAuthorityItem,
  DepartmentItem,
} from '../../services/admin.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { User } from '../../types/user';
import { formatDate } from '../../utils/formatters';
import s from './DepartmentManagement.module.css';

export const DepartmentManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDeptId = searchParams.get('id');

  const { success, error: toastError } = useToast();

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);

  // Active department selection
  const [selectedDept, setSelectedDept] = useState<DepartmentItem | null>(null);
  const [officers, setOfficers] = useState<DepartmentAuthorityItem[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);

  // Candidate users for officer assignment
  const [allOfficers, setAllOfficers] = useState<User[]>([]);
  const [selectedUserPublicId, setSelectedUserPublicId] = useState('');
  const [assignDesignation, setAssignDesignation] = useState('');
  const [assignIsHead, setAssignIsHead] = useState(false);

  // Form states for Add/Edit
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadAllOfficers();
  }, []);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getDepartments();
      setDepartments(data);
      if (initialDeptId) {
        const found = data.find((d) => d.public_id === initialDeptId);
        if (found) openOfficersModal(found);
      }
    } catch {
      toastError('Failed to load civic departments.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllOfficers = async () => {
    try {
      const data = await adminService.searchUsers({ role: 'AUTHORITY' });
      setAllOfficers(data);
    } catch {}
  };

  const openAddModal = () => {
    setName('');
    setDescription('');
    setContactEmail('');
    setContactPhone('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setContactEmail(dept.contact_email || '');
    setContactPhone(dept.contact_phone || '');
    setIsEditModalOpen(true);
  };

  const openOfficersModal = async (dept: DepartmentItem) => {
    setSelectedDept(dept);
    setIsOfficersModalOpen(true);
    setOfficersLoading(true);
    try {
      const authList = await adminService.getDepartmentAuthorities(dept.public_id);
      setOfficers(authList);
    } catch {
      setOfficers([]);
    } finally {
      setOfficersLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await adminService.createDepartment({
        name,
        description,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      success(`Department "${name}" created successfully.`);
      setIsAddModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      toastError(err?.message || 'Failed to create department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setFormLoading(true);
    try {
      await adminService.updateDepartment(selectedDept.public_id, {
        name,
        description,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });
      success(`Department "${name}" updated successfully.`);
      setIsEditModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update department.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (dept: DepartmentItem) => {
    try {
      await adminService.deactivateDepartment(dept.public_id);
      success(`Department "${dept.name}" status updated.`);
      loadDepartments();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update status.');
    }
  };

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !selectedUserPublicId) return;
    try {
      await adminService.assignAuthority(selectedDept.public_id, {
        user_public_id: selectedUserPublicId,
        designation: assignDesignation || 'Nodal Officer',
        is_head: assignIsHead,
      });
      success('Officer assigned to department.');
      setSelectedUserPublicId('');
      setAssignDesignation('');
      setAssignIsHead(false);
      openOfficersModal(selectedDept);
      loadDepartments();
    } catch (err: any) {
      toastError(err?.message || 'Failed to assign officer.');
    }
  };

  const handleRemoveOfficer = async (userPublicId: string) => {
    if (!selectedDept) return;
    try {
      await adminService.removeAuthority(selectedDept.public_id, userPublicId);
      success('Officer unassigned from department.');
      openOfficersModal(selectedDept);
      loadDepartments();
    } catch (err: any) {
      toastError(err?.message || 'Failed to remove officer.');
    }
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Municipal Departments Governance</h1>
          <p className={s.subtitle}>
            Manage civic service directorates, assign jurisdictional officers, and configure contact protocols.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          leftIcon={<Icon name="add" size={18} />}
        >
          Add Department
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className={s.searchBar}>
        <Input
          placeholder="Search departments by name, keyword, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Icon name="search" size={18} />}
        />
      </div>

      {/* Department Table */}
      {isLoading ? (
        <div className={s.loadingBox}>
          <span className={s.spinner}></span>
          <span>Loading departments directory...</span>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className={s.emptyBox}>
          <Icon name="domain_disabled" size={40} style={{ color: '#64748b' }} />
          <h3>No Departments Found</h3>
          <p>Try adjusting your search query or create a new department above.</p>
        </div>
      ) : (
        <div className={s.tableCard}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Contact Info</th>
                <th>Status</th>
                <th>Assigned Officers</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepts.map((d) => (
                <tr key={d.public_id}>
                  <td className={s.nameCell}>
                    <div className={s.deptName}>{d.name}</div>
                    <div className={s.deptDesc}>{d.description || 'Civic infrastructure maintenance'}</div>
                  </td>

                  <td>
                    <div className={s.contactItem}>
                      <Icon name="mail" size={13} />
                      <span>{d.contact_email || 'dept@civicsetu.gov.in'}</span>
                    </div>
                    {d.contact_phone && (
                      <div className={s.contactItem}>
                        <Icon name="call" size={13} />
                        <span>{d.contact_phone}</span>
                      </div>
                    )}
                  </td>

                  <td>
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {d.status}
                    </Badge>
                  </td>

                  <td>
                    <span className={s.officersCount}>
                      <Icon name="badge" size={14} />
                      <span>{d.authority_count ?? 0} Staff</span>
                    </span>
                  </td>

                  <td>
                    <span className={s.dateText}>{formatDate(d.created_at)}</span>
                  </td>

                  <td>
                    <div className={s.actionsRow}>
                      <button
                        type="button"
                        className={s.btnIcon}
                        onClick={() => openOfficersModal(d)}
                        title="Manage Assigned Officers"
                      >
                        <Icon name="group_add" size={16} />
                      </button>

                      <button
                        type="button"
                        className={s.btnIcon}
                        onClick={() => openEditModal(d)}
                        title="Edit Department"
                      >
                        <Icon name="edit" size={16} />
                      </button>

                      <button
                        type="button"
                        className={s.btnIconDanger}
                        onClick={() => handleDeactivate(d)}
                        title="Toggle Active / Inactive"
                      >
                        <Icon name="power_settings_new" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1. Add Department Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Municipal Department"
      >
        <form onSubmit={handleCreateDepartment} className={s.modalForm}>
          <Input
            label="Department Name"
            placeholder="e.g. Street Lighting & Electrical Works"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className={s.inputGroup}>
            <label className={s.label}>Description & Scope</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="Operational responsibilities and maintenance mandates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={s.formGrid}>
            <Input
              label="Contact Email"
              type="email"
              placeholder="dept@civicsetu.gov.in"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Input
              label="Helpline Number"
              placeholder="e.g. +91 674 2500123"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className={s.modalFooter}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={formLoading}
            >
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Department Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Department: ${selectedDept?.name}`}
      >
        <form onSubmit={handleUpdateDepartment} className={s.modalForm}>
          <Input
            label="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className={s.inputGroup}>
            <label className={s.label}>Description & Scope</label>
            <textarea
              className={s.textarea}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={s.formGrid}>
            <Input
              label="Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Input
              label="Helpline Number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className={s.modalFooter}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={formLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Manage Assigned Officers Modal */}
      <Modal
        isOpen={isOfficersModalOpen}
        onClose={() => setIsOfficersModalOpen(false)}
        title={`Assigned Officers — ${selectedDept?.name}`}
        maxWidth="680px"
      >
        <div className={s.officersModalBody}>
          {/* Assignment Form */}
          <form onSubmit={handleAssignOfficer} className={s.assignForm}>
            <h4 className={s.assignHeading}>Assign New Officer to {selectedDept?.name}</h4>
            <div className={s.assignGrid}>
              <div className={s.selectBox}>
                <label className={s.label}>Select Registered Officer</label>
                <select
                  className={s.selectInput}
                  value={selectedUserPublicId}
                  onChange={(e) => setSelectedUserPublicId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Officer --</option>
                  {allOfficers.map((u) => (
                    <option key={u.public_id} value={u.public_id}>
                      {u.full_name || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Designation / Role"
                placeholder="e.g. Chief Executive Engineer"
                value={assignDesignation}
                onChange={(e) => setAssignDesignation(e.target.value)}
              />
            </div>

            <div className={s.checkboxRow}>
              <input
                type="checkbox"
                id="isHeadCheck"
                checked={assignIsHead}
                onChange={(e) => setAssignIsHead(e.target.checked)}
              />
              <label htmlFor="isHeadCheck" className={s.checkLabel}>
                Designate as Department Head / Primary Nodal In-Charge
              </label>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="person_add" size={16} />}
            >
              Assign to Department
            </Button>
          </form>

          {/* Current Officers List */}
          <div className={s.currentOfficersList}>
            <h4 className={s.assignHeading}>Current Officers Roster</h4>
            {officersLoading ? (
              <div className={s.loadingBox}>
                <span className={s.spinner}></span>
                <span>Loading officer roster...</span>
              </div>
            ) : officers.length === 0 ? (
              <div className={s.noOfficers}>
                <p>No officers currently assigned to this department node.</p>
              </div>
            ) : (
              <div className={s.officersList}>
                {officers.map((officer) => (
                  <div key={officer.id || officer.user_public_id} className={s.officerCard}>
                    <div className={s.officerLeft}>
                      <div className={s.officerAvatar}>
                        <Icon name="badge" size={18} />
                      </div>
                      <div>
                        <div className={s.officerName}>
                          {officer.user_full_name || officer.user_email}
                          {officer.is_head && (
                            <span className={s.headBadge}>DEPARTMENT HEAD</span>
                          )}
                        </div>
                        <div className={s.officerMeta}>
                          {officer.designation || 'Nodal Officer'} ● {officer.user_email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={s.btnRemove}
                      onClick={() => handleRemoveOfficer(officer.user_public_id)}
                      title="Remove Officer"
                    >
                      <Icon name="person_remove" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentManagement;
