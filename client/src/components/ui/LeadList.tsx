import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import { useSearchParams } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";

// Types aligned with backend
type PipelineStatus =
  | "NEU"
  | "ANGESCHRIEBEN"
  | "ANTWORT_ERHALTEN"
  | "SETTING_TERMINIERT"
  | "CLOSING_TERMINIERT"
  | "DEAL_CLOSED"
  | "LOST_DISQUALIFIZIERT"
  | "FOLLOW_UP"
  | "NO_SHOW"
  | "TERMIN_ABGESAGT"
  | "TERMIN_VERSCHOBEN";

interface Lead {
  id: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  createdAt: string; // ISO string
  status?: PipelineStatus;
  closed?: boolean;
}

interface DailyDataPoint {
  date: string;
  newLeads: number;
  cumulative: number;
}

// Labels and colors for statuses
const STATUS_LABELS: Record<PipelineStatus, string> = {
  NEU: "Neu",
  ANGESCHRIEBEN: "Angeschrieben",
  ANTWORT_ERHALTEN: "Antwort Erhalten",
  SETTING_TERMINIERT: "Setting Terminiert",
  CLOSING_TERMINIERT: "Closing Terminiert",
  DEAL_CLOSED: "Deal Closed",
  LOST_DISQUALIFIZIERT: "Lost/Disqualifiziert",
  FOLLOW_UP: "Follow Up",
  NO_SHOW: "No-Show",
  TERMIN_ABGESAGT: "Termin abgesagt",
  TERMIN_VERSCHOBEN: "Termin verschoben",
};

// Helpers
const formatDate = (d: Date) => d.toISOString().slice(0, 10);

