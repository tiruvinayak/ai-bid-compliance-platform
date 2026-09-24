import { api, clearAuthState, USE_MOCK } from './api';
import { mockUserProfiles } from '../data/mockData';
import type { UserProfile } from '../types';
import { homePathForRole, normalizeAuthRole } from '../utils/roles';

export interface BidderRegisterParams {
  name: string;
  organization: string;
  email: string;
  mobile: string;
  password: string;
  gstin?: string;
  registrationNo?: string;
}

export interface OfficerRegisterParams {
  name: string;
  email: string;
  officerId: string;
  department: string;
  designation: string;
  mobile: string;
  password: string;
}

const persistSession = (token: string | undefined, user: UserProfile): void => {
  if (token) localStorage.setItem('gem_auth_token', token);
  localStorage.setItem('gem_user_role', user.role);
  localStorage.setItem('gem_user_email', user.email);
};

export const authService = {
  homePathForRole,

  async login(username: string, pass: string): Promise<{ token: string; user: UserProfile }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));

      const cleanUser = username.trim().toLowerCase();

      let user: UserProfile;
      if (cleanUser === 'user@demo.gov.in' && pass === 'User@123') {
        user = mockUserProfiles['USER'];
      } else if (cleanUser === 'officer@demo.gov.in' && pass === 'Officer@123') {
        user = mockUserProfiles['GOVERNMENT OFFICER'];
      } else if (cleanUser === 'admin@demo.gov.in' && pass === 'Admin@123') {
        user = mockUserProfiles['CENTRAL_ADMIN'];
      } else if (cleanUser === 'railways@demo.gov.in' && pass === 'Sector@123') {
        user = mockUserProfiles['SECTOR_USER'];
      } else {
        throw new Error('Invalid credentials. Use demo accounts from the login panel.');
      }

      const token = `mock_jwt_${user.role}_2026`;
      persistSession(token, user);

      return { token, user };
    }

    const response = await api.post('/auth/login', { username, password: pass });
    const data = response.data;

    if (data?.user) {
      const role = normalizeAuthRole(data.user.role);
      if (!role || !data.token) {
        clearAuthState();
        throw new Error('Authentication response did not contain a valid session role or token.');
      }
      data.user.role = role;
      persistSession(data.token, data.user);
    } else {
      clearAuthState();
      throw new Error('Authentication response did not contain a user session.');
    }

    return data;
  },

  async registerBidder(params: BidderRegisterParams): Promise<{ token: string; user: UserProfile }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      const user: UserProfile = {
        name: params.name,
        email: params.email,
        department: params.organization,
        organization: params.organization,
        mobile: params.mobile,
        gstin: params.gstin,
        registrationNo: params.registrationNo,
        designation: 'Authorized Bidder Representative',
        role: 'USER',
        accountStatus: 'Active'
      };
      const token = `mock_jwt_user_bidder_${Date.now()}`;
      localStorage.setItem('gem_auth_token', token);
      localStorage.setItem('gem_user_role', 'USER');
      localStorage.setItem('gem_user_email', user.email);
      return { token, user };
    }

    const response = await api.post('/auth/register/bidder', params);
    const data = response.data;
    if (data?.user) {
      data.user.role = 'USER';
      if (!data.token) throw new Error('Registration response did not contain a session token.');
      persistSession(data.token, data.user);
    } else {
      throw new Error('Registration response did not contain a user session.');
    }
    return data;
  },

  async registerOfficer(params: OfficerRegisterParams): Promise<{ token: string; user: UserProfile }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      const user: UserProfile = {
        name: params.name,
        email: params.email,
        department: params.department,
        designation: params.designation,
        officerId: params.officerId,
        mobile: params.mobile,
        role: 'GOVERNMENT OFFICER',
        accountStatus: 'Active'
      };
      const token = `mock_jwt_gov_officer_${Date.now()}`;
      localStorage.setItem('gem_auth_token', token);
      localStorage.setItem('gem_user_role', 'GOVERNMENT OFFICER');
      localStorage.setItem('gem_user_email', user.email);
      return { token, user };
    }

    const response = await api.post('/auth/register/officer', params);
    const data = response.data;
    if (data?.user) {
      data.user.role = 'GOVERNMENT OFFICER';
      if (!data.token) throw new Error('Registration response did not contain a session token.');
      persistSession(data.token, data.user);
    } else {
      throw new Error('Registration response did not contain a user session.');
    }
    return data;
  },

  async getCurrentUser(): Promise<UserProfile> {
    if (USE_MOCK) {
      const savedRole = localStorage.getItem('gem_user_role');
      const savedEmail = localStorage.getItem('gem_user_email');
      const token = localStorage.getItem('gem_auth_token');
      const role = normalizeAuthRole(savedRole);
      if (!token || !savedEmail || !role) {
        clearAuthState();
        throw new Error('No valid authenticated session found.');
      }
      return { ...mockUserProfiles[role], email: savedEmail };
    }
    const response = await api.get('/auth/me');
    const user = response.data;
    const role = normalizeAuthRole(user?.role);
    if (!user || !role) {
      clearAuthState();
      throw new Error('Authenticated user has no recognized role.');
    }
    user.role = role;
    return user;
  },

  logout(): void {
    clearAuthState();
  }
};
