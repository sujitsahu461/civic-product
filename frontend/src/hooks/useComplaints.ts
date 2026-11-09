import { useEffect } from 'react';
import useComplaintStore from '../store/complaintStore';

export function useComplaints(params?: Record<string, any>) {
  const { complaints, selectedComplaint, isLoading, error, fetchComplaints, fetchComplaintById, submitComplaint } = useComplaintStore();

  useEffect(() => {
    fetchComplaints(params);
  }, [JSON.stringify(params)]);

  return {
    complaints,
    selectedComplaint,
    isLoading,
    error,
    refetch: () => fetchComplaints(params),
    fetchComplaintById,
    submitComplaint,
  };
}

export default useComplaints;
