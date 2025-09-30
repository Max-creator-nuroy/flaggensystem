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
  Box,
} from "@chakra-ui/react";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts";
import { useEffect, useState } from "react";
import { FiFlag, FiShield, FiTrendingUp, FiUser, FiCalendar, FiUsers } from "react-icons/fi";
import Moment from "moment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);
  const [userData, setUserData] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [dailyCheckList, setDailCheckList] = useState<any[]>([]);
  const [coach, setCoach] = useState<any>(null);
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
  const [absenceRequests, setAbsenceRequests] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadGrowthData, setLeadGrowthData] = useState<any[]>([]);
  const [leadGrowthLoading, setLeadGrowthLoading] = useState(false);
  const [absenceReqLoading, setAbsenceReqLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [newCallNotes, setNewCallNotes] = useState("");
  const [newPlanNotes, setNewPlanNotes] = useState("");
  const [dailyActivity, setDailyActivity] = useState<any>(null);
  const [dailyActivityLoading, setDailyActivityLoading] = useState(false);

  // Helper function to check if daily check is completed today
  const isDailyCheckCompletedToday = () => {
    const today = new Date().toDateString();
    return dailyCheckList.some(check => {
      const checkDate = new Date(check.date).toDateString();
      return checkDate === today;
    });
  };
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
  
  // Load leads data for affiliates
  if (userData?.isAffiliate) {
    loadLeadsData();
    loadLeadGrowthData();
    loadDailyActivity();
  }
  }, [userIdParam, token, userData?.isAffiliate]);


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

  const loadLeadsData = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    try {
      setLeadsLoading(true);
      const res = await fetch(`http://localhost:3000/leads/getLeadsByUser/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotalLeads(data?.length || 0);
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLeadsLoading(false);
    }
  };

  const loadLeadGrowthData = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    
    // Only load for affiliates (including affiliate+customer)
    if (!userData?.isAffiliate && !userIdParam) return;
    
    try {
      setLeadGrowthLoading(true);
      const res = await fetch(`http://localhost:3000/leads/leadGrowth?days=7&coachId=${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setLeadGrowthData(json.data || []);
      }
    } catch (error) {
      console.error("Error loading lead growth:", error);
    } finally {
      setLeadGrowthLoading(false);
    }
  };

  const loadDailyActivity = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    if (!userData?.isAffiliate) return;
    
    try {
      setDailyActivityLoading(true);
      const res = await fetch(`http://localhost:3000/leads/dailyActivity/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDailyActivity(data);
      }
    } catch (error) {
      console.error("Error loading daily activity:", error);
    } finally {
      setDailyActivityLoading(false);
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

  // Affiliate Dashboard
  if (userData?.isAffiliate && !userData?.isCustomer) {
    return (
      <Stack>
        {/* Hero */}
        <Card.Root 
          overflow="hidden"
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
          position="relative"
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgGradient="linear(135deg, rgba(14, 165, 233, 0.1), rgba(99, 102, 241, 0.1))"
          />
          <CardBody p={{ base: 6, md: 8 }} position="relative">
            <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
              <VStack align="start" gap={2}>
                <Flex align="center" gap={3}>
                  <Flex 
                    w={12} h={12} 
                    align="center" justify="center" 
                    rounded="full" 
                    bg="blue.500"
                    color="white"
                    fontSize="lg"
                    fontWeight="bold"
                  >
                    {userData?.name?.charAt(0)}{userData?.last_name?.charAt(0)}
                  </Flex>
                  <VStack align="start" gap={0}>
                    <Heading size="lg" color="var(--color-text)">
                      {userIdParam == null ? "Willkommen zurück," : "Profil von "} {userData?.name}
                    </Heading>
                    <Text color="var(--color-muted)" fontSize="sm">
                      {userData?.email}
                    </Text>
                  </VStack>
                </Flex>
                
                <Flex wrap="wrap" gap={2}>
                  {userData?.isDeleted && (
                    <Badge colorScheme="red" variant="subtle">
                      Deaktiviert
                    </Badge>
                  )}
                  {currentAbsence && (
                    <Badge colorScheme="yellow" variant="subtle">
                      Abwesend: {currentAbsence.type}
                    </Badge>
                  )}
                  <Badge colorScheme="blue" variant="subtle">
                    Affiliate
                  </Badge>
                </Flex>
              </VStack>
              
              <VStack align={{ base: "start", md: "end" }} gap={2}>
                <Text fontSize="sm" color="var(--color-muted)">
                  {guarantee.text}
                </Text>
                <Text fontSize="xs" color="var(--color-muted)">
                  Letzter Login: {new Date().toLocaleDateString('de-DE')}
                </Text>
              </VStack>
            </Flex>
          </CardBody>
        </Card.Root>

        {/* KPIs */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4} mt={4}>
          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardBody>
              <Flex align="center" justify="space-between">
                <Flex direction="column">
                  <Text fontSize="sm" color="var(--color-muted)">Gesamt Leads</Text>
                  <Heading size="lg">{leadsLoading ? "..." : totalLeads}</Heading>
                </Flex>
                <Icon as={FiUsers} color="blue.500" boxSize={6} />
              </Flex>
            </CardBody>
          </Card.Root>
          
          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardBody>
              <Flex align="center" justify="space-between">
                <Flex direction="column">
                  <Text fontSize="sm" color="var(--color-muted)">Coach</Text>
                  <Heading size="md">{coach ? `${coach.name} ${coach.last_name}` : "—"}</Heading>
                </Flex>
                <Icon as={FiUser} color="gray.500" boxSize={6} />
              </Flex>
            </CardBody>
          </Card.Root>

          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardBody>
              <Flex align="center" justify="space-between">
                <Flex direction="column">
                  <Text fontSize="sm" color="var(--color-muted)">Status</Text>
                  <Heading size="md">Affiliate</Heading>
                </Flex>
                <Icon as={FiTrendingUp} color="green.500" boxSize={6} />
              </Flex>
            </CardBody>
          </Card.Root>
        </SimpleGrid>


        {/* Main Content */}
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4} mt={4}>
          {/* Leads Chart */}
          <Card.Root 
            bg="var(--color-surface)" 
            borderWidth="1px" 
            borderColor="var(--color-border)"
            cursor="pointer"
            onClick={() => navigate(userIdParam ? `/leadlist?userId=${userIdParam}` : '/leadlist')}
            _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
            transition="all 0.2s"
          >
            <CardHeader>
              <Heading size="md">Leads pro Tag</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                Klicken für Details
              </Text>
            </CardHeader>
            <CardBody>
              {leadsLoading ? (
                <Flex align="center" justify="center" py={8}>
                  <Spinner size="md" />
                </Flex>
              ) : userData?.isAffiliate && !userData?.isCustomer ? (
                <Box>
                  <Text fontSize="lg" fontWeight="bold" mb={2}>
                    {totalLeads} Leads insgesamt
                  </Text>
                  {leadGrowthLoading ? (
                    <Flex align="center" justify="center" h="120px">
                      <Spinner size="sm" />
                    </Flex>
                  ) : leadGrowthData.length > 0 ? (
                    <Box h="120px">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={leadGrowthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id="leadArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3182ce" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <ReTooltip 
                            contentStyle={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 6,
                              color: 'var(--color-text)',
                            }}
                            labelFormatter={(label: any) => `Datum: ${label}`}
                            formatter={(value: any, name: any) => [value, name === 'newLeads' ? 'Neue Leads' : 'Kumulativ']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="newLeads" 
                            stroke="#3182ce" 
                            fillOpacity={1} 
                            fill="url(#leadArea)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Flex align="center" justify="center" h="120px">
                      <Text fontSize="sm" color="var(--color-muted)">
                        Keine Lead-Daten der letzten 7 Tage
                      </Text>
                    </Flex>
                  )}
                </Box>
              ) : (
                <Flex align="center" justify="center" py={8}>
                  <VStack>
                    <Icon as={FiUsers} boxSize={12} color="blue.500" />
                    <Text>Nur für Affiliates verfügbar</Text>
                  </VStack>
                </Flex>
              )}
            </CardBody>
          </Card.Root>

          {/* Profile */}
          <Card.Root bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)">
            <CardHeader><Heading size="md">Profil</Heading></CardHeader>
            <CardBody>
              <Text><b>Name:</b> {userData?.name} {userData?.last_name}</Text>
              <Text><b>E-Mail:</b> {userData?.email}</Text>
              {userData?.mobileNumber && <Text><b>Telefon:</b> {userData?.mobileNumber}</Text>}
              <Text mt={3}><b>Coach:</b> {coach ? `${coach.name} ${coach.last_name}` : "Kein Coach zugewiesen"}</Text>
            </CardBody>
          </Card.Root>
        </SimpleGrid>
      </Stack>
    );
  }

  return (
    <Stack>
      {/* Hero */}
      <Card.Root 
        overflow="hidden"
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        position="relative"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bgGradient="linear(135deg, rgba(14, 165, 233, 0.1), rgba(99, 102, 241, 0.1))"
        />
        <CardBody p={{ base: 6, md: 8 }} position="relative">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
            <VStack align="start" gap={2}>
              <Flex align="center" gap={3}>
                <Flex 
                  w={12} h={12} 
                  align="center" justify="center" 
                  rounded="full" 
                  bg="blue.500"
                  color="white"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  {userData?.name?.charAt(0)}{userData?.last_name?.charAt(0)}
                </Flex>
                <VStack align="start" gap={0}>
                  <Heading size="lg" color="var(--color-text)">
                    {userIdParam == null ? "Willkommen zurück," : "Profil von "} {userData?.name}
                  </Heading>
                  <Text color="var(--color-muted)" fontSize="sm">
                    {userData?.email}
                  </Text>
                </VStack>
              </Flex>
              
              <Flex wrap="wrap" gap={2}>
                {userData?.isDeleted && (
                  <Badge colorScheme="red" variant="subtle">
                    Deaktiviert
                  </Badge>
                )}
                {currentAbsence && (
                  <Badge colorScheme="yellow" variant="subtle">
                    Abwesend: {currentAbsence.type}
                  </Badge>
                )}
                {isCustomer && (
                  <Badge colorScheme="green" variant="subtle">
                    Kunde
                  </Badge>
                )}
                {isAffiliate && (
                  <Badge colorScheme="blue" variant="subtle">
                    Affiliate
                  </Badge>
                )}
              </Flex>
            </VStack>
            
            <VStack align={{ base: "start", md: "end" }} gap={2}>
              <Text fontSize="sm" color="var(--color-muted)">
                {guarantee.text}
              </Text>
              <Text fontSize="xs" color="var(--color-muted)">
                Letzter Login: {new Date().toLocaleDateString('de-DE')}
              </Text>
            </VStack>
          </Flex>
        </CardBody>
      </Card.Root>

      {/* Action Buttons */}
      <Flex gap={3} wrap="wrap" mt={4}>
          <Button variant="outline" onClick={() => navigate(userIdParam ? `/dailyChecks?userId=${userIdParam}` : '/dailyChecks')}>
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

          {(user?.role === 'COACH' || user?.role === 'ADMIN') && (
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
          )}

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
          <Card.Root 
            bg="var(--color-surface)" 
            borderWidth="1px" 
            borderColor={isDailyCheckCompletedToday() ? "green.300" : "red.300"}
            cursor="pointer"
            onClick={() => navigate(userIdParam ? `/dailyChecks?userId=${userIdParam}` : '/dailyChecks')}
            _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
            transition="all 0.2s"
          >
            <CardHeader>
              <Flex align="center" justify="space-between">
                <Heading size="md">Daily Checks</Heading>
                <Icon 
                  as={FiCalendar} 
                  color={isDailyCheckCompletedToday() ? "green.500" : "red.500"} 
                  boxSize={6} 
                />
              </Flex>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" gap={3}>
                <Text 
                  color={isDailyCheckCompletedToday() ? "green.400" : "red.400"}
                  fontWeight="medium"
                >
                  {isDailyCheckCompletedToday() 
                    ? "✅ Daily Check heute bereits erledigt!" 
                    : "⚠️ Daily Check heute noch offen"}
                </Text>
                {dailyCheckList.length > 0 && (
                  <Flex justify="space-between" align="center" p={3} bg="rgba(255,255,255,0.06)" rounded="md">
                    <Text fontSize="sm">Gesamt Daily Checks:</Text>
                    <Text fontSize="sm" fontWeight="medium">{dailyCheckList.length} Videos</Text>
                  </Flex>
                )}
                <Button 
                  variant="outline" 
                  colorScheme={isDailyCheckCompletedToday() ? "green" : "red"} 
                  size="sm"
                >
                  {(user?.role === 'ADMIN' || user?.role === 'COACH') 
                    ? "Daily Checks ansehen →"
                    : isDailyCheckCompletedToday() 
                      ? "Daily Checks ansehen →" 
                      : "Daily Check jetzt machen →"}
                </Button>
              </VStack>
            </CardBody>
          </Card.Root>

          {/* Lead Chart for Affiliate+Customer users */}
          {userData?.isAffiliate && userData?.isCustomer && (
            <Card.Root 
              bg="var(--color-surface)" 
              borderWidth="1px" 
              borderColor="var(--color-border)"
              cursor="pointer"
              onClick={() => navigate(userIdParam ? `/leadlist?userId=${userIdParam}` : '/leadlist')}
              _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              <CardHeader>
                <Flex align="center" justify="space-between">
                  <Heading size="md">Meine Leads</Heading>
                  <Icon as={FiTrendingUp} color="blue.500" boxSize={6} />
                </Flex>
                <Text fontSize="sm" color="var(--color-muted)">
                  Klicken für Details
                </Text>
              </CardHeader>
              <CardBody>
                {leadsLoading ? (
                  <Flex align="center" justify="center" py={4}>
                    <Spinner size="md" />
                  </Flex>
                ) : (
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={3}>
                      {totalLeads} Leads insgesamt
                    </Text>
                    {leadGrowthLoading ? (
                      <Flex align="center" justify="center" h="120px">
                        <Spinner size="sm" />
                      </Flex>
                    ) : leadGrowthData.length > 0 ? (
                      <Box h="120px">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={leadGrowthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <defs>
                              <linearGradient id="leadAreaAffiliate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3182ce" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <ReTooltip 
                              contentStyle={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 6,
                                color: 'var(--color-text)',
                              }}
                              labelFormatter={(label: any) => `Datum: ${label}`}
                              formatter={(value: any, name: any) => [value, name === 'newLeads' ? 'Neue Leads' : 'Kumulativ']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="newLeads" 
                              stroke="#3182ce" 
                              fillOpacity={1} 
                              fill="url(#leadAreaAffiliate)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Flex align="center" justify="center" h="120px">
                        <Text fontSize="sm" color="var(--color-muted)">
                          Keine Lead-Daten der letzten 7 Tage
                        </Text>
                      </Flex>
                    )}
                  </Box>
                )}
              </CardBody>
            </Card.Root>
          )}

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
                            <Dialog.Content 
                              bg="var(--color-surface)" 
                              borderWidth="1px" 
                              borderColor="var(--color-border)"
                              borderRadius="lg"
                              maxW="2xl"
                              w="90vw"
                            >
                              <Dialog.Header>
                                <Flex align="center" gap={3}>
                                  <Flex 
                                    w={10} h={10} 
                                    align="center" justify="center" 
                                    rounded="full" 
                                    bg={selectedFlag?.color === "RED" ? "red.500" : "yellow.500"}
                                    color="white"
                                  >
                                    <Icon as={FiFlag} boxSize={5} />
                                  </Flex>
                                  <VStack align="start" gap={0}>
                                    <Dialog.Title>
                                      {selectedFlag?.color === "RED" ? "Rote Flagge" : "Gelbe Flagge"} Details
                                    </Dialog.Title>
                                    <Text fontSize="sm" color="var(--color-muted)">
                                      Erstellt am {Moment(selectedFlag?.createdAt).format("DD.MM.YYYY HH:mm")} Uhr
                                    </Text>
                                  </VStack>
                                </Flex>
                                <Dialog.CloseTrigger asChild>
                                  <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                              </Dialog.Header>
                              
                              <Dialog.Body>
                                {selectedFlag && (
                                  <VStack align="stretch" gap={6}>
                                    {/* Information Grid */}
                                    <Card.Root>
                                      <CardHeader pb={2}>
                                        <Flex align="center" gap={2}>
                                          <Icon as={FiFlag} color={selectedFlag.color === "RED" ? "red.500" : "yellow.500"} />
                                          <Text fontWeight="semibold">Flaggen-Information</Text>
                                        </Flex>
                                      </CardHeader>
                                      <CardBody pt={0}>
                                        <VStack align="stretch" gap={3}>
                                          <Flex justify="space-between">
                                            <Text fontSize="sm" color="var(--color-muted)">Farbe:</Text>
                                            <Badge 
                                              colorScheme={selectedFlag.color === "RED" ? "red" : "yellow"}
                                              variant="subtle"
                                            >
                                              {selectedFlag.color === "RED" ? "Rot" : "Gelb"}
                                            </Badge>
                                          </Flex>
                                          <Flex justify="space-between">
                                            <Text fontSize="sm" color="var(--color-muted)">Erstellt:</Text>
                                            <Text fontSize="sm" fontWeight="medium">
                                              {Moment(selectedFlag.createdAt).format("DD.MM.YYYY HH:mm")}
                                            </Text>
                                          </Flex>
                                          <Flex justify="space-between">
                                            <Text fontSize="sm" color="var(--color-muted)">ID:</Text>
                                            <Text fontSize="sm" fontFamily="mono">
                                              #{selectedFlag.id.slice(-8)}
                                            </Text>
                                          </Flex>
                                        </VStack>
                                      </CardBody>
                                    </Card.Root>

                                    {/* Requirement Section */}
                                    {selectedFlag.requirement?.title && (
                                      <Card.Root>
                                        <CardHeader>
                                          <Flex align="center" gap={2}>
                                            <Icon as={FiShield} color="purple.500" />
                                            <Text fontWeight="semibold">Verknüpftes Kriterium</Text>
                                          </Flex>
                                        </CardHeader>
                                        <CardBody>
                                          <Card.Root bg="rgba(147, 51, 234, 0.1)" borderWidth="1px" borderColor="purple.200">
                                            <CardBody p={3}>
                                              <Text fontWeight="medium">{selectedFlag.requirement.title}</Text>
                                              {selectedFlag.requirement.description && (
                                                <Text fontSize="sm" color="var(--color-muted)" mt={1}>
                                                  {selectedFlag.requirement.description}
                                                </Text>
                                              )}
                                            </CardBody>
                                          </Card.Root>
                                        </CardBody>
                                      </Card.Root>
                                    )}

                                    {/* Content Section */}
                                    {selectedFlag.escalatedFrom.length === 0 ? (
                                      <Card.Root>
                                        <CardHeader>
                                          <Flex align="center" gap={2}>
                                            <Icon as={FiFlag} color="green.500" />
                                            <Text fontWeight="semibold">Kommentar</Text>
                                          </Flex>
                                        </CardHeader>
                                        <CardBody>
                                          <Card.Root bg="rgba(34, 197, 94, 0.1)" borderWidth="1px" borderColor="green.200">
                                            <CardBody p={3}>
                                              <Text whiteSpace="pre-wrap">
                                                {selectedFlag.comment || "Kein Kommentar vorhanden"}
                                              </Text>
                                            </CardBody>
                                          </Card.Root>
                                        </CardBody>
                                      </Card.Root>
                                    ) : (
                                      <Card.Root>
                                        <CardHeader>
                                          <Flex align="center" gap={2}>
                                            <Icon as={FiCalendar} color="blue.500" />
                                            <Text fontWeight="semibold">Flaggen-Verlauf</Text>
                                          </Flex>
                                        </CardHeader>
                                        <CardBody>
                                          <VStack align="stretch" gap={3}>
                                            {collectRequirementsAndComments(selectedFlag).map((entry: ReqAndComment, i: number) => (
                                              <Card.Root 
                                                key={i} 
                                                bg="rgba(59, 130, 246, 0.1)" 
                                                borderWidth="1px" 
                                                borderColor="blue.200"
                                                borderLeftWidth="4px"
                                                borderLeftColor="blue.500"
                                              >
                                                <CardBody p={3}>
                                                  <Flex justify="space-between" align="start" gap={3}>
                                                    <VStack align="start" gap={1} flex={1}>
                                                      {entry.title ? (
                                                        <Text fontWeight="medium">{entry.title}</Text>
                                                      ) : (
                                                        entry.comment && (
                                                          <Text whiteSpace="pre-wrap">{entry.comment}</Text>
                                                        )
                                                      )}
                                                    </VStack>
                                                    <Badge variant="outline" size="sm">
                                                      {Moment(entry.date).format("DD.MM.YYYY")}
                                                    </Badge>
                                                  </Flex>
                                                </CardBody>
                                              </Card.Root>
                                            ))}
                                          </VStack>
                                        </CardBody>
                                      </Card.Root>
                                    )}
                                  </VStack>
                                )}
                              </Dialog.Body>
                              
                              <Dialog.Footer>
                                <Flex gap={2} w="100%" justify="space-between">
                                  {user?.role === "ADMIN" && selectedFlag?.id === flag.id ? (
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
                                      🗑️ Flagge löschen
                                    </Button>
                                  ) : (
                                    <Box />
                                  )}
                                  <Dialog.CloseTrigger asChild>
                                    <Button colorScheme="blue">
                                      ✅ Verstanden
                                    </Button>
                                  </Dialog.CloseTrigger>
                                </Flex>
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

        </VStack>
      </SimpleGrid>

    </Stack>
  );
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
