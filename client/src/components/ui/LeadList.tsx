import {
  Badge,
  Box,
  Card,
  Flex,
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
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts";
import getUserFromToken from "@/services/getTokenFromLokal";

// Types aligned with backend
type PipelineStatus =
  | "INTERESSENT"
  | "SETTING_TERMINIERT"
  | "SETTING_NOSHOW"
  | "DOWNSELL"
  | "CLOSING_TERMINIERT"
  | "CLOSING_NOSHOW"
  | "KUNDE"
  | "LOST";

interface Lead {
  id: string;
  name: string;
  mobileNumber?: string;
  email?: string;
  createdAt: string; // ISO string
  status?: PipelineStatus;
  closed?: boolean;
}

// Labels and colors for statuses
const STATUS_LABELS: Record<PipelineStatus, string> = {
  INTERESSENT: "Interessent",
  SETTING_TERMINIERT: "Setting terminiert",
  SETTING_NOSHOW: "Setting No-Show",
  DOWNSELL: "Downsell",
  CLOSING_TERMINIERT: "Closing terminiert",
  CLOSING_NOSHOW: "Closing No-Show",
  KUNDE: "Kunde",
  LOST: "Lost",
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

  // Fetch real leads from server
  useEffect(() => {
    let mounted = true;
    async function fetchLeads() {
      try {
        const token = localStorage.getItem("token");
        const payload = getUserFromToken(token);
        const userId = payload?.id || payload?.userId;
        if (!userId) throw new Error("Kein User im Token gefunden");
        const res = await fetch(
          `http://localhost:3000/leads/getLeadsByUser/${userId}`,
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
  }, []);

  // Leads per status (formerly per stage)
  const statuses: PipelineStatus[] = [
    "INTERESSENT",
    "SETTING_TERMINIERT",
    "SETTING_NOSHOW",
    "DOWNSELL",
    "CLOSING_TERMINIERT",
    "CLOSING_NOSHOW",
    "KUNDE",
    "LOST",
  ];

  const leadsPerStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    statuses.forEach((s) => (counts[s] = 0));
    leadList.forEach((lead) => {
      const key = lead.status || "INTERESSENT";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [leadList]);

  // Chart data per day from real leads
  const dailyData = useMemo(() => {
    const today = new Date();
    const map: Record<string, { date: string; newLeads: number; cumulative: number; ma7?: number }> = {};
    const out: { date: string; newLeads: number; cumulative: number; ma7?: number }[] = [];
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
    // 7-day moving average for newLeads
    for (let i = 0; i < out.length; i++) {
      const start = Math.max(0, i - 6);
      const slice = out.slice(start, i + 1);
      const sum = slice.reduce((s, d) => s + d.newLeads, 0);
      out[i].ma7 = Number((sum / slice.length).toFixed(2));
    }
    return out;
  }, [leadList, daysRange]);

  const totalLeads = leadList.length;
  const closedLeads = useMemo(
    () => leadList.filter((l) => l.status === "KUNDE").length,
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

  const StatusBadge = (status?: PipelineStatus) => {
    const label = status ? STATUS_LABELS[status] : "—";
    const accent =
      status === "KUNDE" ? "green.300" :
      status === "LOST" ? "red.300" :
      status === "SETTING_TERMINIERT" ? "blue.300" :
      status === "CLOSING_TERMINIERT" ? "cyan.300" :
      status === "SETTING_NOSHOW" || status === "CLOSING_NOSHOW" ? "orange.300" :
      status === "DOWNSELL" ? "purple.300" :
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
      <Text fontSize="2xl" fontWeight="bold">Deine Leads</Text>

      {loading ? (
        <Spinner mt={4} />
      ) : (
        <>
          {/* Charts */}
          <Box display="grid" gridTemplateColumns={{ base: "1fr", md: "1fr 320px" }} gap={4} mt={4}>
            {/* Kombinierter Chart: Kumulativ (Area) + Neue Leads (Bar) + 7T Schnitt (Line) */}
            <Box>
              <Text fontWeight="semibold" mb={2}>Gesamt Leads</Text>
              <Box height={280}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData}>
                    <XAxis dataKey="date" hide={dailyData.length > 25} />
                    <YAxis allowDecimals={false} />
                    <ReTooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        color: 'var(--color-text)',
                        boxShadow: 'none',
                      }}
                      labelStyle={{ color: 'var(--color-text)' }}
                      itemStyle={{ color: 'var(--color-text)' }}
                    />
                    <defs>
                      <linearGradient id="leadArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="newLeadsArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={2} fill="url(#leadArea)" name="Kumulativ" />
                    <Bar dataKey="newLeads" name="Neue Leads" fill="url(#newLeadsArea)" />
                    <Line type="monotone" dataKey="ma7" name="7T Schnitt" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Abschlussquote */}
            <Box display="flex" alignItems="center" justifyContent="center">
              <Box textAlign="center">
                <Text fontSize="sm" color="gray.600">Abschlussquote</Text>
                <Text fontSize="4xl" fontWeight="bold" color="green.600">{conversionRate}%</Text>
                <Text fontSize="xs" color="gray.500">{closedLeads} von {totalLeads} Leads</Text>
              </Box>
            </Box>
          </Box>

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
