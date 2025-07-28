import api from "./api";

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });

    const token = response.data.token;
    localStorage.setItem("token", token);

    return response.data;
  } catch (error: any) {
    // 👇 Fehler behandeln
    if (error.response && error.response.status === 401) {
      throw new Error(error.response.message);
    }
    throw new Error("Login fehlgeschlagen");
  }
};
