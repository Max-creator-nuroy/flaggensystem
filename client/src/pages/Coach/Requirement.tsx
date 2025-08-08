import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Field,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  IconButton,
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsX } from "react-icons/bs";
import { CgCheck } from "react-icons/cg";
import { Form } from "react-router";
import { apiCall } from "@/services/apiCall";

export default function Requirement() {
  const [title, setrequirementTitle] = useState("");
  const [description, setRequirementDescription] = useState("");
  const [rule, setRule] = useState("");
  const token = localStorage.getItem("token");
  const coachId = getUserFromToken(token);
  const [requirementList, setRequirementList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [phaseName, setPhaseName] = useState("");

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
      await fetch(
        `http://localhost:3000/users/getUser/${coachId.id}`,
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
          setRule(data.coachRules);
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

    if (rule != "") {
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

  const RequirementCard = ({ requirement }: { requirement: any }) => (
    <GridItem
      colSpan={{ base: 2, md: 1 }}
      p={4}
      w="100%"
      height="100%"
      borderRadius={1}
      borderWidth={1}
    >
      <Flex justifyContent={"end"}>
        <IconButton onClick={() => deleteRequirement(requirement.id)}>
          <Icon>
            <Icon>{requirement.isDeleted ? <CgCheck /> : <BsX />}</Icon>
          </Icon>
        </IconButton>
      </Flex>
      <Flex flexDir="column" alignItems="center">
        <Text fontWeight="bold">{requirement.title}</Text>
        <Text>{requirement.description}</Text>
      </Flex>
    </GridItem>
  );

  return (
    <Box>
      <Flex flexDirection="column" m={5}>
        <Box mt={8}>
          <Heading size="md" mb={4}>
            Neue Phase erstellen
          </Heading>
          <Input
            placeholder="Phasenname"
            value={phaseName}
            onChange={(e) => setPhaseName(e.target.value)}
          />
          <Flex alignItems="end" flexDirection="column">
            <Button mt={3} onClick={handlePhaseCreate} colorScheme="teal">
              Phase anlegen
            </Button>
          </Flex>
        </Box>
        <Box mt={6}>
          <Heading size="md" mb={3}>
            Phasen Liste
          </Heading>

          {loadingPhases ? (
            <Spinner />
          ) : (
            <Stack>
              {phases.length === 0 && <Text>Keine Phasen vorhanden.</Text>}
              {phases.map((phase: any) => (
                <Box
                  key={phase.id}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg="gray.50"
                  position="relative"
                >
                  <Text fontWeight="bold">{phase.name}</Text>
                  {phase.description && (
                    <Text fontSize="sm">{phase.description}</Text>
                  )}
                  <Flex justifyContent={"end"}>
                    <IconButton onClick={() => deletePhase(phase.id)}>
                      <Icon>
                        <Icon>
                          <BsX />
                        </Icon>
                      </Icon>
                    </IconButton>
                  </Flex>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #ccc",
            margin: "20px 0",
          }}
        />
        <Form onSubmit={handleRuleSubmit}>
          <Flex mt={2} flexDirection="column">
            <Heading>Regeln</Heading>
            <Field.Root mb={3} mt={2}>
              <Textarea
                minWidth="100%"
                minHeight="20vh"
                value={rule}
                onChange={(e) => setRule(e.target.value)}
              />
            </Field.Root>
            <Flex alignItems="end" flexDirection="column">
              <Button type="submit" onClick={fetchRequirements}>
                Speichern
              </Button>
            </Flex>
          </Flex>
        </Form>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #ccc",
            margin: "20px 0",
          }}
        />
        <Form onSubmit={handleSubmit}>
          <Flex flexDirection="column" mt={5}>
            <Heading>Kriterien</Heading>
            <Field.Root mb={3}>
              <FieldLabel>Titel</FieldLabel>
              <Textarea
                maxWidth={{ lg: "50%" }}
                value={title}
                onChange={(e) => setrequirementTitle(e.target.value)}
              />
            </Field.Root>
            <Field.Root mb={3}>
              <FieldLabel>Ausführliche Beschreibung </FieldLabel>
              <Textarea
                minWidth="100%"
                minHeight="20vh"
                value={description}
                onChange={(e) => setRequirementDescription(e.target.value)}
              />
            </Field.Root>
            <Flex alignItems="end" flexDirection="column">
              <Button type="submit" onClick={fetchRequirements}>
                Anlegen
              </Button>
            </Flex>
          </Flex>
        </Form>
        <Flex></Flex>
        {loading ? (
          <Spinner />
        ) : (
          <Flex direction={"column"}>
            <Grid templateColumns="repeat(2, 1fr)" mt={5}>
              {requirementList
                .filter((requirement: any) => requirement.isDeleted == false)
                .map((requirement, idx) => (
                  <RequirementCard requirement={requirement} key={idx} />
                ))}
            </Grid>
            <Text mt={5} fontWeight={"medium"}>
              {" "}
              Inactive Kriterien:
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" mt={5}>
              {requirementList
                .filter((requirement: any) => requirement.isDeleted == true)
                .map((requirement, idx) => (
                  <RequirementCard requirement={requirement} key={idx} />
                ))}
            </Grid>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
