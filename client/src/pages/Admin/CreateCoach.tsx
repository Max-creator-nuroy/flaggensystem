// pages/CreateCoach.tsx

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import React, { useState } from "react";

export default function CreateCoach() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const token = localStorage.getItem("token");

    const userData = {
      email,
      name,
      last_name: lastName,
      role: "COACH",
      mobileNumber,
    };

    try {
      const res = await fetch(`http://localhost:3000/users/createCoach/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (res.ok) {


        // Felder zurücksetzen
        setEmail("");
        setName("");
        setLastName("");
        setMobileNumber("");
      } else {
      
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxW={{ base: "100%", sm: "400px", md: "480px" }}
      mx="auto"
      mt={8}
      p={4}
    >
      <Heading size="lg" textAlign="center" mb={6}>
        Neuen Coach anlegen
      </Heading>
      <form onSubmit={handleSubmit}>
        <Stack >
          <Box>
            <Text fontSize="sm" mb={1}>
              Email *
            </Text>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
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

          <Button
            type="submit"
            colorScheme="teal"
            loading={loading}
            loadingText="Erstellen..."
          >
            Coach erstellen
          </Button>
        </Stack>
      </form>
    </Box>
  );
}
