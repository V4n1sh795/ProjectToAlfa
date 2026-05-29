import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export async function getMeetings(mondayDate) {
  const response = await api.get(`/week/${mondayDate}`);
  return response.data;
}

export async function getMeetingsByDate(date) {
  const response = await api.get(`/day/${date}`);
  return response.data;
}

export async function getTeam(teamId) {
  const response = await api.get(`/team/${teamId}`);
  return response.data;
}

export async function getTeams() {
  const response = await api.get("/get_team");
  return response.data;
}

export async function updateTeamCard(teamId, payload) {
  const response = await api.patch(`/team/${teamId}`, payload);
  return response.data;
}

export async function getMember(memberId) {
  const response = await api.get(`/member/${memberId}`);
  return response.data;
}

export async function getCurator(curatorId) {
  const response = await api.get(`/curator/${curatorId}`);
  return response.data;
}

export async function updateCuratorCard(curatorId, payload) {
  const response = await api.patch(`/curator/${curatorId}`, payload);
  return response.data;
}

export async function getTask(taskId) {
  const response = await api.get(`/task/${taskId}`);
  const data = response.data;

  return Array.isArray(data) ? data[0] : data;
}

export async function addMeetingComment(meetingId, text) {
  const response = await api.post(`/meeting/comment/${meetingId}`, { text });
  return response.data;
}

export async function getMeetingMembers(meetingId) {
  const response = await api.get(`/meeting/members/${meetingId}`);
  console.log(response.data);
  return response.data;
}

export async function getMeetingCurators(meetingId) {
  const response = await api.get(`/meeting/curators/${meetingId}`);
  console.log(response.data);
  return response.data;
}

export async function saveMeetingMembers(meetingId, memberIds) {
  const response = await api.post(`/meeting/members/${meetingId}`, memberIds);
  return response.data;
}

export async function saveMeetingCurators(meetingId, curatorIds) {
  const response = await api.post(`/meeting/curators/${meetingId}`, curatorIds);
  return response.data;
}

export async function createTaskForTeam(day, task) {
  const response = await api.post(`/task/${day}`, task);
  return response.data;
}

export async function closeTask(taskId) {
  const response = await api.post(`/task/${taskId}`);
  return response.data;
}
