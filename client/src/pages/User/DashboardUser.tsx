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
  Icon,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiCheckCircle, FiFlag, FiShield, FiTrendingUp, FiUser, FiVideo, FiCalendar } from "react-icons/fi";
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
  // --- New state for DailyCheck list & details dialog ---
  const [dcListOpen, setDcListOpen] = useState(false);
  const [dcListLoading, setDcListLoading] = useState(false);
  const [dcList, setDcList] = useState<any[]>([]);
  const [dcSelected, setDcSelected] = useState<any | null>(null);
  const [dcDetailLoading, setDcDetailLoading] = useState(false);
  const [dcDetail, setDcDetail] = useState<any | null>(null);
  const [videoReqLoading, setVideoReqLoading] = useState(false);
  const [absenceRequests, setAbsenceRequests] = useState<any[]>([]);
  const [absenceReqLoading, setAbsenceReqLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [newCallNotes, setNewCallNotes] = useState("");
  const [newPlanNotes, setNewPlanNotes] = useState("");
  const loadJournal = async () => {
    if (!userIdParam || (user?.role !== 'COACH' && user?.role !== 'ADMIN')) return;
    try {
      setJournalLoading(true);
      const res = await fetch(`http://localhost:3000/users/journal/${userIdParam}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? await res.json() : [];
      setJournalEntries(data);
    } catch {
      setJournalEntries([]);
    } finally {
      setJournalLoading(false);
    }
  };
  const loadAbsenceRequests = async () => {
    if (userIdParam || user?.role !== 'CUSTOMER') return;
    try {
      setAbsenceReqLoading(true);
      const res = await fetch(`http://localhost:3000/absence/request/me`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setAbsenceRequests([]);
        return;
      }
      const list = await res.json();
      setAbsenceRequests(list || []);
    } catch {
      setAbsenceRequests([]);
    } finally {
      setAbsenceReqLoading(false);
    }
  };

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

        // removed unused requirement fetch
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });

    // Eigene Abwesenheits-Anfragen (nur wenn eigener User und Rolle CUSTOMER)
  loadAbsenceRequests();
  loadJournal();
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

  // --- DailyChecks list & details handlers ---
  const openDailyChecksDialog = async () => {
    setDcListOpen(true);
    toaster.info({ title: "Lade Daily Checks…" });
    await loadDailyCheckList();
  };

  const loadDailyCheckList = async () => {
    try {
      setDcListLoading(true);
      const uid = userIdParam == null ? user.id : userIdParam;
      const res = await fetch(
        `http://localhost:3000/dailyCheck/listWithViolations/${uid}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 403) {
          toaster.error({ title: "Keine Berechtigung" });
        } else {
          toaster.error({ title: "Laden fehlgeschlagen" });
        }
        setDcListLoading(false);
        return;
      }
      const list = await res.json();
      setDcList(list || []);
      setDcListLoading(false);
      // Preselect first
      if (list && list.length > 0) {
        selectDailyCheck(list[0]);
      } else {
        setDcSelected(null);
        setDcDetail(null);
      }
    } catch (e) {
      console.error(e);
      setDcListLoading(false);
    }
  };

  const selectDailyCheck = async (item: any) => {
    setDcSelected(item);
    setDcDetail(null);
    setDcDetailLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/dailyCheck/violations/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const detail = await res.json();
      setDcDetail(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDcDetailLoading(false);
    }
  };

  const handleRequestVideo = async (dailyCheckId: string) => {
    try {
      setVideoReqLoading(true);
      const res = await fetch(
        `http://localhost:3000/dailyCheck/video/request/${dailyCheckId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.status === "HOT") {
          toaster.success({ title: "Video bereit (Hot)" });
          // Direkt herunterladen
          handleDownload(dailyCheckId);
        } else if (data.status === "READY") {
          toaster.success({ title: "Video wiederhergestellt" });
          handleDownload(dailyCheckId);
        } else {
          toaster.info({ title: "Wiederherstellung angefragt" });
        }
        // Refresh list item state
        await loadDailyCheckList();
      } else if (res.status === 202) {
        toaster.info({ title: "Wiederherstellung angefragt" });
      } else {
        toaster.error({ title: "Anfrage fehlgeschlagen" });
      }
    } catch (e) {
      console.error(e);
      toaster.error({ title: "Anfrage fehlgeschlagen" });
    } finally {
      setVideoReqLoading(false);
    }
  };

  const handleDownload = (dailyCheckId: string) => {
    // Browser-Download/Redirect auslösen
    window.location.href = `http://localhost:3000/dailyCheck/video/download/${dailyCheckId}`;
  };

  // NEW: Admin toggle enable/disable customer
  const toggleCustomerStatus = async () => {
    if (!userIdParam || user?.role !== "ADMIN") return;
    const endpoint = userData?.isDeleted ? "enableCustomer" : "disableCustomer";
    try {
      const res = await fetch(`http://localhost:3000/users/${endpoint}/${userIdParam}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUserData((prev: any) => ({ ...prev, isDeleted: !prev.isDeleted }));
        toaster.success({ title: userData?.isDeleted ? "Kunde aktiviert" : "Kunde deaktiviert" });
      } else {
        toaster.error({ title: "Aktion fehlgeschlagen" });
      }
    } catch (e) {
      toaster.error({ title: "Netzwerkfehler" });
    }
  };

  // NEW: Create manual flag
  const handleCreateFlag = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    if (!flagColor) {
      toaster.error({ title: "Bitte eine Farbe wählen" });
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/flags/createManuelFlag/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ color: flagColor, comment }),
      });
      if (res.ok) {
        toaster.success({ title: "Flagge erstellt" });
        setComment("");
        setFlagColor("");
        await refreshDailyChecks();
      } else {
        toaster.error({ title: "Erstellen fehlgeschlagen" });
      }
    } catch (e) {
      toaster.error({ title: "Netzwerkfehler" });
    }
  };

  // NEW: Phase change (admin view on customer profile)
  const handleChangePhase = async (e: any) => {
    const phaseId = e?.target?.value || null;
    setSelectedPhaseId(phaseId);
    if (!userIdParam) return;
    try {
      const res = await fetch(`http://localhost:3000/users/updateUser/${userIdParam}` , {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phaseId }),
      });
      if (res.ok) {
        toaster.success({ title: "Phase aktualisiert" });
      } else {
        toaster.error({ title: "Phase konnte nicht aktualisiert werden" });
      }
    } catch (e) {
      toaster.error({ title: "Netzwerkfehler" });
    }
  };

  // NEW: Affiliate toggle
  const handleAffiliateChange = async (e: any) => {
    const checked = e?.checked ?? e?.target?.checked ?? !!e;
    setIsAffiliate(checked);
    if (!userIdParam) return;
    try {
      const res = await fetch(`http://localhost:3000/users/updateUser/${userIdParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAffiliate: checked }),
      });
      if (!res.ok) {
        toaster.error({ title: "Aktualisierung fehlgeschlagen" });
        setIsAffiliate(!checked);
      }
    } catch (e) {
      toaster.error({ title: "Netzwerkfehler" });
      setIsAffiliate(!checked);
    }
  };

  // NEW: Save absence handler
  const handleSaveAbsence = async () => {
    try {
      const res = await fetch(`http://localhost:3000/absence/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: absenceType,
          from: absenceFrom ? new Date(absenceFrom) : null,
          to: absenceTo ? new Date(absenceTo) : null,
          note: absenceNote,
        }),
      });
      if (res.ok) {
        toaster.success({ title: "Anfrage gesendet" });
        setAbsenceType("");
        setAbsenceFrom("");
        setAbsenceTo("");
        setAbsenceNote("");
  loadAbsenceRequests();
      } else {
  const msg = await res.json().catch(()=>({message:'Anfrage fehlgeschlagen'}));
  toaster.error({ title: msg.message || "Anfrage fehlgeschlagen" });
      }
    } catch (e) {
      console.error("Fehler beim Senden der Anfrage:", e);
      toaster.error({ title: "Netzwerkfehler" });
    }
  };

  const now = new Date();
  const currentAbsence = userData?.absences?.find((a: any) => new Date(a.from) <= now && new Date(a.to) >= now);

  // keep loading guard
  if (loading) {
    return (
      <Flex w="100%" h="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  const flagCount = flags.filter((flag: any) => flag.color === "RED").length;
  const guarantee = getGuaranteeStatus(flagCount);
  const passedIn7Days = dailyCheckList.slice(0, 7).reduce((acc, dc) => {
    const total = dc.entries.length;
    const passed = dc.entries.filter((e: any) => e.fulfilled).length;
    return acc + (total > 0 && passed === total ? 1 : 0);
  }, 0);

  return (
    <Stack>
      {/* Hero */}
      <Flex
        direction="column"
        gap={3}
        p={{ base: 5, md: 8 }}
        rounded="xl"
        bgGradient="linear(to-r, teal.500, teal.600)"
        color="white"
      >
        <Heading size="lg" fontWeight="800">
          {userIdParam == null ? "Willkommen zurück," : "Profil von "} {userData?.name}
          {userData?.isDeleted && (
            <Badge
              ml={3}
              bg="var(--color-surface)"
              color="var(--color-text)"
              borderWidth="1px"
              borderColor="var(--color-border)"
              borderLeftWidth="4px"
              borderLeftColor="red.600"
              rounded="md"
            >
              Deaktiviert
            </Badge>
          )}
          {currentAbsence && (
            <Badge
              ml={3}
              bg="var(--color-surface)"
              color="var(--color-text)"
              borderWidth="1px"
              borderColor="var(--color-border)"
              borderLeftWidth="4px"
              borderLeftColor="yellow.500"
              rounded="md"
            >
              Abwesend: {currentAbsence.type}
            </Badge>
          )}
        </Heading>
        <Flex wrap="wrap" gap={3} align="center">
          {isCustomer && (
            <Badge
              bg="var(--color-surface)"
              color="var(--color-text)"
              borderWidth="1px"
              borderColor="var(--color-border)"
              borderLeftWidth="4px"
              borderLeftColor={`${guarantee.color}.500`}
              rounded="md"
            >
              {guarantee.text}
            </Badge>
          )}
          {userData?.phase && !userIdParam && (
            <Badge
              bg="var(--color-surface)"
              color="var(--color-text)"
              borderWidth="1px"
              borderColor="var(--color-border)"
              borderLeftWidth="4px"
              borderLeftColor="blue.500"
              rounded="md"
            >Phase: {userData.phase.label || userData.phase.name}</Badge>
          )}
          {coach && (
            <Badge
              bg="var(--color-surface)"
              color="var(--color-text)"
              borderWidth="1px"
              borderColor="var(--color-border)"
              borderLeftWidth="4px"
              borderLeftColor="gray.500"
              rounded="md"
            >
              Coach: {coach.name} {coach.last_name}
            </Badge>
          )}
          {user?.role === "ADMIN" && userIdParam && (
            <Button
              size="sm"
              colorScheme={userData?.isDeleted ? "green" : "red"}
              variant="outline"
              onClick={toggleCustomerStatus}
            >
              {userData?.isDeleted ? "Kunde aktivieren" : "Kunde deaktivieren"}
            </Button>
          )}
        </Flex>
        <Flex gap={3} wrap="wrap" mt={1}>
          {user?.role !== 'ADMIN' && (
            <>
              <Button onClick={() => document.getElementById("video-upload")?.click()}>
                <Icon as={FiVideo} mr={2} /> Video hochladen
              </Button>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0] || null;
                  setVideoFile(file as any);
                }}
                style={{ display: "none" }}
              />
            </>
          )}

          <Button variant="outline" onClick={openDailyChecksDialog}>
            <Icon as={FiCalendar} mr={2} /> Daily Checks ansehen
          </Button>

          {userIdParam && user?.role !== 'CUSTOMER' && (
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="outline"><Icon as={FiShield} mr={2} /> Tagebuch</Button>
              </Dialog.Trigger>
              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content maxW="3xl" bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                    <Dialog.Header>
                      <Dialog.Title>Tagebuch</Dialog.Title>
                      <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
                    </Dialog.Header>
                    <Dialog.Body>
                      <VStack align="stretch" gap={4} maxH="70vh" overflowY="auto">
                        {(user?.role === 'COACH' || user?.role === 'ADMIN') && (
                          <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                            <Heading size="xs" mb={2}>Neuer Eintrag</Heading>
                            <Field.Root mb={2}>
                              <Field.Label>Was wurde im Call besprochen?</Field.Label>
                              <Textarea value={newCallNotes} onChange={e=> setNewCallNotes(e.target.value)} placeholder="Call Notizen" />
                            </Field.Root>
                            <Field.Root mb={2}>
                              <Field.Label>Geplanter nächster Schritt / Plan</Field.Label>
                              <Textarea value={newPlanNotes} onChange={e=> setNewPlanNotes(e.target.value)} placeholder="Plan" />
                            </Field.Root>
                            <Button size="sm" onClick={async ()=> {
                              if(!newCallNotes.trim() || !newPlanNotes.trim()) { toaster.error({ title: 'Beide Felder ausfüllen' }); return; }
                              const res = await fetch(`http://localhost:3000/users/journal/${userIdParam}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ callNotes: newCallNotes, planNotes: newPlanNotes })
                              });
                              if(res.ok){
                                toaster.success({ title: 'Eintrag erstellt' });
                                setNewCallNotes(''); setNewPlanNotes('');
                                loadJournal();
                              } else {
                                toaster.error({ title: 'Fehler beim Erstellen' });
                              }
                            }}>Speichern</Button>
                          </Card.Root>
                        )}
                        {journalLoading && <Flex align="center" justify="center" py={6}><Spinner size="sm" /></Flex>}
                        {!journalLoading && journalEntries.length === 0 && <Text fontSize="sm" color="var(--color-muted)">Keine Einträge</Text>}
                        {!journalLoading && journalEntries.length > 0 && (
                          <VStack align="stretch" gap={3}>
                            {journalEntries.map((j:any) => (
                              <Card.Root key={j.id} p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                <Flex align="center" gap={2} mb={2} wrap="wrap">
                                  <Heading size="xs">Eintrag</Heading>
                                  <Badge bg="var(--color-surface)" color="var(--color-text)" borderWidth="1px" borderColor="var(--color-border)" borderLeftWidth="4px" borderLeftColor="teal.500">{new Date(j.createdAt).toLocaleDateString('de-DE')}</Badge>
                                </Flex>
                                <Text fontSize="xs" fontWeight="bold" color="var(--color-muted)">Call</Text>
                                <Text fontSize="sm" whiteSpace="pre-wrap" mb={2}>{j.callNotes}</Text>
                                <Text fontSize="xs" fontWeight="bold" color="var(--color-muted)">Plan</Text>
                                <Text fontSize="sm" whiteSpace="pre-wrap">{j.planNotes}</Text>
                              </Card.Root>
                            ))}
                          </VStack>
                        )}
                      </VStack>
                    </Dialog.Body>
                    <Dialog.Footer>
                      <Dialog.CloseTrigger asChild><Button>Schließen</Button></Dialog.CloseTrigger>
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          )}

          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button variant="outline"><Icon as={FiFlag} mr={2} /> Flagge erstellen</Button>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                  <Dialog.Header>
                    <Dialog.Title>Neue Flagge erstellen</Dialog.Title>
                    <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
                  </Dialog.Header>
                  <Dialog.Body>
                    <Field.Root>
                      <Field.Label>Farbe</Field.Label>
                      <Select.Root collection={flagColorList} onValueChange={(e: any) => setFlagColor(e.value[0])}>
                        <Select.HiddenSelect />
                        <Select.Control bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)" rounded="md">
                          <Select.Trigger>
                            <Select.ValueText placeholder="Farbe wählen" />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Select.Positioner>
                          <Select.Content bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                            {flagColorList.items.map((color: any) => (
                              <Select.Item item={color} key={color.value} _hover={{ bg: "rgba(255,255,255,0.06)" }} _highlighted={{ bg: "rgba(255,255,255,0.08)" }}>
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
                      <Textarea placeholder="Kommentar zur Flagge..." value={comment} onChange={(e) => setComment(e.target.value)} />
                    </Field.Root>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild><Button variant="outline">Abbrechen</Button></Dialog.ActionTrigger>
                    <Dialog.ActionTrigger asChild><Button onClick={handleCreateFlag}>Speichern</Button></Dialog.ActionTrigger>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>

          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button variant="outline"><Icon as={FiShield} mr={2} /> Abwesenheit eintragen</Button>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                  <Dialog.Header>
                    <Dialog.Title>Abwesenheit eintragen</Dialog.Title>
                    <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
                  </Dialog.Header>
                  <Dialog.Body>
                    <Field.Root>
                      <Select.Root collection={absenceList} onValueChange={(e: any) => setAbsenceType(e.value[0])}>
                        <Select.HiddenSelect />
                        <Select.Control bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)" rounded="md">
                          <Select.Trigger>
                            <Select.ValueText placeholder="Wähle Abwesenheit" />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Select.Positioner>
                          <Select.Content bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                            {absenceList.items?.map((fw: any) => (
                              <Select.Item item={fw} key={fw.value} _hover={{ bg: "rgba(255,255,255,0.06)" }} _highlighted={{ bg: "rgba(255,255,255,0.08)" }}>
                                {fw.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Select.Root>
                    </Field.Root>
                    <Field.Root><Field.Label>Von</Field.Label><Input type="date" value={absenceFrom} onChange={(e) => setAbsenceFrom(e.target.value)} /></Field.Root>
                    <Field.Root><Field.Label>Bis</Field.Label><Input type="date" value={absenceTo} onChange={(e) => setAbsenceTo(e.target.value)} /></Field.Root>
                    <Field.Root><Field.Label>Notiz</Field.Label><Textarea value={absenceNote} onChange={(e) => setAbsenceNote(e.target.value)} /></Field.Root>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild><Button variant="outline">Abbrechen</Button></Dialog.ActionTrigger>
                    <Button onClick={handleSaveAbsence}>Senden</Button>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
        </Flex>
      </Flex>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4} mt={4}>
        <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)"><CardBody><Flex align="center" justify="space-between"><Flex direction="column"><Text fontSize="sm" color="var(--color-muted)">Bestandene Daily Checks (7d)</Text><Heading size="lg">{passedIn7Days}</Heading></Flex><Icon as={FiTrendingUp} color="teal.500" boxSize={6} /></Flex></CardBody></Card.Root>
        <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)"><CardBody><Flex align="center" justify="space-between"><Flex direction="column"><Text fontSize="sm" color="var(--color-muted)">Rote Flaggen</Text><Heading size="lg">{flagCount}</Heading></Flex><Icon as={FiFlag} color="red.500" boxSize={6} /></Flex></CardBody></Card.Root>
        <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)"><CardBody><Flex align="center" justify="space-between"><Flex direction="column"><Text fontSize="sm" color="var(--color-muted)">Coach</Text><Heading size="md">{coach ? `${coach.name} ${coach.last_name}` : "—"}</Heading></Flex><Icon as={FiUser} color="gray.500" boxSize={6} /></Flex></CardBody></Card.Root>
        <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)"><CardBody><Flex align="center" justify="space-between"><Flex direction="column"><Text fontSize="sm" color="var(--color-muted)">Phase</Text><Heading size="md">{userData?.phase?.label || userData?.phase?.name || (userIdParam ? "wählbar unten" : "—")}</Heading></Flex><Icon as={FiShield} color="purple.500" boxSize={6} /></Flex></CardBody></Card.Root>
      </SimpleGrid>

      {/* Main */}
      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4} mt={4}>
        <VStack align="stretch" gap={4} gridColumn={{ xl: "span 2" }}>
          {user?.role === 'CUSTOMER' && !userIdParam && (
            <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
              <CardHeader><Heading size="md">Urlaubs / Krank-Anfragen</Heading></CardHeader>
              <CardBody>
                {absenceReqLoading && (
                  <Flex align="center" justify="center" py={6}><Spinner size="sm" /></Flex>
                )}
                {!absenceReqLoading && absenceRequests.length === 0 && (
                  <Text fontSize="sm" color="var(--color-muted)">Keine Anfragen gesendet.</Text>
                )}
                {!absenceReqLoading && absenceRequests.length > 0 && (
                  <VStack align="stretch" gap={3}>
                    {absenceRequests.slice(0,6).map((r:any) => {
                      const stateBadge = r.accepted == null ? { text: 'Offen', color: 'yellow.500' } : r.accepted ? { text: 'Akzeptiert', color: 'green.500' } : { text: 'Abgelehnt', color: 'red.500' };
                      return (
                        <Flex key={r.id} direction="column" p={3} borderWidth="1px" borderColor="var(--color-border)" rounded="md" gap={1}>
                          <Flex align="center" gap={2} wrap="wrap">
                            <Heading size="xs">{r.type === 'URLAUB' ? 'Urlaub' : r.type === 'KRANKHEIT' ? 'Krank' : 'Anfrage'}</Heading>
                            <Badge bg="var(--color-surface)" color="var(--color-text)" borderWidth="1px" borderColor="var(--color-border)" borderLeftWidth="4px" borderLeftColor={stateBadge.color}>{stateBadge.text}</Badge>
                            <Text fontSize="xs" ml="auto" color="var(--color-muted)">{new Date(r.createdAt).toLocaleDateString('de-DE')}</Text>
                          </Flex>
                          <Text fontSize="sm"><b>Von:</b> {new Date(r.from).toLocaleDateString('de-DE')} <b>Bis:</b> {new Date(r.to).toLocaleDateString('de-DE')}</Text>
                          {r.note && <Text fontSize="xs" color="var(--color-muted)" whiteSpace="pre-wrap">{r.note}</Text>}
                        </Flex>
                      );
                    })}
                  </VStack>
                )}
              </CardBody>
            </Card.Root>
          )}
          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardHeader><Heading size="md">Deine Aktivität (Daily Checks)</Heading></CardHeader>
            <CardBody>
              {dailyCheckList.length === 0 ? (
                <Text>Keine Daily Checks vorhanden.</Text>
              ) : (
                <VStack align="stretch" gap={3}>
                  {dailyCheckList.slice(0, 10).map((dc) => (
                    <Flex key={dc.id} justify="space-between" p={2} borderWidth="1px" borderColor="var(--color-border)" rounded="md">
                      <Text>{new Date(dc.date).toLocaleDateString("de-DE")}</Text>
                      <Text>{dc.entries.filter((e: any) => e.fulfilled).length} / {dc.entries.length}</Text>
                    </Flex>
                  ))}
                  <Button variant="outline" onClick={openDailyChecksDialog}>Alle ansehen</Button>
                </VStack>
              )}
            </CardBody>
          </Card.Root>

          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardHeader><Heading size="md">Flaggen</Heading></CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                {flags
                  .filter((f) => f.color !== "GREEN" && f.escalatedTo.length == 0)
                  .map((flag) => {
                    const accent = flag.color === "RED" ? "red.500" : "yellow.500";
                    const iconBg = "rgba(255,255,255,0.06)";
                    const iconColor = flag.color === "RED" ? "red.600" : "yellow.600";
                    const label = flag.color === "YELLOW" ? "Gelbe Flagge" : "Rote Flagge";
                    const preview = flag.comment || flag.requirement?.title || "";
                    return (
                      <Dialog.Root key={flag.id}>
                        <Dialog.Trigger asChild>
                          <Card.Root
                            p={3}
                            borderWidth="1px"
                            borderLeftWidth="4px"
                            borderLeftColor={accent}
                            cursor="pointer"
                            transition="all 0.2s"
                            bg="var(--color-surface)"
                            borderColor="var(--color-border)"
                            _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
                            onClick={() => setSelectedFlag(flag)}
                          >
                            <Flex align="center" justify="space-between" gap={3}>
                              <Flex align="center" gap={3}>
                                <Flex align="center" justify="center" w="9" h="9" rounded="full" bg={iconBg}>
                                  <Icon as={FiFlag} color={iconColor} />
                                </Flex>
                                <VStack align="start" gap={0}>
                                  <Text fontWeight="semibold">{label}</Text>
                                  <Text fontSize="xs" color="var(--color-muted)">
                                    {Moment(flag.createdAt).format("DD.MM.YYYY")} · {preview || "—"}
                                  </Text>
                                </VStack>
                              </Flex>
                            </Flex>
                          </Card.Root>
                        </Dialog.Trigger>

                        <Portal>
                          <Dialog.Backdrop />
                          <Dialog.Positioner>
                            <Dialog.Content bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                              <Dialog.Header>
                                <Dialog.Title>Flagge</Dialog.Title>
                              </Dialog.Header>
                              <Dialog.Body>
                                {selectedFlag && (
                                  <VStack align="stretch" gap={4}>
                                    <Flex align="center" gap={3}>
                                      <Flex w="8" h="8" align="center" justify="center" rounded="full" bg="rgba(255,255,255,0.06)">
                                        <Icon as={FiFlag} color={selectedFlag.color === "RED" ? "red.600" : "yellow.600"} />
                                      </Flex>
                                      <Heading size="sm">{selectedFlag.color === "RED" ? "Rote Flagge" : "Gelbe Flagge"}</Heading>
                                      <Badge
                                        ml="auto"
                                        bg="var(--color-surface)"
                                        color="var(--color-text)"
                                        borderWidth="1px"
                                        borderColor="var(--color-border)"
                                        borderLeftWidth="4px"
                                        borderLeftColor={selectedFlag.color === "RED" ? "red.600" : "yellow.600"}
                                        rounded="md"
                                      >
                                        {Moment(selectedFlag.createdAt).format("DD.MM.YYYY")}
                                      </Badge>
                                    </Flex>

                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                      <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                        <Text fontSize="xs" color="gray.500">Farbe</Text>
                                        <Text fontWeight="medium">{selectedFlag.color === "RED" ? "Rot" : "Gelb"}</Text>
                                      </Card.Root>
                                      <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                        <Text fontSize="xs" color="gray.500">Eskalationen</Text>
                                        <Text fontWeight="medium">Von: {selectedFlag.escalatedFrom?.length || 0} · Zu: {selectedFlag.escalatedTo?.length || 0}</Text>
                                      </Card.Root>
                                      {selectedFlag.requirement?.title && (
                                        <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                          <Text fontSize="xs" color="gray.500">Kriterium</Text>
                                          <Text fontWeight="medium">{selectedFlag.requirement.title}</Text>
                                        </Card.Root>
                                      )}
                                    </SimpleGrid>

                                    {selectedFlag.escalatedFrom.length === 0 ? (
                                      <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                        <Text fontWeight="medium" mb={1}>Kommentar</Text>
                                        <Text>{selectedFlag.comment || "—"}</Text>
                                      </Card.Root>
                                    ) : (
                                      <Card.Root p={3} bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                                        <Text fontWeight="medium" mb={2}>Verlauf</Text>
                                        <VStack align="stretch" gap={2}>
                                          {collectRequirementsAndComments(selectedFlag).map((entry: ReqAndComment, i: number) => (
                                            <Flex key={i} direction="column" p={2} borderWidth="1px" borderColor="var(--color-border)" borderRadius="md">
                                              {entry.title ? (
                                                <Text fontWeight="medium">{entry.title}</Text>
                                              ) : (
                                                entry.comment && <Text>{entry.comment}</Text>
                                              )}
                                              <Text fontSize="sm" color="var(--color-muted)">{Moment(entry.date).format("DD.MM.YYYY")}</Text>
                                            </Flex>
                                          ))}
                                        </VStack>
                                      </Card.Root>
                                    )}
                                  </VStack>
                                )}
                              </Dialog.Body>
                              <Dialog.Footer>
                                {user?.role === "ADMIN" && selectedFlag?.id === flag.id && (
                                  <Button
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={async () => {
                                      const confirm = window.confirm("Bist du dir sicher diese Flagge zu löschen?");
                                      if (!confirm) return;
                                      try {
                                        const res = await fetch(`http://localhost:3000/flags/deleteCascade/${flag.id}` , { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                        if (res.ok) {
                                          toaster.success({ title: "Flagge gelöscht" });
                                          await refreshDailyChecks();
                                          setSelectedFlag(null);
                                        } else {
                                          toaster.error({ title: "Löschen fehlgeschlagen" });
                                        }
                                      } catch (e) {
                                        toaster.error({ title: "Netzwerkfehler beim Löschen" });
                                      }
                                    }}
                                  >
                                    Löschen
                                  </Button>
                                )}
                                <Dialog.CloseTrigger asChild><Button>Schließen</Button></Dialog.CloseTrigger>
                              </Dialog.Footer>
                            </Dialog.Content>
                          </Dialog.Positioner>
                        </Portal>
                      </Dialog.Root>
                    );
                  })}
              </SimpleGrid>
            </CardBody>
          </Card.Root>
        </VStack>

        <VStack align="stretch" gap={4}>
          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardHeader><Heading size="md">Profil</Heading></CardHeader>
            <CardBody>
              <Text><b>Name:</b> {userData?.name} {userData?.last_name}</Text>
              <Text><b>E-Mail:</b> {userData?.email}</Text>
              {userData?.mobileNumber && <Text><b>Telefon:</b> {userData?.mobileNumber}</Text>}
              {userIdParam ? (
                <>
                  <Flex mt={3} gap={2} align="center">
                    <Text fontWeight="bold">Phase</Text>
                    <select value={selectedPhaseId} onChange={handleChangePhase} style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: "inherit"
                    }}>
                      <option value="">Keine Phase</option>
                      {phases.map((phase: any) => (
                        <option key={phase.id} value={phase.id}>{phase.label || phase.name}</option>
                      ))}
                    </select>
                  </Flex>
                  <Flex align="center" gap={3} mt={4}>
                    <Text fontWeight="bold">Affiliate</Text>
                    <Switch.Root checked={isAffiliate} onCheckedChange={handleAffiliateChange} colorScheme="teal" size="md">
                      <Switch.HiddenInput />
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                      <Switch.Label />
                    </Switch.Root>
                  </Flex>
                </>
              ) : null}
            </CardBody>
          </Card.Root>

          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardHeader><Heading size="md">Coach & Regeln</Heading></CardHeader>
            <CardBody>
              {coach ? (
                <>
                  <Text fontWeight="bold">{coach.name} {coach.last_name}</Text>
                  <Text mb={3}>{coach.email}</Text>
                  <Popover.Root>
                    <Popover.Trigger asChild><Button size="sm" variant="outline">Regeln anzeigen</Button></Popover.Trigger>
                    <Portal>
                      <Popover.Positioner>
                        <Popover.Content maxW="xl" bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
                          <Popover.Arrow />
                          <Popover.Header fontWeight="bold">Regeln</Popover.Header>
                          <Popover.Body whiteSpace="pre-wrap">{coach?.coachRules}</Popover.Body>
                        </Popover.Content>
                      </Popover.Positioner>
                    </Portal>
                  </Popover.Root>
                </>
              ) : (<Text>Kein Coach zugewiesen</Text>)}
            </CardBody>
          </Card.Root>

          {user?.role === 'CUSTOMER' && (
            <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
              <CardHeader><Heading size="md">Video Upload</Heading></CardHeader>
              <CardBody>
                <VStack align="stretch" gap={3}>
                  <Button onClick={() => document.getElementById("video-upload-side")?.click()} variant="outline">
                    <Icon as={FiVideo} mr={2} /> Video auswählen
                  </Button>
                  <input
                    id="video-upload-side"
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0] || null;
                      setVideoFile(file as any);
                    }}
                    style={{ display: "none" }}
                  />
                  {videoFile && <Text fontSize="sm" color="var(--color-muted)">{(videoFile as any).name} ausgewählt</Text>}
                  <Button colorScheme="blue" loading={videoCheckLoading} onClick={handleSubmit}>
                    <Icon as={FiCheckCircle} mr={2} /> Hochladen
                  </Button>
                </VStack>
              </CardBody>
            </Card.Root>
          )}
        </VStack>
      </SimpleGrid>

      {/* Daily Checks Modal */}
      <Dialog.Root open={dcListOpen} onOpenChange={(e: any) => setDcListOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="4xl" bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
              <Dialog.Header>
                <Dialog.Title>Daily Checks</Dialog.Title>
                <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                {dcListLoading ? (
                  <Flex align="center" justify="center" py={8}><Spinner /></Flex>
                ) : (
                  <Flex gap={4} direction={{ base: "column", md: "row" }}>
                    <VStack align="stretch" flex={1} maxH="60vh" overflowY="auto">
                      {dcList.map((it:any)=> (
                        <Button key={it.id} variant={dcSelected?.id===it.id? 'solid':'outline'} onClick={()=> selectDailyCheck(it)} justifyContent="space-between">
                          <span>{new Date(it.date).toLocaleDateString("de-DE")}</span>
                          <span>{it.passCount} / {it.total}</span>
                        </Button>
                      ))}
                    </VStack>
                    <Flex flex={2} direction="column" minH="320px">
                      {dcDetailLoading ? (
                        <Flex flex={1} align="center" justify="center"><Spinner /></Flex>
                      ) : dcDetail ? (
                        <>
                          <Heading size="sm" mb={2}>{new Date(dcDetail.date).toLocaleDateString("de-DE")}</Heading>
                          <Text mb={3}>Video: {renderVideoStatus(dcDetail.video)}</Text>
                          <VStack align="stretch" gap={2}>
                            {dcDetail.violations.length === 0 ? (
                              <Text>Keine Verstöße.</Text>
                            ) : (
                              dcDetail.violations.map((v: any) => (
                                <Flex key={v.id} direction="column" p={2} borderWidth="1px" borderColor="var(--color-border)" borderRadius="md">
                                  <Text fontWeight="medium">{v.title}</Text>
                                  {v.note && (<Text fontSize="sm" color="var(--color-muted)">{v.note}</Text>)}
                                </Flex>
                              ))
                            )}
                          </VStack>
                          {user?.role !== 'ADMIN' && (
                            <Flex mt={4} gap={3} wrap="wrap">
                              <Button onClick={() => handleRequestVideo(dcSelected!.id)} disabled={!dcSelected} loading={videoReqLoading}>Video anfragen / prüfen</Button>
                              <Button variant="outline" onClick={() => handleDownload(dcSelected!.id)} disabled={!dcSelected}>Jetzt herunterladen</Button>
                            </Flex>
                          )}
                        </>
                      ) : (
                        <Text>Wähle einen DailyCheck für Details.</Text>
                      )}
                    </Flex>
                  </Flex>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setDcListOpen(false)}>Schließen</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  );
}

function renderVideoStatus(video: any) {
  if (!video || !video.id) return "–";
  if (!video.archivedAt) return "Hot";
  if (video.restoreStatus) return video.restoreStatus;
  return "Archiviert";
}

function getGuaranteeStatus(flagCount: number) {
  if (flagCount >= 10) return { text: "❌ Garantie verloren", color: "red" } as const;
  if (flagCount >= 5) return { text: "⚠️ Garantie gefährdet", color: "orange" } as const;
  return { text: "✅ Garantie aktiv", color: "green" } as const;
}

type ReqAndComment = {
  title?: string;
  date?: string;
  comment?: string;
};
function collectRequirementsAndComments(flag: any): ReqAndComment[] {
  if (!flag) return [];
  if (!flag.escalatedFrom || flag.escalatedFrom.length === 0) {
    if (flag.comment) {
      return [{ comment: flag.comment, date: flag.createdAt }];
    }
    if (flag.requirement) {
      return [{ title: flag.requirement.title, date: flag.createdAt }];
    }
    return [];
  }
  return (flag.escalatedFrom || []).flatMap((link: any) =>
    collectRequirementsAndComments(link.fromFlag)
  );
}
