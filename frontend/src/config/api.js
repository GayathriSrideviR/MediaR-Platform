const configuredApiBase = process.env.REACT_APP_API_URL?.trim();

const fallbackApiBase =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? window.location.origin
    : "http://localhost:5000";

export const API_BASE = configuredApiBase || fallbackApiBase;
