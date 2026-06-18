import axios from "axios";

export async function getProjects() {
  const response = await axios.get("/api/projects");
  return response.data;
}
