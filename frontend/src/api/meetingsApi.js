import axios from "axios";

export async function getMeetings() {
  const response = await axios.get("/api/week/2026-06-18");
  return response.data;
}
