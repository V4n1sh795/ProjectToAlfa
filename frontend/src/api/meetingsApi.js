import axios from "axios";

export async function getMeetings() {
  const response = await axios.get("/api/day/");
  return response.data;
}
