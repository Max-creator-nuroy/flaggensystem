import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  Checkbox,
  Card,
  CardHeader,
  CardBody,
  VStack,
  Icon,
  Field,
  FieldLabel,
  SimpleGrid,
  Badge,
} from "@chakra-ui/react";
import { FiUserPlus, FiUser, FiMail, FiPhone, FiUsers, FiLayers } from "react-icons/fi";
import React, { useEffect, useState } from "react";
import { apiCall } from "@/services/apiCall";

export default function CreateUser() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("USER");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
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
      password: name + lastName, // Automatisch generiertes Passwort
      name,
      last_name: lastName,
      role,
      isAffiliate,
      isCustomer,
      mobileNumber,
      phaseId: selectedPhaseId || undefined,
    };

    try {
      const data = await apiCall(
        `http://localhost:3000/users/createUser/${coach.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        },
        {
          loadingTitle: "Erstelle Benutzer…",
          successTitle: "Benutzer erstellt",
          successDescription: email,
          errorTitle: "Benutzer fehlgeschlagen",
        }
      );
      if (data) {
        setEmail("");
        setName("");
        setLastName("");
        setRole("USER");
        setMobileNumber("");
        setIsAffiliate(false);
        setIsCustomer(false);
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header */}
      <Card.Root mb={8}>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Flex 
              w={12} h={12} 
              align="center" justify="center" 
              rounded="full" 
              bg="blue.500"
              color="white"
            >
              <Icon as={FiUserPlus} boxSize={6} />
            </Flex>
            <VStack align="start" gap={0}>
              <Heading size="lg">Neuen Benutzer erstellen</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                Füge einen neuen Kunden oder Affiliate zu deinem Team hinzu
              </Text>
            </VStack>
          </Flex>
        </CardHeader>
      </Card.Root>

      <form onSubmit={handleSubmit}>
        <VStack gap={6} align="stretch">
          {/* Benutzertyp Auswahl */}
          <Card.Root>
            <CardHeader>
              <Flex align="center" gap={3}>
                <Icon as={FiUsers} color="purple.500" />
                <Heading size="md">Benutzertyp auswählen</Heading>
              </Flex>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Card.Root 
                  borderWidth="2px" 
                  borderColor={isAffiliate ? "teal.300" : "var(--color-border)"}
                  cursor="pointer"
                  _hover={{ borderColor: "teal.300" }}
                  onClick={() => setIsAffiliate(!isAffiliate)}
                  transition="all 0.2s"
                >
                  <CardBody p={4}>
                    <Flex align="center" gap={3}>
                      <Checkbox.Root
                        checked={isAffiliate}
                        onCheckedChange={(e: any) => setIsAffiliate(!!e.checked)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                      <VStack align="start" gap={1}>
                        <Text fontWeight="semibold">Affiliate</Text>
                        <Text fontSize="sm" color="var(--color-muted)">
                          Partner im Vertrieb
                        </Text>
                        <Badge colorScheme="teal" variant="subtle" size="sm">
                          Keine Telefonnummer erforderlich
                        </Badge>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card.Root>

                <Card.Root 
                  borderWidth="2px" 
                  borderColor={isCustomer ? "blue.300" : "var(--color-border)"}
                  cursor="pointer"
                  _hover={{ borderColor: "blue.300" }}
                  onClick={() => setIsCustomer(!isCustomer)}
                  transition="all 0.2s"
                >
                  <CardBody p={4}>
                    <Flex align="center" gap={3}>
                      <Checkbox.Root
                        checked={isCustomer}
                        onCheckedChange={(e: any) => setIsCustomer(!!e.checked)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                      <VStack align="start" gap={1}>
                        <Text fontWeight="semibold">Kunde</Text>
                        <Text fontSize="sm" color="var(--color-muted)">
                          Endkunde für Betreuung
                        </Text>
                        <Badge colorScheme="blue" variant="subtle" size="sm">
                          Vollständige Betreuung
                        </Badge>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card.Root>
              </SimpleGrid>
            </CardBody>
          </Card.Root>

          {/* Persönliche Daten */}
          <Card.Root>
            <CardHeader>
              <Flex align="center" gap={3}>
                <Icon as={FiUser} color="green.500" />
                <Heading size="md">Persönliche Daten</Heading>
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <FieldLabel>
                    <Flex align="center" gap={2}>
                      <Icon as={FiMail} boxSize={4} />
                      E-Mail-Adresse *
                    </Flex>
                  </FieldLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="max.mustermann@example.com"
                    required
                    bg="var(--color-surface)"
                    borderColor="var(--color-border)"
                  />
                </Field.Root>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <Field.Root>
                    <FieldLabel>Vorname *</FieldLabel>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Max"
                      required
                      bg="var(--color-surface)"
                      borderColor="var(--color-border)"
                    />
                  </Field.Root>
                  <Field.Root>
                    <FieldLabel>Nachname *</FieldLabel>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mustermann"
                      required
                      bg="var(--color-surface)"
                      borderColor="var(--color-border)"
                    />
                  </Field.Root>
                </SimpleGrid>


                {/* Telefonnummer nur für Kunden erforderlich */}
                <Field.Root>
                  <FieldLabel>
                    <Flex align="center" gap={2}>
                      <Icon as={FiPhone} boxSize={4} />
                      Telefonnummer {!isAffiliate && isCustomer ? "*" : "(optional)"}
                    </Flex>
                  </FieldLabel>
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+49 123 456789"
                    required={!isAffiliate && isCustomer}
                    bg="var(--color-surface)"
                    borderColor="var(--color-border)"
                  />
                  {isAffiliate && (
                    <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                      Für Affiliates ist die Telefonnummer optional
                    </Text>
                  )}
                </Field.Root>
              </VStack>
            </CardBody>
          </Card.Root>

          {/* Phase Auswahl */}
          <Card.Root>
            <CardHeader>
              <Flex align="center" gap={3}>
                <Icon as={FiLayers} color="orange.500" />
                <VStack align="start" gap={0}>
                  <Heading size="md">Phase zuweisen</Heading>
                  <Text fontSize="sm" color="var(--color-muted)">
                    Optional: Weise eine Startphase zu
                  </Text>
                </VStack>
              </Flex>
            </CardHeader>
            <CardBody>
              <Field.Root>
                <FieldLabel>Phase auswählen</FieldLabel>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="">Keine Phase ausgewählt</option>
                  {phases.map((phase: any) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.label || phase.name}
                    </option>
                  ))}
                </select>
              </Field.Root>
            </CardBody>
          </Card.Root>

          {/* Aktionen */}
          <Card.Root>
            <CardBody>
              <Flex justify="flex-end" gap={3}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmail("");
                    setName("");
                    setLastName("");
                    setMobileNumber("");
                    setIsAffiliate(false);
                    setIsCustomer(false);
                    setSelectedPhaseId("");
                  }}
                >
                  Zurücksetzen
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  loading={loading}
                  loadingText="Erstelle Benutzer..."
                  disabled={!email || !name || !lastName || (!isAffiliate && !isCustomer) || (!isAffiliate && isCustomer && !mobileNumber)}
                >
                  <Icon as={FiUserPlus} mr={2} />
                  Benutzer erstellen
                </Button>
              </Flex>
            </CardBody>
          </Card.Root>
        </VStack>
      </form>
    </Box>
  );
}
