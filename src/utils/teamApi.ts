import api from './api';

export const getTeams = () => api.get('/teams');

export const createTeam = (data: any) =>
  api.post('/teams', data);

export const addMembers = (teamId: number, data: any) =>
  api.post(`/teams/${teamId}/members`, data);

export const removeMember = (teamId: number, memberId: number) =>
  api.delete(`/teams/${teamId}/members/${memberId}`);

export const deleteTeam = (teamId: number) =>
  api.delete(`/teams/${teamId}`);

export const updateTeam = (teamId: number, data: any) =>
  api.patch(`/teams/${teamId}`, data);

// ✅ ADDED: manager access comes from Team.managerId, not user.role
export const getMyManagerAccess = () =>
  api.get('/teams/me/manager-access');

// ✅ ADDED: save team access control
export const getTeamAccessControl = (teamId: number) =>
  api.get(`/teams/${teamId}/access-control`);

export const saveTeamAccessControl = (teamId: number, data: any) =>
  api.post(`/teams/${teamId}/access-control`, data);