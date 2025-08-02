"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
  Flex,
} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import getUserFromToken from "@/services/getTokenFromLokal";

export default function ProfilPage() {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  useEffect(() => {
    if (!user || !token) return;

    fetch(`http://localhost:3000/users/getUser/${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setName(data.name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
        setRole(data.role || "");
        setMobileNumber(data.mobileNumber || "");
      })
      .catch(() => {
        toaster.error({
          title: "Fehler",
          description: "Profilinformationen konnten nicht geladen werden.",
        });
      });
  }, []);

  const handleProfileUpdate = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/users/updateUser/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            last_name: lastName,
            email,
            mobileNumber,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toaster.success({
          title: "Profil gespeichert",
          description: "Deine Daten wurden aktualisiert.",
        });
      } else {
        toaster.error({
          title: "Fehler",
          description:
            data.message || "Profil konnte nicht gespeichert werden.",
        });
      }
    } catch {
      toaster.error({
        title: "Netzwerkfehler",
        description: "Bitte versuche es später erneut.",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toaster.error({
        title: "Felder fehlen",
        description: "Bitte fülle alle Passwortfelder aus.",
      });
    }

    if (newPassword !== confirmPassword) {
      return toaster.error({
        title: "Passwörter stimmen nicht überein",
        description: "Bitte überprüfe deine Eingaben.",
      });
    }

    try {
      const res = await fetch(
        `http://localhost:3000/users/changePassword/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toaster.success({
          title: "Passwort geändert",
          description: "Dein Passwort wurde erfolgreich aktualisiert.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      } else {
        toaster.error({
          title: "Fehler",
          description: data.message || "Passwort konnte nicht geändert werden.",
        });
      }
    } catch {
      toaster.error({
        title: "Netzwerkfehler",
        description: "Bitte versuche es später erneut.",
      });
    }
  };

  const handleGetPipelines = async () => {
    try {
      const res = await fetch(
        "http://localhost:3000/close/getPipelinesFromClose",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`, // falls Auth benötigt wird
          },
        }
      );
      if (res) toaster.success({ title: "Erfolgreich geladen" });
    } catch (error) {
      console.error("Fehler beim Laden der Pipelines:", error);
    }
  };

  return (
    <Box
      maxW="480px"
      mx="auto"
      mt={10}
      p={6}
      borderWidth={1}
      borderRadius="md"
      boxShadow="md"
    >
      <Heading size="lg" mb={6} textAlign="center">
        Mein Profil
      </Heading>

      <Stack>
        {/* Name + Nachname */}
        <Flex gap={4} wrap="wrap">
          <Text>{name}</Text>
          <Text>{lastName}</Text>
        </Flex>

        {/* E-Mail */}
        <Box>
          <Text mb={1} fontWeight="medium">
            E-Mail
          </Text>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max@example.com"
          />
        </Box>

        {/* Mobilnummer */}
        <Box>
          <Text mb={1} fontWeight="medium">
            Mobilnummer
          </Text>
          <Input
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="+49..."
          />
        </Box>

        <Button onClick={handleProfileUpdate} colorScheme="teal" size="md">
          Änderungen speichern
        </Button>

        {/* Passwort ändern Button */}
        <Button
          mt={6}
          variant="outline"
          colorScheme="teal"
          onClick={() => setShowPasswordForm((prev) => !prev)}
        >
          {showPasswordForm ? "Passwort ändern verbergen" : "Passwort ändern"}
        </Button>

        {/* Passwort ändern Formular (nur anzeigen, wenn showPasswordForm true) */}
        {showPasswordForm && (
          <Box mt={4} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
            <Stack>
              <Input
                type="password"
                placeholder="Aktuelles Passwort"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Neues Passwort"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Neues Passwort wiederholen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button
                onClick={handlePasswordChange}
                colorScheme="teal"
                size="md"
              >
                Passwort aktualisieren
              </Button>
            </Stack>
          </Box>
        )}
        {role === "ADMIN" ? 
          <Button onClick={handleGetPipelines} colorScheme="blue">
            Close Pipelines laden
          </Button>
        :""}
      </Stack>
    </Box>
  );
}
