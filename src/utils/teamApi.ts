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