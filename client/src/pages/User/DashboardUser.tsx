import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Stack,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Input,
  Flex,
  VStack,
  Spinner,
  Popover,
  Portal,
  Dialog,
  CloseButton,
  Field,
  Select,
  createListCollection,
  Textarea,
  Switch,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import Moment from "moment";
import { useSearchParams } from "react-router";
import { toaster } from "@/components/ui/toaster";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [videoCheckLoading, setVideoCheckLoading] = useState(false);
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);
  const [userData, setUserData] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [dailyCheckList, setDailCheckList] = useState<any[]>([]);
  const [coach, setCoach] = useState<any>(null);
  const [requirementList, setRequirementList] = useState<any[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [absenceType, setAbsenceType] = useState("");
  const [absenceFrom, setAbsenceFrom] = useState("");
  const [absenceTo, setAbsenceTo] = useState("");
  const [absenceNote, setAbsenceNote] = useState("");
  const [phases, setPhases] = useState([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState();
  const [flagColor, setFlagColor] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isAffiliate, setIsAffiliate] = useState(!!userData?.isAffiliate);
  const [isCustomer, setIsCustomer] = useState(!!userData?.isCustomer);

  const absenceList = createListCollection({
    items: [
      { label: "Urlaub", value: "URLAUB" },
      { label: "Krank", value: "KRANKHEIT" },
      { label: "Sontiges", value: "ANDERES" },
    ],
  });

  const flagColorList = createListCollection({
    items: [
      { label: "Rot", value: "RED" },
      { label: "Gelb", value: "YELLOW" },
      { label: "Grün", value: "GREEN" },
    ],
  });

  useEffect(() => {
    const uid = userIdParam == null ? user.id : userIdParam;

    fetch(`http://localhost:3000/users/getUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((req) => req.json())
      .then((data) => {
        setUserData(data);
        setFlags(data.flags || []);
        setDailCheckList(data.dailyChecks || []);
        setSelectedPhaseId(data.phaseId);
        setIsAffiliate(data.isAffiliate);
        setIsCustomer(data.isCustomer);
      });

    fetch(`http://localhost:3000/users/getCoachByUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((coachData) => {
        setCoach(coachData);

        if (userIdParam) {
          // Phasen vom Coach laden (angenommen coachId liegt vor)
          fetch(`http://localhost:3000/phase/getPhaseByCoach/${coachData.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => setPhases(data.phases || []))
            .catch(() => setPhases([]));
        }

        return fetch(
          `http://localhost:3000/requirement/getRequirementByCoach/${coachData.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      })
      .then((response) => response.json())
      .then((reqData) => {
        setRequirementList(reqData.requirement || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [userIdParam, token]);

  const handleSubmit = async () => {
    if (!videoFile) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      setVideoCheckLoading(true);

      const res = await fetch(
        `http://localhost:3000/dailyCheck/createDailyCheck/${user.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        setVideoCheckLoading(false);
        throw new Error("Fehler beim Erstellen des DailyChecks");
      }

      const result = await res.json();
      console.log("Antwort vom Server:", result);

      setVideoCheckLoading(false);
      // Optional: Daten nachladen
      refreshDailyChecks();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDailyChecks = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    const res = await fetch(`http://localhost:3000/users/getUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setDailCheckList(data.dailyChecks || []);
    setFlags(data.flags || []);
  };

  const now = new Date();

  const currentAbsence = userData?.absences?.find((absence: any) => {
    const from = new Date(absence.from);
    const to = new Date(absence.to);
    return from <= now && to >= now;
  });

  const handleSaveAbsence = async () => {
    try {
      await fetch(`http://localhost:3000/absence/createAbsence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userIdParam,
          type: absenceType,
          from: new Date(absenceFrom),
          to: new Date(absenceTo),
          note: absenceNote,
        }),
      });
    } catch (e) {
      console.error("Fehler beim Erstellen der Abwesenheit:", e);
    }
  };

  if (loading) {
    return (
      <Flex w="100%" h="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  const flagCount = flags.filter((flag: any) => flag.color == "RED").length;
  const guarantee = getGuaranteeStatus(flagCount);

  const leads = userData?.leads ?? [];

  const passedIn7Days = dailyCheckList.slice(0, 7).reduce((acc, dc) => {
    const total = dc.entries.length;
    const passed = dc.entries.filter((e: any) => e.fulfilled).length;
    return acc + (total > 0 && passed === total ? 1 : 0);
  }, 0);

  const handleChangePhase = async (e: any) => {
    const newPhaseId = e.target.value;
    setSelectedPhaseId(newPhaseId);

    try {
      const res = await fetch(
        `http://localhost:3000/users/updateUser/${userIdParam}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phaseId: newPhaseId }),
        }
      );

      if (res.ok) {
        toaster.success({
          title: "Phase geändert",
        });
      } else {
        toaster.error({
          title: "Versuche es erneut",
        });
      }
    } catch {
      alert("Netzwerkfehler beim Ändern der Phase");
    }
  };

  const handleCreateFlag = async () => {
    if (!flagColor) {
      alert("Bitte eine Farbe auswählen");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3000/flags/createManuelFlag/${userIdParam}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ color: flagColor, comment }),
        }
      );

      if (res.ok) {
        toaster.success({
          title: "Flagge erstellt",
        });
        setFlagColor("");
        setComment("");
        window.location.reload();
      } else {
        alert("Fehler beim Erstellen der Flagge");
      }
    } catch {
      alert("Netzwerkfehler");
    }
  };

  const handleAffiliateChange = async (e: any) => {
    const newValue = e.checked;
    setIsAffiliate(newValue);

    try {
      const response = await fetch(
        `http://localhost:3000/users/updateUser/${userData.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAffiliate: newValue }),
        }
      );

      if (!response.ok) {
        throw new Error("Update fehlgeschlagen");
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Affiliate-Status:", error);
    }
  };

  return (
    <Stack>
      <Heading
        mt={5}
        size="lg"
        fontWeight="700"
        mb={4}
        textAlign="center"
        fontFamily="'Georgia', serif"
        letterSpacing="wider"
        color="#2C7A7B"
      >
        {userIdParam == null ? "Willkommen zurück," : "Profil von "}
        {userData?.name}
      </Heading>
      {userIdParam != null ? (
        <Flex justifyContent="center" mb={6}>
          <Flex flexDir={"column"}>
            <Flex>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button colorScheme="blue">Flagge erstellen</Button>
                </Dialog.Trigger>

                <Portal>
                  <Dialog.Backdrop />
                  <Dialog.Positioner>
                    <Dialog.Content>
                      <Dialog.Header>
                        <Dialog.Title>Neue Flagge erstellen</Dialog.Title>
                        <Dialog.CloseTrigger asChild>
                          <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                      </Dialog.Header>

                      <Dialog.Body>
                        <Field.Root>
                          <Field.Label>Farbe</Field.Label>
                          <Select.Root
                            collection={flagColorList}
                            onValueChange={(e: any) => setFlagColor(e.value[0])}
                          >
                            <Select.HiddenSelect />
                            <Select.Control>
                              <Select.Trigger>
                                <Select.ValueText placeholder="Farbe wählen" />
                              </Select.Trigger>
                              <Select.IndicatorGroup>
                                <Select.Indicator />
                              </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                              <Select.Content>
                                {flagColorList.items.map((color: any) => (
                                  <Select.Item item={color} key={color.value}>
                                    {color.label}
                                    <Select.ItemIndicator />
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Select.Root>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>Kommentar</Field.Label>
                          <Textarea
                            placeholder="Kommentar zur Flagge..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                        </Field.Root>
                      </Dialog.Body>

                      <Dialog.Footer>
                        <Dialog.ActionTrigger asChild>
                          <Button variant="outline">Abbrechen</Button>
                        </Dialog.ActionTrigger>
                        <Dialog.ActionTrigger asChild>
                          <Button onClick={handleCreateFlag}>Speichern</Button>
                        </Dialog.ActionTrigger>
                      </Dialog.Footer>

                      <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                      </Dialog.CloseTrigger>
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Portal>
              </Dialog.Root>

              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button colorScheme="blue">Abwesenheit eintragen</Button>
                </Dialog.Trigger>
                <Portal>
                  <Dialog.Backdrop />
                  <Dialog.Positioner>
                    <Dialog.Content>
                      <Dialog.Header>
                        <Dialog.Title>Abwesenheit eintragen</Dialog.Title>
                        <Dialog.CloseTrigger asChild>
                          <CloseButton size="sm" />
                        </Dialog.CloseTrigger>
                      </Dialog.Header>
                      <Dialog.Body>
                        <Field.Root>
                          <Select.Root
                            collection={absenceList}
                            onValueChange={(e: any) => {
                              console.log("CHANGE RAW:", e.value[0]);
                              setAbsenceType(e.value[0]);
                            }}
                          >
                            <Select.HiddenSelect />
                            <Select.Control>
                              <Select.Trigger>
                                <Select.ValueText placeholder="Wähle Abwesenheit" />
                              </Select.Trigger>
                              <Select.IndicatorGroup>
                                <Select.Indicator />
                              </Select.IndicatorGroup>
                            </Select.Control>
                            <Select.Positioner>
                              <Select.Content>
                                {absenceList.items?.map((framework: any) => (
                                  <Select.Item
                                    item={framework}
                                    key={framework.value}
                                  >
                                    {framework.label}
                                    <Select.ItemIndicator />
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Select.Root>
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Von</Field.Label>
                          <Input
                            type="date"
                            value={absenceFrom}
                            onChange={(e) => setAbsenceFrom(e.target.value)}
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Bis</Field.Label>
                          <Input
                            type="date"
                            value={absenceTo}
                            onChange={(e) => setAbsenceTo(e.target.value)}
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Notiz</Field.Label>
                          <Textarea
                            value={absenceNote}
                            onChange={(e) => setAbsenceNote(e.target.value)}
                          />
                        </Field.Root>
                      </Dialog.Body>
                      <Dialog.Footer>
                        <Dialog.ActionTrigger asChild>
                          <Button variant="outline">Abbrechen</Button>
                        </Dialog.ActionTrigger>
                        <Button onClick={handleSaveAbsence}>Speichern</Button>
                      </Dialog.Footer>
                      <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                      </Dialog.CloseTrigger>
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Portal>
              </Dialog.Root>
            </Flex>
            <Card.Root
              bg={currentAbsence ? "yellow.100" : "green.100"}
              border="1px solid"
              borderColor="gray.200"
              mt={2}
            >
              <CardBody>
                {currentAbsence ? (
                  <>
                    <Text>
                      Der Kunde ist aktuell{" "}
                      <strong>{currentAbsence.type}</strong>.
                    </Text>
                    <Text fontSize="sm" mt={1}>
                      Von:{" "}
                      {new Date(currentAbsence.from).toLocaleDateString(
                        "de-DE"
                      )}{" "}
                      <br />
                      Bis:{" "}
                      {new Date(currentAbsence.to).toLocaleDateString("de-DE")}
                    </Text>
                    {currentAbsence.note && (
                      <Text fontSize="sm" mt={1} color="gray.600">
                        Notiz: {currentAbsence.note}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text>Der Kunde ist aktuell nicht abwesend.</Text>
                )}
              </CardBody>
            </Card.Root>
          </Flex>
        </Flex>
      ) : (
        ""
      )}

      {/* Profil, Garantie, Coach */}
      <SimpleGrid columns={{ base: 1, md: 3 }}>
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Profil</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              <b>Name:</b> {userData?.name} {userData?.last_name}
            </Text>
            <Text>
              <b>E-Mail:</b> {userData?.email}
            </Text>
            {userData?.mobileNumber && (
              <Text>
                <b>Telefon:</b> {userData?.mobileNumber}
              </Text>
            )}
            {userIdParam ? (
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
                <Flex align="center" gap={3} mt={4}>
                  <Text fontWeight="bold">Affiliate</Text>
                  <Switch.Root
                    checked={isAffiliate}
                    onCheckedChange={handleAffiliateChange}
                    colorScheme="teal"
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label />
                  </Switch.Root>
                </Flex>
              </div>
            ) : (
              userData?.phase && (
                <Text>
                  <b>Phase:</b> {userData.phase.label || userData.phase.name}
                </Text>
              )
            )}
          </CardBody>
        </Card.Root>

        {isCustomer && (

          <Card.Root shadow={"sm"}>
            <CardHeader>
              <Heading size="md">Status</Heading>
            </CardHeader>
            <CardBody>
              <Badge colorScheme={guarantee.color} fontSize="lg">
                {guarantee.text}
              </Badge>

              <Popover.Root>
                <Popover.Trigger asChild>
                  <Button mt={2} colorScheme="blue">
                    Regeln
                  </Button>
                </Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content maxW="xl">
                      <Popover.Arrow />
                      <Popover.Header fontWeight="bold">Regeln</Popover.Header>
                      <Popover.Body whiteSpace="pre-wrap">
                        {coach.coachRules}
                      </Popover.Body>
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
            </CardBody>
          </Card.Root>
        )}

        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Coach</Heading>
          </CardHeader>
          <CardBody>
            {coach ? (
              <>
                <Text>
                  {coach.name} {coach.last_name}
                </Text>
                <Text>{coach.email}</Text>
              </>
            ) : (
              <Text>Kein Coach zugewiesen</Text>
            )}
          </CardBody>
        </Card.Root>
      </SimpleGrid>
      {/* Video Upload + Kriterien */}
      {userIdParam == null ? (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Video hochladen</Heading>
          </CardHeader>
          <CardBody>
            <Stack spaceX={4}>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />

              {videoCheckLoading == true ? (
                <Flex w="100%" h="100%" align="center" justify="center">
                  <Spinner size="lg" />
                </Flex>
              ) : (
                <Button colorScheme="blue" onClick={handleSubmit}>
                  Absenden
                </Button>
              )}

              <Heading size="sm">Zu beachten:</Heading>
              <VStack align="start">
                {requirementList.length === 0 ? (
                  <Text>Keine Kriterien vorhanden.</Text>
                ) : (
                  requirementList
                    .filter((re: any) => re.isDeleted != true)
                    .map((req) => (
                      <Flex key={req.id} align="center">
                        <FiCheckCircle color="green.500" />
                        <Text>{req.title}</Text>
                      </Flex>
                    ))
                )}
              </VStack>
            </Stack>
          </CardBody>
        </Card.Root>
      ) : (
        ""
      )}

      {isCustomer && (

        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Daily Checks (letzte 7)</Heading>
          </CardHeader>
          <CardBody>
            {dailyCheckList.length === 0 ? (
              <Text>Keine Daily Checks vorhanden.</Text>
            ) : (
              <>
                <Text mb={3}>
                  Vollständig bestanden: <b>{passedIn7Days}</b> /{" "}
                  {Math.min(7, dailyCheckList.length)}
                </Text>
                <VStack align="start" spaceX={2}>
                  {dailyCheckList.slice(0, 7).map((dc) => (
                    <Flex key={dc.id} justify="space-between" w="100%">
                      <Text>{new Date(dc.date).toLocaleDateString("de-DE")}</Text>
                      <Text>
                        {dc.entries.filter((e: any) => e.fulfilled).length} /{" "}
                        {dc.entries.length}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              </>
            )}
          </CardBody>
        </Card.Root>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Flaggen</Heading>
          </CardHeader>
          <SimpleGrid columns={[1, 2]}>
            {flags
              .filter((f) => f.color !== "GREEN" && f.escalatedTo.length == 0)
              .map((flag) => (
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <Card.Root
                      key={flag.id}
                      p={3}
                      m={1}
                      bg={getFlagColor(flag.color)}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedFlag(flag); // Nur speichern
                      }}
                    >
                      <Text>{flag.color == "YELLOW" ? "Gelb" : "Rot"}</Text>
                      <Text fontSize="sm">
                        {Moment(flag.createdAt).format("DD.MM.YYYY")}
                      </Text>
                    </Card.Root>
                  </Dialog.Trigger>

                  <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>Flagge</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                          {selectedFlag && (
                            <>
                              {selectedFlag.escalatedFrom.length == 0 ? (
                                <Text>{selectedFlag.comment}</Text>
                              ) : (
                                collectRequirementsAndComments(
                                  selectedFlag
                                ).map((entry, i) => (
                                  <Flex key={i} direction="column" mb={3}>
                                    {entry.title != undefined ? (
                                      <>
                                        <Text fontWeight="medium">
                                          {entry.title}
                                        </Text>
                                        <Text fontSize="sm" color="gray.500">
                                          {Moment(entry.date).format(
                                            "DD.MM.YYYY"
                                          )}
                                        </Text>
                                      </>
                                    ) : (
                                      entry.comment && (
                                        <>
                                          <Text mt={1}>{entry.comment}</Text>
                                          <Text fontSize="sm" color="gray.500">
                                            {Moment(entry.date).format(
                                              "DD.MM.YYYY"
                                            )}
                                          </Text>
                                        </>
                                      )
                                    )}
                                  </Flex>
                                ))
                              )}
                            </>
                          )}
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Dialog.CloseTrigger asChild>
                            <Button>Schließen</Button>
                          </Dialog.CloseTrigger>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Positioner>
                  </Portal>
                </Dialog.Root>
              ))}
          </SimpleGrid>
        </Card.Root>
      )}

      {/* Affiliate */}
      {isAffiliate && (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Affiliate – Leads</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              <b>Gesamt:</b> {leads.length}
            </Text>
            {leads.length === 0 ? (
              <Text>Keine Leads vorhanden.</Text>
            ) : (
              <VStack align="start" spaceX={2}>
                {leads.map((l: any) => (
                  <Flex key={l.id} justify="space-between" w="100%">
                    <Text>{l.name}</Text>
                    <Badge colorScheme={l.closed ? "green" : "yellow"}>
                      {l.closed ? "Closed" : l.stage?.name ?? "—"}
                    </Badge>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card.Root>
      )}
    </Stack>
  );
}

function getGuaranteeStatus(flagCount: number) {
  if (flagCount >= 10) return { text: "❌ Garantie verloren", color: "red" };
  if (flagCount >= 5) return { text: "⚠️ Garantie gefährdet", color: "orange" };
  return { text: "✅ Garantie aktiv", color: "green" };
}
const getFlagColor = (color: string) => {
  switch (color) {
    case "RED":
      return "red.100";
    case "YELLOW":
      return "yellow.100";
    default:
      return "gray.100";
  }
};

type ReqAndComment = {
  title?: string; // für Requirement-Titel (optional, da manuelle Flags keinen haben)
  date?: string; // Datum des Requirements oder der Flag
  comment?: string; // Kommentar, falls vorhanden
};
function collectRequirementsAndComments(flag: any): ReqAndComment[] {
  if (!flag) return [];

  // Wenn keine Eltern-Flaggen, also nicht eskaliert, dann nur Kommentar (falls vorhanden)
  if (!flag.escalatedFrom || flag.escalatedFrom.length === 0) {
    if (flag.comment) {
      return [{ comment: flag.comment, date: flag.createdAt }];
    }
    // Falls kein Kommentar, aber vielleicht ein Requirement (selten?), dann auch zeigen
    if (flag.requirement) {
      return [{ title: flag.requirement.title, date: flag.createdAt }];
    }
    return [];
  }

  // Wenn eskaliert, dann rekursiv die Eltern-Flags abfragen (Requirements sammeln)
  return (flag.escalatedFrom || []).flatMap((link: any) =>
    collectRequirementsAndComments(link.fromFlag)
  );
}
