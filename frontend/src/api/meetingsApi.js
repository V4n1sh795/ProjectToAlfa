import axios from "axios";

export async function getMeetings(mondayDate) {
  const response = await axios.get(`/api/week/${mondayDate}`);
  return response.data;
}
