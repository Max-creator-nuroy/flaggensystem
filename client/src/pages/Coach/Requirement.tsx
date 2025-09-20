import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Field,
  FieldLabel,
  Flex,
  Grid,
  Heading,
  Icon,
  IconButton,
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
  Card,
  CardHeader,
  CardBody,
  VStack,
  HStack,
  Badge,
  SimpleGrid,
  Tabs,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { BsX } from "react-icons/bs";
import { CgCheck } from "react-icons/cg";
import { Form } from "react-router";
import { apiCall } from "@/services/apiCall";
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiPlus, 
  FiEdit3, 
  FiLayers, 
  FiSettings,
  FiTarget,
  FiBookOpen
} from "react-icons/fi";

export default function Requirement() {
  const [title, setrequirementTitle] = useState("");
  const [description, setRequirementDescription] = useState("");
  const [rule, setRule] = useState("");
  const token = localStorage.getItem("token");
  const coachId = getUserFromToken(token);
  const [requirementList, setRequirementList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [phaseName, setPhaseName] = useState("");
  const [activeTab, setActiveTab] = useState<"criteria" | "phases">("criteria");

  // Phase erstellen
  const handlePhaseCreate = async () => {
    if (!phaseName) return;
    const data = await apiCall(
      `http://localhost:3000/phase/createPhase/${coachId.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: phaseName }),
      },
      {
        loadingTitle: "Phase wird erstellt…",
        successTitle: "Phase erstellt",
        successDescription: phaseName,
        errorTitle: "Phase fehlgeschlagen",
      }
    );
    if (data) {
      setPhaseName("");
      fetchPhases();
    }
  };

  const fetchRequirements = async () => {
    try {
      await fetch(`http://localhost:3000/users/getUser/${coachId.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          setRule(data.coachRules || "");
        });
      await fetch(
        `http://localhost:3000/requirement/getRequirementByCoach/${coachId.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data.requirement);
          setRequirementList(data.requirement || []);
          setLoading(false);
        });
    } catch {
      setLoading(false);
    }
  };

  const [phases, setPhases] = useState([]);
  const [loadingPhases, setLoadingPhases] = useState(false);

  const fetchPhases = async () => {
    setLoadingPhases(true);
    try {
      const res = await fetch(
        `http://localhost:3000/phase/getPhaseByCoach/${coachId.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setPhases(data.phases || []);
    } catch (error) {
      alert("Fehler beim Laden der Phasen");
    } finally {
      setLoadingPhases(false);
    }
  };

  useEffect(() => {
    fetchPhases();
    fetchRequirements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title != "" && description != "") {
      const requirement = {
        title,
        description,
      };
      const data = await apiCall(
        `http://localhost:3000/requirement/createRequirement/${coachId.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requirement),
        },
        {
          loadingTitle: "Kriterium erstellen…",
          successTitle: "Kriterium erstellt",
          successDescription: title,
          errorTitle: "Kriterium fehlgeschlagen",
        }
      );
      if (data) {
        setRequirementDescription("");
        setrequirementTitle("");
        fetchRequirements();
      }
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rule && rule.trim() !== "") {
      await apiCall(
        `http://localhost:3000/users/updateUser/${coachId.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ coachRules: rule }),
        },
        {
          loadingTitle: "Regeln speichern…",
          successTitle: "Regeln gespeichert",
          errorTitle: "Regeln fehlgeschlagen",
          suppressToast: false,
        }
      );
    }
  };

  const deleteRequirement = async (rId: any) => {
    const data = await apiCall(
      `http://localhost:3000/requirement/deleteRequirement/${rId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      {
        loadingTitle: "Ändere Status…",
        successTitle: "Status geändert",
        errorTitle: "Änderung fehlgeschlagen",
      }
    );
    if (data) fetchRequirements();
  };

  const deletePhase = async (phaseId: string) => {
    const data = await apiCall(
      `http://localhost:3000/phase/deletePhase/${phaseId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      {
        loadingTitle: "Lösche Phase…",
        successTitle: "Phase gelöscht",
        errorTitle: "Löschen fehlgeschlagen",
      }
    );
    if (data) fetchPhases();
  };

  // Memoized active/inactive lists
  const activeRequirements = useMemo(
    () => (requirementList as any[]).filter((r: any) => r.isDeleted == false),
    [requirementList]
  );
  const inactiveRequirements = useMemo(
    () => (requirementList as any[]).filter((r: any) => r.isDeleted == true),
    [requirementList]
  );

  const RequirementCard = ({ requirement }: { requirement: any }) => (
    <Card.Root
      _hover={{
        transform: "translateY(-2px)",
        borderColor: requirement.isDeleted ? "orange.300" : "green.300",
      }}
      transition="all 0.2s ease"
      borderWidth="1px"
      borderColor={requirement.isDeleted ? "orange.200" : "green.200"}
      bg="var(--color-surface)"
    >
      <CardBody>
        <VStack align="stretch" gap={3}>
          <Flex align="start" justify="space-between" gap={3}>
            <VStack align="start" gap={1} flex={1}>
              <Text fontWeight="semibold" lineHeight="1.3">
                {requirement.title}
              </Text>
              <Badge 
                colorScheme={requirement.isDeleted ? "orange" : "green"} 
                variant="subtle"
                size="sm"
              >
                <Icon 
                  as={requirement.isDeleted ? FiXCircle : FiCheckCircle} 
                  mr={1}
                  boxSize={3}
                />
                {requirement.isDeleted ? "Inaktiv" : "Aktiv"}
              </Badge>
            </VStack>
            <IconButton
              aria-label={requirement.isDeleted ? "Reaktivieren" : "Deaktivieren"}
              size="sm"
              variant="ghost"
              colorScheme={requirement.isDeleted ? "green" : "red"}
              onClick={() => deleteRequirement(requirement.id)}
            >
              <Icon as={requirement.isDeleted ? FiCheckCircle : FiXCircle} />
            </IconButton>
          </Flex>
          
          <Text fontSize="sm" color="var(--color-muted)" lineHeight="1.4">
            {requirement.description || "Keine Beschreibung verfügbar"}
          </Text>
        </VStack>
      </CardBody>
    </Card.Root>
  );

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header */}
      <Card.Root mb={6}>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Flex 
              w={12} h={12} 
              align="center" justify="center" 
              rounded="full" 
              bg="purple.500"
              color="white"
            >
              <Icon as={FiTarget} boxSize={6} />
            </Flex>
            <VStack align="start" gap={0}>
              <Heading size="lg">Anforderungen verwalten</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                Erstelle und verwalte Kriterien, Phasen und Regeln für deine Kunden
              </Text>
            </VStack>
          </Flex>
        </CardHeader>
      </Card.Root>

      {/* Tab Navigation */}
      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as "criteria" | "phases")}>
        <Card.Root mb={6}>
          <CardBody>
            <Tabs.List>
              <Tabs.Trigger value="criteria">
                <Icon as={FiTarget} mr={2} />
                Kriterien
              </Tabs.Trigger>
              <Tabs.Trigger value="phases">
                <Icon as={FiLayers} mr={2} />
                Phasen & Regeln
              </Tabs.Trigger>
            </Tabs.List>
          </CardBody>
        </Card.Root>

        <Tabs.Content value="phases">
          <VStack gap={6} align="stretch">
            {/* Phase erstellen */}
            <Card.Root>
              <CardHeader>
                <Flex align="center" gap={3}>
                  <Icon as={FiPlus} color="blue.500" />
                  <Heading size="md">Neue Phase erstellen</Heading>
                </Flex>
              </CardHeader>
              <CardBody>
                <VStack gap={4} align="stretch">
                  <Field.Root>
                    <FieldLabel>Phasenname</FieldLabel>
                    <Input
                      placeholder="z.B. Einführungsphase, Fortgeschrittene Phase..."
                      value={phaseName}
                      onChange={(e) => setPhaseName(e.target.value)}
                    />
                  </Field.Root>
                  <Flex justify="flex-end">
                    <Button 
                      onClick={handlePhaseCreate} 
                      colorScheme="blue"
                      disabled={!phaseName.trim()}
                    >
                      <Icon as={FiPlus} mr={2} />
                      Phase erstellen
                    </Button>
                  </Flex>
                </VStack>
              </CardBody>
            </Card.Root>

            {/* Phasen Liste */}
            <Card.Root>
              <CardHeader>
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={3}>
                    <Icon as={FiLayers} color="purple.500" />
                    <Heading size="md">Phasen-Übersicht</Heading>
                  </Flex>
                  <Badge colorScheme="purple" variant="subtle">
                    {phases.length} Phase{phases.length !== 1 ? 'n' : ''}
                  </Badge>
                </Flex>
              </CardHeader>
              <CardBody>
                {loadingPhases ? (
                  <Flex justify="center" py={8}>
                    <VStack gap={3}>
                      <Spinner size="lg" color="purple.500" />
                      <Text fontSize="sm" color="var(--color-muted)">
                        Lade Phasen...
                      </Text>
                    </VStack>
                  </Flex>
                ) : phases.length === 0 ? (
                  <Flex justify="center" py={8}>
                    <VStack gap={3}>
                      <Icon as={FiLayers} boxSize={12} color="var(--color-muted)" />
                      <Text color="var(--color-muted)" fontWeight="medium">
                        Keine Phasen erstellt
                      </Text>
                      <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                        Erstelle deine erste Phase, um Kundenfortschritte zu strukturieren
                      </Text>
                    </VStack>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    {phases.map((phase: any) => (
                      <Card.Root 
                        key={phase.id} 
                        borderWidth="1px" 
                        borderColor="purple.200"
                        _hover={{ borderColor: "purple.300" }}
                        transition="all 0.2s"
                      >
                        <CardBody>
                          <Flex justify="space-between" align="start" gap={3}>
                            <VStack align="start" gap={1} flex={1}>
                              <Text fontWeight="semibold">{phase.name}</Text>
                              {phase.description && (
                                <Text fontSize="sm" color="var(--color-muted)">
                                  {phase.description}
                                </Text>
                              )}
                            </VStack>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => deletePhase(phase.id)}
                              aria-label="Phase löschen"
                            >
                              <Icon as={FiXCircle} />
                            </IconButton>
                          </Flex>
                        </CardBody>
                      </Card.Root>
                    ))}
                  </SimpleGrid>
                )}
              </CardBody>
            </Card.Root>
            {/* Coach-Regeln */}
            <Card.Root>
              <CardHeader>
                <Flex align="center" gap={3}>
                  <Icon as={FiBookOpen} color="orange.500" />
                  <VStack align="start" gap={0}>
                    <Heading size="md">Coach-Regeln</Heading>
                    <Text fontSize="sm" color="var(--color-muted)">
                      Definiere allgemeine Regeln und Richtlinien für deine Betreuung
                    </Text>
                  </VStack>
                </Flex>
              </CardHeader>
              <CardBody>
                <Form onSubmit={handleRuleSubmit}>
                  <VStack gap={4} align="stretch">
                    <Field.Root>
                      <FieldLabel>Regeln und Richtlinien</FieldLabel>
                      <Textarea
                        placeholder="Beschreibe hier deine allgemeinen Coaching-Regeln, Erwartungen und Richtlinien..."
                        value={rule || ""}
                        onChange={(e) => setRule(e.target.value)}
                        rows={8}
                        bg="var(--color-surface)"
                        borderColor="var(--color-border)"
                      />
                    </Field.Root>
                    <Flex justify="flex-end">
                      <Button 
                        type="submit" 
                        onClick={fetchRequirements}
                        colorScheme="orange"
                        disabled={!rule || !rule.trim()}
                      >
                        <Icon as={FiSettings} mr={2} />
                        Regeln speichern
                      </Button>
                    </Flex>
                  </VStack>
                </Form>
              </CardBody>
            </Card.Root>
          </VStack>
        </Tabs.Content>

        <Tabs.Content value="criteria">
          <VStack gap={6} align="stretch">
            {/* Kriterium erstellen */}
            <Card.Root>
              <CardHeader>
                <Flex align="center" gap={3}>
                  <Icon as={FiPlus} color="green.500" />
                  <Heading size="md">Neues Kriterium erstellen</Heading>
                </Flex>
              </CardHeader>
              <CardBody>
                <Form onSubmit={handleSubmit}>
                  <VStack gap={4} align="stretch">
                    <Field.Root>
                      <FieldLabel>Titel</FieldLabel>
                      <Input
                        placeholder="z.B. Tägliche Bewegung, Ernährungsplan einhalten..."
                        value={title}
                        onChange={(e) => setrequirementTitle(e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root>
                      <FieldLabel>Ausführliche Beschreibung</FieldLabel>
                      <Textarea
                        placeholder="Beschreibe detailliert, was von den Kunden erwartet wird..."
                        value={description}
                        onChange={(e) => setRequirementDescription(e.target.value)}
                        rows={6}
                        bg="var(--color-surface)"
                        borderColor="var(--color-border)"
                      />
                    </Field.Root>
                    <Flex justify="flex-end">
                      <Button 
                        type="submit" 
                        onClick={fetchRequirements}
                        colorScheme="green"
                        disabled={!title.trim() || !description.trim()}
                      >
                        <Icon as={FiPlus} mr={2} />
                        Kriterium erstellen
                      </Button>
                    </Flex>
                  </VStack>
                </Form>
              </CardBody>
            </Card.Root>

            {loading ? (
              <Card.Root>
                <CardBody>
                  <Flex justify="center" py={8}>
                    <VStack gap={3}>
                      <Spinner size="lg" color="green.500" />
                      <Text fontSize="sm" color="var(--color-muted)">
                        Lade Kriterien...
                      </Text>
                    </VStack>
                  </Flex>
                </CardBody>
              </Card.Root>
            ) : (
              <>
                {/* Aktive Kriterien */}
                <Card.Root>
                  <CardHeader>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={3}>
                        <Icon as={FiCheckCircle} color="green.500" />
                        <Heading size="md">Aktive Kriterien</Heading>
                      </Flex>
                      <Badge colorScheme="green" variant="subtle">
                        {activeRequirements.length} aktiv
                      </Badge>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    {activeRequirements.length === 0 ? (
                      <Flex justify="center" py={8}>
                        <VStack gap={3}>
                          <Icon as={FiTarget} boxSize={12} color="var(--color-muted)" />
                          <Text color="var(--color-muted)" fontWeight="medium">
                            Keine aktiven Kriterien
                          </Text>
                          <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                            Erstelle dein erstes Kriterium, um Kundenanforderungen zu definieren
                          </Text>
                        </VStack>
                      </Flex>
                    ) : (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                        {activeRequirements.map((requirement: any, idx: number) => (
                          <RequirementCard
                            requirement={requirement}
                            key={requirement.id || idx}
                          />
                        ))}
                      </SimpleGrid>
                    )}
                  </CardBody>
                </Card.Root>

                {/* Inaktive Kriterien */}
                {inactiveRequirements.length > 0 && (
                  <Card.Root>
                    <CardHeader>
                      <Flex align="center" justify="space-between">
                        <Flex align="center" gap={3}>
                          <Icon as={FiXCircle} color="orange.500" />
                          <Heading size="md">Inaktive Kriterien</Heading>
                        </Flex>
                        <Badge colorScheme="orange" variant="subtle">
                          {inactiveRequirements.length} inaktiv
                        </Badge>
                      </Flex>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                        {inactiveRequirements.map((requirement: any, idx: number) => (
                          <RequirementCard
                            requirement={requirement}
                            key={requirement.id || idx}
                          />
                        ))}
                      </SimpleGrid>
                    </CardBody>
                  </Card.Root>
                )}
              </>
            )}
          </VStack>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}
