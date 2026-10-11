import React, { useEffect, useState } from 'react';
import adminService, { DepartmentItem } from '../../services/admin.service';
import authService from '../../services/auth.service';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { User } from '../../types/user';
import { formatDate } from '../../utils/formatters';
import s from './AuthorityManagement.module.css';

export const AuthorityManagement: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Provision Modal
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Officer@12345');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [designation, setDesignation] = useState('Nodal Officer');
  const [phone, setPhone] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [officersData, deptData] = await Promise.all([
        adminService.searchUsers({ role: 'AUTHORITY' }),
        adminService.getDepartments(),
      ]);
      setOfficers(Array.isArray(officersData) ? officersData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (err: any) {
      console.error('Failed to load authority officers:', err);
      toastError(err?.response?.data?.detail || err?.message || 'Failed to load authority officers.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProvisionOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // 1. Provision officer user via Admin API
      await adminService.createUser({
        email,
        password,
        full_name: fullName,
        phone,
        role: 'AUTHORITY',
        department: selectedDeptId || undefined,
        designation,
      });

      success(`Authority officer "${fullName}" enrolled successfully.`);
      setIsProvisionModalOpen(false);
      // Reset
      setFullName('');
      setEmail('');
      setPhone('');
      loadData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to provision officer.');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredOfficers = officers.filter((o: any) => {
    const q = searchTerm.toLowerCase();
    const dept = (o.department_name || o.department || o.departments?.[0]?.department_name || '').toLowerCase();
    const desig = (o.designation || o.departments?.[0]?.designation || '').toLowerCase();
    return (
      (o.full_name || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      dept.includes(q) ||
      desig.includes(q)
    );
  });

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Municipal Authority & Officer Provisioning</h1>
          <p className={s.subtitle}>
            Deploy nodal officers across civic departments, configure access credentials, and monitor ward assignments.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsProvisionModalOpen(true)}
          leftIcon={<Icon name="person_add" size={18} />}
        >
          Provision New Officer
        </Button>
      </div>

      {/* Search Bar */}
      <div className={s.searchBar}>
        <Input
          placeholder="Search by officer name, email, department, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Icon name="search" size={18} />}
        />
      </div>

      {/* Officers Table */}
      {isLoading ? (
        <div className={s.loadingBox}>
          <span className={s.spinner}></span>
          <span>Syncing nodal officer directory...</span>
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div className={s.emptyBox}>
          <Icon name="badge" size={40} style={{ color: '#64748b' }} />
          <h3>No Officers Found</h3>
          <p>Click "Provision New Officer" to enroll nodal staff.</p>
        </div>
      ) : (
        <div className={s.tableCard}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Officer Identity</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.map((o) => (
                <tr key={o.public_id}>
                  <td className={s.identityCell}>
                    <div className={s.avatarBox}>
                      {o.full_name ? o.full_name[0].toUpperCase() : 'O'}
                    </div>
                    <div>
                      <div className={s.officerName}>{o.full_name || 'Nodal Officer'}</div>
                      <div className={s.officerEmail}>{o.email}</div>
                    </div>
                  </td>

                  <td>
                    <span className={s.deptPill}>
                      <Icon name="domain" size={13} />
                      <span>{o.department_name || o.department || (o as any).departments?.[0]?.department_name || 'General Municipal'}</span>
                    </span>
                  </td>

                  <td>
                    <span className={s.designationText}>
                      {o.designation || (o as any).departments?.[0]?.designation || 'Nodal Officer'}
                    </span>
                  </td>

                  <td>
                    <Badge variant={o.is_active ? 'success' : 'neutral'}>
                      {o.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  <td>
                    <span className={s.dateText}>{formatDate(o.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Officer Modal */}
      <Modal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        title="Provision Authority Officer Account"
      >
        <form onSubmit={handleProvisionOfficer} className={s.modalForm}>
          <div className={s.formGrid}>
            <Input
              label="Full Name"
              placeholder="e.g. Executive Nodal Officer"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Official Email"
              type="email"
              placeholder="officer@civicsetu.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={s.formGrid}>
            <div className={s.selectBox}>
              <label className={s.label}>Municipal Department</label>
              <select
                className={s.selectInput}
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                required
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d.public_id} value={d.public_id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Designation / Official Title"
              placeholder="e.g. Executive Nodal Engineer"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
          </div>

          <div className={s.formGrid}>
            <Input
              label="Mobile Phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Initial Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={s.modalFooter}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsProvisionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={formLoading}
              leftIcon={<Icon name="how_to_reg" size={16} />}
            >
              Enroll Officer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AuthorityManagement;
