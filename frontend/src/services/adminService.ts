// Reemplazar el contenido de: src/services/adminService.ts

import apiService from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: 'active' | 'suspended' | 'banned';
  profile_picture: string | null;
}

export interface GetUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminService = {
  getCompanies: async (params: { page?: number; limit?: number }) => {
    const response = await apiService.get('/v1/admin/companies', params);
    return response.data;
  },

  getReportsSummary: async (): Promise<any> => {
    const response = await apiService.get('/v1/admin/reports/summary');
    return response.data;
  },

  getSettings: async (): Promise<any> => {
    const response = await apiService.get('/v1/admin/settings');
    return response.data;
  },

  getDashboardStats: async (): Promise<{ totalUsers: number; totalBalance: number }> => {
    const response = await apiService.get('/v1/admin/stats');
    return response.data;
  },

  getRecentActivity: async (): Promise<any[]> => {
    const response = await apiService.get('/v1/admin/recent-activity');
    return response.data.activities;
  },

  updateSettings: async (settingsData: any): Promise<void> => {
    await apiService.put('/v1/admin/settings', settingsData);
  },

  getUsers: async (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'all' | 'active' | 'suspended' | 'banned';
    }
  ): Promise<GetUsersResponse> => {
    try {
      const response = await apiService.get('/v1/admin/users', params);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  getUserById: async (userId: number): Promise<User> => {
    const response = await apiService.get(`/v1/admin/users/${userId}`);
    return response.data.user;
  },

  createUser: async (userData: any): Promise<User> => {
    const response = await apiService.post('/v1/admin/users', userData);
    return response.data.user;
  },

  updateUser: async (userId: number, userData: any): Promise<void> => {
    await apiService.put(`/v1/admin/users/${userId}`, userData);
  },

  initiateActionVerification: async (actionType: string): Promise<void> => {
    await apiService.post('/v1/admin/actions/initiate-verification', { actionType });
  },
  
  updateUserStatus: async (
    userId: number,
    status: 'active' | 'suspended' | 'banned',
    verificationCode?: string
  ): Promise<void> => {
    await apiService.put(`/v1/admin/users/${userId}/status`, { status, verificationCode });
  },

  getUserBalance: async (userId: number) => {
    const response = await apiService.get(`/v1/admin/users/${userId}/balance`);
    return response.data;
  },

  getCompanyDetails: async (companyId: number): Promise<any> => {
    const response = await apiService.get(`/v1/admin/companies/${companyId}`);
    return response.data;
  },

  getCompanyEmployees: async (companyId: number): Promise<any> => {
    const response = await apiService.get(`/v1/admin/companies/${companyId}/employees`);
    return response.data;
  },

  // --- NUEVA FUNCIÓN ---
  deleteCompanyEmployee: async (companyId: number, employeeId: number): Promise<void> => {
    await apiService.delete(`/v1/admin/companies/${companyId}/employees/${employeeId}`);
  },

  getCompanySales: async (companyId: number): Promise<any> => {
    const response = await apiService.get(`/v1/admin/companies/${companyId}/sales`);
    return response.data;
  },

  getCompanyTasks: async (companyId: number): Promise<any> => {
    const response = await apiService.get(`/v1/admin/companies/${companyId}/tasks`);
    return response.data;
  },
};