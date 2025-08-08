import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Checkbox,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";

export default function CreateUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("USER");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState();
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  useEffect(() => {
    // Phasen vom Coach laden (angenommen coachId liegt vor)
    fetch(`http://localhost:3000/phase/getPhaseByCoach/${coach.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPhases(data.phases || []))
      .catch(() => setPhases([]));
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const userData = {
      email,
      password,
      name,
      last_name: lastName,
      role,
      isAffiliate,
      isCustomer,
      mobileNumber,
      phaseId: selectedPhaseId,
    };

    try {
      const res = await fetch(
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
      const data = await res.json();

      if (res.ok) {
        alert(`✅ Benutzer erstellt – ID: ${data.id}`);
        setEmail("");
        setPassword("");
        setName("");
        setLastName("");
        setRole("USER");
        setMobileNumber("");
        setIsAffiliate(false);
        setIsCustomer(false);
      } else {
        alert(`Fehler: ${data.message || "Unbekannter Fehler"}`);
      }
    } catch {
      alert("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhase = async (e: any) => {
    const newPhaseId = e.target.value;
    setSelectedPhaseId(newPhaseId);
  };

  return (
    <Box
      maxW={{ base: "100%", sm: "400px", md: "480px" }}
      mx="auto"
      mt={8}
      p={4}
    >
      <Heading size="lg" textAlign="center" mb={6}>
        Neuen Benutzer anlegen
      </Heading>
      <form onSubmit={handleSubmit}>
        <Stack>
          <Box>
            <Checkbox.Root
              checked={isAffiliate}
              onCheckedChange={(e: any) => setIsAffiliate(!!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Affiliate</Checkbox.Label>
            </Checkbox.Root>
          </Box>
          <Box>
            <Checkbox.Root
              checked={isCustomer}
              onCheckedChange={(e: any) => setIsCustomer(!!e.checked)}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Kunde</Checkbox.Label>
            </Checkbox.Root>
          </Box>
          <Box>
            <Text fontSize="sm" mb={1}>
              Email *
            </Text>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </Box>

          <Flex wrap="wrap" gap={4}>
            <Box flex="1">
              <Text fontSize="sm" mb={1}>
                Vorname *
              </Text>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max"
                required
              />
            </Box>
            <Box flex="1">
              <Text fontSize="sm" mb={1}>
                Nachname *
              </Text>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                required
              />
            </Box>
          </Flex>

          <Box>
            <Text fontSize="sm" mb={1}>
              Mobilnummer *
            </Text>
            <Input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+49123456789"
              required
            />
          </Box>

          <div>
            <label>
              <b>Phase:</b>{" "}
              <select value={selectedPhaseId} onChange={handleChangePhase}>
                <option value="">Keine Phase</option>
                {phases.map((phase: any) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.label || phase.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button
            type="submit"
            colorScheme="teal"
            loading={loading}
            loadingText="Erstellen..."
          >
            Benutzer erstellen
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
