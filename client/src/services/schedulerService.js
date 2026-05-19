const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function generateSchedule(players, courts, history, token, config = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}/api/schedule/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      players,
      courts,
      history,
      config,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to generate schedule");
  }

  return result.data;
}