const LeadList = () => {
  const [leadList, setLeadList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALLE");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [daysRange] = useState(30);
  
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get("userId");
  const [targetUserName, setTargetUserName] = useState<string>("");

  // Fetch real leads from server
  useEffect(() => {
    let mounted = true;
    async function fetchLeads() {
      try {
        const token = localStorage.getItem("token");
        const payload = getUserFromToken(token);
        
        // Use URL userId if available (when coach views affiliate's leads), otherwise use token userId
        let targetUserId = urlUserId;
        if (!targetUserId) {
          targetUserId = payload?.id || payload?.userId;
        }
        
        if (!targetUserId) throw new Error("Kein User im Token gefunden");
        
        const res = await fetch(
          `http://localhost:3000/leads/getLeadsByUser/${targetUserId}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!mounted) return;
        setLeadList(data || []);
        
        // Fetch user name if viewing someone else's leads
        if (urlUserId && urlUserId !== (payload?.id || payload?.userId)) {
          try {
            const userRes = await fetch(
              `http://localhost:3000/users/getUser/${targetUserId}`,
              {
                headers: {
                  Authorization: token ? `Bearer ${token}` : "",
                },
              }
            );
            if (userRes.ok) {
              const userData = await userRes.json();
              setTargetUserName(userData.name || "");
            }
          } catch (e) {
            console.error("Fehler beim Laden des Benutzernamens", e);
          }
        }
      } catch (e) {
        console.error("Leads laden fehlgeschlagen", e);
        if (mounted) setLeadList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchLeads();
    return () => {
      mounted = false;
    };
  }, [urlUserId]);

  // Leads per status (formerly per stage)
  const statuses: PipelineStatus[] = [
    "NEU",
    "ANGESCHRIEBEN",
    "ANTWORT_ERHALTEN",
    "SETTING_TERMINIERT",
    "CLOSING_TERMINIERT",
    "DEAL_CLOSED",
    "LOST_DISQUALIFIZIERT",
    "FOLLOW_UP",
    "NO_SHOW",
    "TERMIN_ABGESAGT",
    "TERMIN_VERSCHOBEN",
  ];

  const leadsPerStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    statuses.forEach((s) => (counts[s] = 0));
    leadList.forEach((lead) => {
      const key = lead.status || "NEU";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [leadList]);

  // Chart data per day from real leads
  const dailyData = useMemo(() => {
    const today = new Date();
    const map: Record<string, DailyDataPoint> = {};
    const out: DailyDataPoint[] = [];
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDate(d);
      map[key] = { date: key, newLeads: 0, cumulative: 0 };
    }
    leadList.forEach((l) => {
      const key = formatDate(new Date(l.createdAt));
      if (map[key]) map[key].newLeads += 1;
    });
    let cum = 0;
    Object.keys(map)
      .sort()
      .forEach((k) => {
        cum += map[k].newLeads;
        map[k].cumulative = cum;
        out.push(map[k]);
      });
    return out;
  }, [leadList, daysRange]);

  const totalLeads = leadList.length;
  const closedLeads = useMemo(
    () => leadList.filter((l) => l.status === "DEAL_CLOSED").length,
    [leadList]
  );
  const conversionRate = totalLeads ? Math.round((closedLeads / totalLeads) * 100) : 0;

  // Search + Filter + Sort
  const filteredBySearch = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leadList;
    return leadList.filter((lead) => {
      const name = lead.name?.toLowerCase() || "";
      const phone = lead.mobileNumber?.toLowerCase() || "";
      const email = lead.email?.toLowerCase() || "";
      return (
        name.includes(term) || phone.includes(term) || email.includes(term)
      );
    });
  }, [searchTerm, leadList]);

  const filteredByStatus = useMemo(() => {
    if (selectedStatus === "ALLE") return filteredBySearch;
    return filteredBySearch.filter((l) => l.status === selectedStatus);
  }, [filteredBySearch, selectedStatus]);

  const visibleLeads = useMemo(() => {
    const copy = [...filteredByStatus];
    copy.sort((a, b) => {
      const an = a.status ? STATUS_LABELS[a.status] : "";
      const bn = b.status ? STATUS_LABELS[b.status] : "";
      const cmp = an.localeCompare(bn, "de");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filteredByStatus, sortDir]);

  // Custom dark tooltip for lead chart
  const LeadTooltip = ({ active, label, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box bg="var(--color-surface)" border="1px solid var(--color-border)" rounded="md" shadow="lg" p={2}>
        <Text fontSize="xs" color="var(--color-muted)" mb={1}>{label}</Text>
        <Box display="grid" gridTemplateColumns="1fr auto" gap={1}>
          {payload.map((p: any) => (
            <Box key={p.dataKey} display="contents">
              <Box display="flex" alignItems="center" gap="6px">
                <Box w="8px" h="8px" bg={p.color} rounded="full" />
                <Text fontSize="xs" color="var(--color-text)">{p.name}</Text>
              </Box>
              <Text fontSize="xs" color="var(--color-text)" textAlign="right">{p.value?.toLocaleString?.() ?? p.value}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const StatusBadge = (status?: PipelineStatus) => {
    const label = status ? STATUS_LABELS[status] : "—";
    const accent =
      status === "DEAL_CLOSED" ? "green.300" :
      status === "LOST_DISQUALIFIZIERT" ? "red.300" :
      status === "SETTING_TERMINIERT" ? "blue.300" :
      status === "CLOSING_TERMINIERT" ? "cyan.300" :
      status === "NO_SHOW" || status === "TERMIN_ABGESAGT" || status === "TERMIN_VERSCHOBEN" ? "orange.300" :
      status === "FOLLOW_UP" ? "purple.300" :
      "gray.300";
    return (
      <Badge
        borderRadius="full"
        px="2"
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        color={accent}
        display="inline-flex"
        alignItems="center"
        gap={2}
      >
        <Box w="6px" h="6px" borderRadius="full" bg={accent} />
        {label}
      </Badge>
    );
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold">
        {targetUserName ? `Leads von ${targetUserName}` : "Deine Leads"}
      </Text>

      {loading ? (
        <Spinner mt={4} />
      ) : (
        <>
          {/* Modern Chart Section */}
          <Card.Root 
            mb={8}
            bg="var(--color-surface)"
            borderWidth="1px"
            borderColor="var(--color-border)"
          >
            <CardHeader>
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
                <VStack align="start" gap={0}>
                  <Heading size="md" color="var(--color-text)">Lead-Wachstum</Heading>
                  <Text fontSize="sm" color="var(--color-muted)">Neue Leads vs. kumulativ</Text>
                </VStack>
                <Box textAlign="center">
                  <Text fontSize="sm" color="var(--color-muted)">Abschlussquote</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">{conversionRate}%</Text>
                  <Text fontSize="xs" color="var(--color-muted)">{closedLeads} von {totalLeads} Leads</Text>
                </Box>
              </Flex>
            </CardHeader>
            <CardBody>
              <Box height={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <ReTooltip content={<LeadTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ color: 'var(--color-muted)' }} iconType="plainline" formatter={(v: any) => <span style={{ color: 'var(--color-muted)' }}>{v}</span>} />
                    <Area type="monotone" dataKey="newLeads" name="Neue Leads" stroke="#6366f1" fillOpacity={1} fill="url(#leadNew)" dot={false} activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="cumulative" name="Kumulativ" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </CardBody>
          </Card.Root>

          {/* Pipeline Status Übersicht */}
          <Flex gap={2} mt={4} flexWrap="wrap">
            {statuses.map((s) => (
              <Card.Root key={s} flex="1" minW="120px" textAlign="center" p={3}
                bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)" color="var(--color-text)"
              >
                <Text fontSize="md" fontWeight="bold">{STATUS_LABELS[s]}</Text>
                <Text fontSize="lg" fontWeight="bold" color="teal.300">{leadsPerStatus[s] || 0}</Text>
              </Card.Root>  
            ))}
          </Flex>

          {/* Suche & Filter */}
          <Flex mt={6} gap={3} align="center" flexWrap="wrap">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nach Name, Handy oder Email durchsuchen…"
              maxW="340px"
            />
            <Box as="label" display="flex" alignItems="center" gap={2}>
              <Text fontSize="sm" color="gray.600">Status:</Text>
              <select
                value={selectedStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatus(e.target.value)}
                style={{
                  padding: "6px 28px 6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                  maxWidth: 260,
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  outline: "none",
                }}
              >
                <option value="ALLE" style={{ background: "var(--color-surface)", color: "var(--color-text)" }}>Alle Pipeline-Status</option>
                {statuses.map((s) => (
                  <option key={s} value={s} style={{ background: "var(--color-surface)", color: "var(--color-text)" }}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Box>
          </Flex>

          {/* Desktop Tabelle */}
          <Box display={{ base: "none", md: "block" }} mt={4} mr={5}>
            <Table.ScrollArea borderWidth="1px" borderColor="var(--color-border)" rounded="md" height="100%" bg="var(--color-surface)">
              <Table.Root size="sm" stickyHeader interactive bg="var(--color-surface)" color="var(--color-text)" className="admin-table">
                <Table.Header>
                  <Table.Row bg="var(--color-surface)">
                    <Table.ColumnHeader bg="var(--color-surface)" color="var(--color-text)">Name</Table.ColumnHeader>
                    <Table.ColumnHeader
                      bg="var(--color-surface)"
                      color="var(--color-text)"
                      onClick={() => setSortDir((p) => (p === "asc" ? "desc" : "asc"))}
                      _hover={{ cursor: "pointer" }}
                    >
                      Status {sortDir === "asc" ? "▲" : "▼"}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader bg="var(--color-surface)" color="var(--color-text)">Handynummer</Table.ColumnHeader>
                    <Table.ColumnHeader bg="var(--color-surface)" color="var(--color-text)">Email</Table.ColumnHeader>
                    <Table.ColumnHeader bg="var(--color-surface)" color="var(--color-text)">Erstellt am</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {visibleLeads.map((lead) => (
                    <Table.Row key={lead.id} bg="var(--color-surface)" _hover={{ bg: "rgba(255,255,255,0.02)" }}>
                      <Table.Cell>{lead.name}</Table.Cell>
                      <Table.Cell>{StatusBadge(lead.status)}</Table.Cell>
                      <Table.Cell>{lead.mobileNumber || "—"}</Table.Cell> 
                      <Table.Cell>{lead.email || "—"}</Table.Cell>
                      <Table.Cell>{new Date(lead.createdAt).toLocaleDateString()}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Box>

          {/* Mobile Ansicht als Cards */}
          <VStack display={{ base: "flex", md: "none" }} mt={4} w="100%">
            {visibleLeads.map((lead) => (
              <Card.Root key={lead.id} w="100%" p={3}
                bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)" color="var(--color-text)"
              >
                <Flex justify="space-between" align="start" gap={3}>
                  <Box>
                    <Text fontWeight="bold">{lead.name}</Text>
                    <Text fontSize="sm" color="gray.400">{lead.mobileNumber || "Keine Nummer"}</Text>
                    <Text fontSize="sm" color="gray.400">{lead.email || "Keine Email"}</Text>
                    <Text fontSize="xs" color="gray.500">{new Date(lead.createdAt).toLocaleDateString()}</Text>
                  </Box>
                  {StatusBadge(lead.status)}
                </Flex>
              </Card.Root>
            ))}
          </VStack>
        </>
      )} 
    </Box>
  );
};

export default LeadList;
