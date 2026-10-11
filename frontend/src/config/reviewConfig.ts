/**
 * CivicSetu Review Mode Configuration
 * 
 * REVIEW_PHASE:
 * 1 = Project Review 1 (Core Architecture, Database, Authentication, Citizen Grievance Subsystem - 35% Progress)
 * 2 = Full Project / Review 2 (Full-Stack complete: Authority Hub, AI Engine, Admin Console, Radar Map, Feedback - 100%)
 */

export const REVIEW_PHASE: number = 2; // Full Mode (100% Platform Active)

export const isReview1Mode = (): boolean => false;

export const reviewConfig = {
  phase: 2,
  title: 'CivicSetu Full Platform (100% Active)',
  isReview1: false,
  
  // All Modules 100% Active
  modules: {
    authentication: true,
    citizenDashboard: true,
    submitComplaint: true,
    myComplaints: true,
    trackStatus: true,
    citizenProfile: true,
    departmentsList: true,
    notifications: true,
    authorityHub: true,
    superAdminPortal: true,
    aiAutoTriage: true,
    gisRadarMap: true,
    citizenFeedbackRating: true,
    securityAuditLogs: true,
  }
};

export default reviewConfig;
