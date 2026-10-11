import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import s from './Phase2Placeholder.module.css';

interface Phase2PlaceholderProps {
  moduleName?: string;
  icon?: string;
  targetMilestone?: string;
}

export const Phase2Placeholder: React.FC<Phase2PlaceholderProps> = ({
  moduleName = 'Authority & Enterprise Management Hub',
  icon = 'construction',
  targetMilestone = 'Project Review 2 (65% Milestone)',
}) => {
  const navigate = useNavigate();

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.iconWrapper}>
          <Icon name={icon} size={42} />
        </div>

        <div className={s.milestoneBadge}>
          <span className={s.badgeDot}></span>
          Scheduled for {targetMilestone}
        </div>

        <h2 className={s.title}>
          <span className={s.moduleHighlight}>{moduleName}</span>
        </h2>

        <p className={s.description}>
          This subsystem is currently preserved in background development for the next project phase. 
          For <strong>Project Review 1 (35% Scope)</strong>, please access the <strong>Citizen Grievance & Authentication Subsystem</strong>.
        </p>

        <div className={s.specsBox}>
          <div className={s.specRow}>
            <span className={s.specLabel}>Current Project Phase:</span>
            <span className={s.specValue}>Review 1 (35% Milestone)</span>
          </div>
          <div className={s.specRow}>
            <span className={s.specLabel}>Target Completion:</span>
            <span className={s.specValue}>Review 2 (65% / Final)</span>
          </div>
          <div className={s.specRow}>
            <span className={s.specLabel}>Active Review 1 Scope:</span>
            <span className={s.specValue}>Auth + Citizen Portal + Grievances</span>
          </div>
          <div className={s.specRow}>
            <span className={s.specLabel}>Subsystem Status:</span>
            <span className={s.specValue} style={{ color: '#fbbf24' }}>Preserved in Background</span>
          </div>
        </div>

        <div className={s.actions}>
          <button className={s.btnPrimary} onClick={() => navigate('/citizen/dashboard')}>
            <Icon name="space_dashboard" size={18} />
            Go to Citizen Dashboard
          </button>
          <button className={s.btnSecondary} onClick={() => navigate('/citizen/complaints/new')}>
            <Icon name="add_circle" size={18} />
            File Grievance
          </button>
        </div>
      </div>
    </div>
  );
};

export default Phase2Placeholder;
