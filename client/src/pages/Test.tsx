import getUserFromToken from "@/services/getTokenFromLokal";
import React, { useState } from "react";

export default function Test() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const userData = {
      email,
      password,
      name,
      last_name: lastName,
      role,
      isAffiliate,
    };
    try {
      const coach = getUserFromToken(token);
      const response = await fetch(
        `http://localhost:3000/users/createUser/${coach.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert("User erstellt mit ID: " + data.id);
      } else {
        const errorData = await response.json();
        alert("Fehler: " + errorData.message);
      }
    } catch (error) {
      alert("Netzwerkfehler");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
      />
      <input
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
      />
      <input
        placeholder="Vorname"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        placeholder="Nachname"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        required
      />
      <input
        type="checkbox"
        checked={isAffiliate}
        onChange={(e) => setIsAffiliate(e.target.checked)} // ✅ liefert boolean!
      />
      <input
        placeholder="Rolle (z.B. USER)"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <button type="submit">User erstellen</button>
    </form>
  );
}
