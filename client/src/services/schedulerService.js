export async function generateSchedule(players, courts, history) {
  const response = await fetch("http://localhost:5001/api/schedule/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      players,
      courts,
      history,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to generate schedule");
  }

  return result.data;
}