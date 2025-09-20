import { useEffect, useState, useMemo } from "react";
import { 
  Box, 
  Flex, 
  Text, 
  Button, 
  Table, 
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Icon,
  VStack,
  HStack,
  Heading,
  SimpleGrid,
  Badge,
  Dialog,
  Portal
} from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiBarChart,
  FiUsers,
  FiTrendingUp,
  FiTarget,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiPhone,
  FiFlag,
  FiSettings
} from "react-icons/fi";
import {
  ComposedChart,
  Area,
  // LineChart removed (unused)
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  // CartesianGrid removed for no-tiles look
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CustomerGrowthPoint {
  date: string;
  newCustomers: number;
  cumulative: number;
}
interface FlagsPerCoach {
  coachId: string;
  name: string;
  last_name: string;
  red: number;
  yellow: number;
  green: number;
  total: number;
}

// New: meta for coach lines
interface CoachLineMeta {
  id: string;
  name: string;
  color: string;
}

// Inline Coach Detail types
interface CoachDetailData {
  coach: {
    id: string;
    name: string;
    last_name: string;
    email?: string;
    mobileNumber?: string;
  };
  days: number;
  customersCount: number;
  flagTotals: { red: number; yellow: number; green: number };
  customers: {
    id: string;
    name: string;
    last_name: string;
    red: number;
    yellow: number;
    green: number;
    total: number;
  }[];
  timeline: {
    date: string;
    red: number;
    yellow: number;
    green: number;
    total: number;
  }[];
  requirementFlags: {
    requirementId: string;
    title: string;
    red: number;
    yellow: number;
    green: number;
    total: number;
  }[];
}

type CoachSortKey = "name" | "email" | "mobile" | "yellow" | "red" | "total";

const dayOptions = [7, 14, 30, 90];

export function AdminAnalytics() {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const [daysGrowth, setDaysGrowth] = useState(30);
  const [growthData, setGrowthData] = useState<CustomerGrowthPoint[]>([]);
  const [growthLoading, setGrowthLoading] = useState(false);

  const [flagsCoachData, setFlagsCoachData] = useState<FlagsPerCoach[]>([]);
  const [flagsCoachLoading, setFlagsCoachLoading] = useState(false);

  // Overall customers (not limited to period)
  const [totalCustomersAll, setTotalCustomersAll] = useState<number>(0);

  // New: per-coach cumulative growth (multi-line)
  const [coachGrowthLoading, setCoachGrowthLoading] = useState(false);
  const [coachLines, setCoachLines] = useState<CoachLineMeta[]>([]);
  const [coachGrowthData, setCoachGrowthData] = useState<any[]>([]);
  // Hover display state for multi-coach chart
  const [coachHoverLabel, setCoachHoverLabel] = useState<string | null>(null);
  const [coachHoverItems, setCoachHoverItems] = useState<any[] | null>(null);

  // Selected Coach Details (inline section)
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [coachDays, setCoachDays] = useState<number>(30);
  const [coachDetailLoading, setCoachDetailLoading] = useState(false);
  const [coachDetail, setCoachDetail] = useState<CoachDetailData | null>(null);
  const [coachDetailGrowth, setCoachDetailGrowth] = useState<
    CustomerGrowthPoint[]
  >([]);
  const [coachDetailGrowthLoading, setCoachDetailGrowthLoading] =
    useState(false);
  const [coachRequirements, setCoachRequirements] = useState<any[]>([]);
  const [coachCustomerExtra, setCoachCustomerExtra] = useState<
    Record<string, { email?: string; mobileNumber?: string }>
  >({});
  const [coachSort, setCoachSort] = useState<{
    key: CoachSortKey;
    dir: "asc" | "desc";
  }>({ key: "total", dir: "desc" });


  const fetchGrowth = async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/admin/stats/customerGrowth?days=${daysGrowth}`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        setGrowthData(json.data || []);
      }
    } finally {
      setGrowthLoading(false);
    }
  };

  const fetchFlagsPerCoach = async () => {
    setFlagsCoachLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/admin/stats/flagsPerCoach",
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        setFlagsCoachData(json.data || []);
      }
    } finally {
      setFlagsCoachLoading(false);
    }
  };

  // const fetchRequirementFlags = async () => {
  //   setReqFlagsLoading(true);
  //   try {
  //     const res = await fetch(`http://localhost:3000/admin/stats/topRequirements?limit=${limitReqFlags}`, { headers });
  //     if (res.ok) { const json = await res.json(); setReqFlagsData(json.data || []); }
  //   } finally { setReqFlagsLoading(false); }
  // };

  // Fetch all active customers once for overall total
  const fetchTotalCustomersAll = async () => {
    try {
      const res = await fetch(`http://localhost:3000/users/getAllCustomer`, {
        headers,
      });
      if (res.ok) {
        const list = await res.json();
        setTotalCustomersAll(Array.isArray(list) ? list.length : 0);
      }
    } catch (_) {
      // ignore
    }
  };

  // New: build per-coach cumulative growth chart data
  const fetchCoachGrowthAll = async () => {
    if (!flagsCoachData.length) return;
    setCoachGrowthLoading(true);
    try {
      const palette = [
        "#ef4444", // red-500
        "#3b82f6", // blue-500
        "#10b981", // emerald-500
        "#f59e0b", // amber-500
        "#8b5cf6", // violet-500
        "#ec4899", // pink-500
        "#22d3ee", // cyan-400
        "#a3e635", // lime-400
        "#f97316", // orange-500
        "#64748b", // slate-500
      ];
      const sorted = [...flagsCoachData];
      // keep existing order (already sorted by total elsewhere if used), or sort by name
      // sorted.sort((a,b)=> (a.name+a.last_name).localeCompare(b.name+b.last_name));

      const dateMap: Record<string, any> = {};
      const linesMeta: CoachLineMeta[] = [];

      await Promise.all(
        sorted.map(async (c, idx) => {
          const res = await fetch(
            `http://localhost:3000/admin/stats/coachCustomerGrowth/${c.coachId}?days=${daysGrowth}`,
            { headers }
          );
          if (!res.ok) return;
          const json = await res.json();
          const series: CustomerGrowthPoint[] = json.data || [];
          const key = c.coachId; // use id as dataKey
          const color = palette[idx % palette.length];
          linesMeta.push({
            id: key,
            name: `${c.name || ""} ${c.last_name || ""}`.trim(),
            color,
          });
          series.forEach((p) => {
            if (!dateMap[p.date]) dateMap[p.date] = { date: p.date };
            dateMap[p.date][key] = p.cumulative;
          });
        })
      );

      const merged = Object.values(dateMap).sort((a: any, b: any) =>
        String(a.date).localeCompare(String(b.date))
      );

      setCoachLines(linesMeta);
      setCoachGrowthData(merged);
    } catch (e) {
      // noop
    } finally {
      setCoachGrowthLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowth();
  }, [daysGrowth]);
  useEffect(() => {
    fetchFlagsPerCoach();
  }, []);
  // useEffect(() => { fetchRequirementFlags(); }, [limitReqFlags]);

  useEffect(() => {
    fetchTotalCustomersAll();
  }, []);
  const sortedFlagsCoach = useMemo(
    () => [...flagsCoachData].sort((a, b) => b.total - a.total),
    [flagsCoachData]
  );

  // New: refetch multi-coach series when coach list or range changes
  useEffect(() => {
    fetchCoachGrowthAll();
  }, [flagsCoachData, daysGrowth]);

  // Auto-select first coach if no coach is selected and coaches are available
  useEffect(() => {
    if (!selectedCoachId && sortedFlagsCoach.length > 0) {
      setSelectedCoachId(sortedFlagsCoach[0].coachId);
    }
  }, [selectedCoachId, sortedFlagsCoach]);
  // (Removed flags chart; keep reqFlagsData only for potential KPI extensions)
  // const sortedFailures = useMemo(
  //   () => [...failureData].sort((a, b) => b.failures - a.failures),
  //   [failureData]
  // );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derived KPI values
  const newInPeriod = useMemo(
    () => growthData.reduce((s, c) => s + c.newCustomers, 0),
    [growthData]
  );

  // Preselect coach from query param, once
  useEffect(() => {
    const q = searchParams.get("coachId");
    if (q) setSelectedCoachId(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCoachChange = (value: string) => {
    setSelectedCoachId(value);
    if (value) setSearchParams({ coachId: value }, { replace: true } as any);
    else setSearchParams({}, { replace: true } as any);
  };

  // Sorting helper for coach customers
  const sortedCoachCustomers = useMemo(() => {
    if (!coachDetail) return [] as CoachDetailData["customers"];
    const arr = [...coachDetail.customers];
    const dir = coachSort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (coachSort.key) {
        case "name": {
          const an = `${a.name ?? ""} ${a.last_name ?? ""}`.trim();
          const bn = `${b.name ?? ""} ${b.last_name ?? ""}`.trim();
          return dir * an.localeCompare(bn, "de", { sensitivity: "base" });
        }
        case "email": {
          const ae = coachCustomerExtra[a.id]?.email ?? "";
          const be = coachCustomerExtra[b.id]?.email ?? "";
          return dir * ae.localeCompare(be, "de", { sensitivity: "base" });
        }
        case "mobile": {
          const am = coachCustomerExtra[a.id]?.mobileNumber ?? "";
          const bm = coachCustomerExtra[b.id]?.mobileNumber ?? "";
          return (
            dir *
            am.localeCompare(bm, "de", { numeric: true, sensitivity: "base" })
          );
        }
        case "yellow":
          return dir * (a.yellow - b.yellow);
        case "red":
          return dir * (a.red - b.red);
        case "total":
        default:
          return dir * (a.total - b.total);
      }
    });
    return arr;
  }, [coachDetail, coachSort, coachCustomerExtra]);

  const onCoachSort = (key: CoachSortKey) => {
    setCoachSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // Fetch selected coach detail bundles
  useEffect(() => {
    if (!selectedCoachId) {
      setCoachDetail(null);
      setCoachDetailGrowth([]);
      setCoachRequirements([]);
      setCoachCustomerExtra({});
      return;
    }

    // Details
    (async () => {
      setCoachDetailLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/admin/stats/coach/${selectedCoachId}?days=${coachDays}`,
          { headers }
        );
        if (res.ok) {
          const json = await res.json();
          setCoachDetail(json.data || null);
        }
      } finally {
        setCoachDetailLoading(false);
      }
    })();

    // Growth series (new & cumulative customers for this coach)
    (async () => {
      setCoachDetailGrowthLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/admin/stats/coachCustomerGrowth/${selectedCoachId}?days=${coachDays}`,
          { headers }
        );
        if (res.ok) {
          const json = await res.json();
          setCoachDetailGrowth(json.data || []);
        }
      } finally {
        setCoachDetailGrowthLoading(false);
      }
    })();

    // Requirements of this coach
    (async () => {
      try {
        const r = await fetch(
          `http://localhost:3000/requirement/getRequirementByCoach/${selectedCoachId}`,
          { headers }
        );
        if (r.ok) {
          const j = await r.json();
          setCoachRequirements(j.requirement || []);
        }
      } catch {}
    })();

    // Customers extra info (email, phone)
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/users/getCustomersByCoach/${selectedCoachId}`,
          { headers }
        );
        if (!res.ok) return;
        const customers = await res.json();
        const map = Object.fromEntries(
          (customers || []).map((c: any) => [
            c.id,
            { email: c.email, mobileNumber: c.mobileNumber },
          ])
        );
        setCoachCustomerExtra(map);
      } catch {}
    })();
  }, [selectedCoachId, coachDays]);

  const kpiCard = (
    label: string,
    value: string | number,
    sub?: string,
    color?: string,
    icon?: any
  ) => (
    <Card.Root
      key={label}
      bg="var(--color-surface)"
      borderWidth="1px"
      borderColor="var(--color-border)"
    >
      <CardBody>
        <Flex align="center" justify="space-between">
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="var(--color-muted)">{label}</Text>
            <Heading size="lg" color={color || "var(--color-text)"}>{value}</Heading>
            {sub && <Text fontSize="xs" color="var(--color-muted)">{sub}</Text>}
          </VStack>
          {icon && <Icon as={icon} color={color || "blue.500"} boxSize={6} />}
        </Flex>
      </CardBody>
    </Card.Root>
  );

  // Custom dark tooltip for multi-coach chart
  const CoachTooltip = ({ active, label, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box
        bg="var(--color-surface)"
        border="1px solid var(--color-border)"
        rounded="md"
        shadow="lg"
        p={2}
      >
        <Text fontSize="xs" color="var(--color-muted)" mb={1}>
          {label}
        </Text>
        <Box display="grid" gridTemplateColumns="1fr auto" gap={1}>
          {payload.map((p: any) => (
            <Box key={p.dataKey} display="contents">
              <Box display="flex" alignItems="center" gap="6px">
                <Box w="8px" h="8px" bg={p.color} rounded="full" />
                <Text fontSize="xs" color="var(--color-text)">
                  {p.name}
                </Text>
              </Box>
              <Text fontSize="xs" color="var(--color-text)" textAlign="right">
                {p.value?.toLocaleString?.() ?? p.value}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

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
              <Icon as={FiBarChart} boxSize={6} />
            </Flex>
            <VStack align="start" gap={0}>
              <Heading size="lg">Admin Statistiken</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                Übersicht und Analyse der Systemdaten
              </Text>
            </VStack>
          </Flex>
        </CardHeader>
      </Card.Root>

      {/* KPI Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4} mb={6}>
        {kpiCard(
          "Gesamt Kunden",
          totalCustomersAll.toLocaleString(),
          "Aktiv gesamt",
          "blue.500",
          FiUsers
        )}
        {kpiCard(
          "Neue Kunden",
          newInPeriod.toLocaleString(),
          `In den letzten ${daysGrowth} Tagen`,
          "green.500",
          FiTrendingUp
        )}
        {kpiCard(
          "Coaches",
          sortedFlagsCoach.length.toLocaleString(),
          "Aktive Trainer",
          "purple.500",
          FiUser
        )}
        {kpiCard(
          "Flaggen Total",
          sortedFlagsCoach.reduce((sum, c) => sum + c.total, 0).toLocaleString(),
          "Alle Coaches",
          "orange.500",
          FiFlag
        )}
      </SimpleGrid>

      {/* Filter Controls */}
      <Card.Root mb={6}>
        <CardBody>
          <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
            <HStack gap={4}>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="semibold">Zeitraum</Text>
                <select
                  value={daysGrowth}
                  onChange={(e) => setDaysGrowth(parseInt(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "0.875rem",
                    minWidth: "100px"
                  }}
                >
                  {dayOptions.map((o) => (
                    <option key={o} value={o}>
                      {o} Tage
                    </option>
                  ))}
                </select>
              </VStack>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchGrowth}
                disabled={growthLoading}
                leftIcon={growthLoading ? <Spinner size="xs" /> : <Icon as={FiRefreshCw} />}
              >
                {growthLoading ? "Lade..." : "Aktualisieren"}
              </Button>
            </HStack>
            <Text fontSize="xs" color="var(--color-muted)">
              Letzte Aktualisierung: {new Date().toLocaleTimeString()}
            </Text>
          </Flex>
        </CardBody>
      </Card.Root>

      {/* Charts */}
      <Card.Root mb={6}>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Icon as={FiTrendingUp} color="green.500" />
            <VStack align="start" gap={0}>
              <Heading size="md">Kundenwachstum pro Coach</Heading>
              <Text fontSize="sm" color="var(--color-muted)">Kumulatives Wachstum aller Coaches</Text>
            </VStack>
          </Flex>
        </CardHeader>
        <CardBody>
          {coachHoverLabel && coachHoverItems?.length ? (
            <Box
              position="absolute"
              top="10px"
              right="12px"
              bg="var(--color-surface)"
              border="1px solid var(--color-border)"
              rounded="md"
              shadow="lg"
              p={2}
              zIndex={1}
            >
              <Text fontSize="xs" color="var(--color-muted)" mb={1}>
                {coachHoverLabel}
              </Text>
              <Box display="grid" gridTemplateColumns="1fr auto" gap={1}>
                {coachHoverItems.map((p: any) => (
                  <Box key={p.dataKey} display="contents">
                    <Box display="flex" alignItems="center" gap="6px">
                      <Box w="8px" h="8px" bg={p.color} rounded="full" />
                      <Text fontSize="xs" color="var(--color-text)">
                        {p.name}
                      </Text>
                    </Box>
                    <Text
                      fontSize="xs"
                      color="var(--color-text)"
                      textAlign="right"
                    >
                      {p.value?.toLocaleString?.() ?? p.value}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box h={{ base: 260, md: 300 }}>
            {coachGrowthLoading ? (
              <Flex justify="center" align="center" h="100%">
                <VStack gap={3}>
                  <Spinner size="lg" color="green.500" />
                  <Text fontSize="sm" color="var(--color-muted)">Lade Coach-Wachstum...</Text>
                </VStack>
              </Flex>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={coachGrowthData}
                  onMouseMove={(s: any) => {
                    if (s && s.activeLabel && s.activePayload) {
                      setCoachHoverLabel(String(s.activeLabel));
                      setCoachHoverItems(s.activePayload);
                    }
                  }}
                  onMouseLeave={() => {
                    setCoachHoverLabel(null);
                    setCoachHoverItems(null);
                  }}
                >
                  <XAxis
                    dataKey="date"
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReTooltip
                    content={<CoachTooltip />}
                    cursor={{
                      stroke: "rgba(255,255,255,0.12)",
                      strokeWidth: 1,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "var(--color-muted)" }}
                    iconType="plainline"
                    formatter={(v: any) => (
                      <span style={{ color: "var(--color-muted)" }}>{v}</span>
                    )}
                  />
                  {coachLines.map((l) => (
                    <Line
                      key={l.id}
                      type="monotone"
                      dataKey={l.id}
                      name={l.name}
                      stroke={l.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardBody>
      </Card.Root>

      {/* Coach Details Section */}
      <Card.Root mb={6}>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Icon as={FiUser} color="blue.500" />
            <VStack align="start" gap={0}>
              <Heading size="md">Coach Details</Heading>
              <Text fontSize="sm" color="var(--color-muted)">Detaillierte Analyse einzelner Coaches</Text>
            </VStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
            <HStack gap={4}>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="semibold">Coach auswählen</Text>
                <select
                  value={selectedCoachId}
                  onChange={(e) => handleCoachChange(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "0.875rem",
                    minWidth: "200px"
                  }}
                  disabled={flagsCoachLoading}
                >
                  <option value="">
                    {flagsCoachLoading ? "Lade Coaches…" : "– Coach wählen –"}
                  </option>
                  {sortedFlagsCoach.map((c) => (
                    <option key={c.coachId} value={c.coachId}>
                      {`${c.name || ""} ${c.last_name || ""}`.trim()}
                    </option>
                  ))}
                </select>
              </VStack>
              <VStack align="start" gap={1}>
                <Text fontSize="sm" fontWeight="semibold">Zeitraum</Text>
                <select
                  value={coachDays}
                  onChange={(e) => setCoachDays(parseInt(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    fontSize: "0.875rem",
                    minWidth: "100px"
                  }}
                >
                  {dayOptions.map((o) => (
                    <option key={o} value={o}>
                      {o} Tage
                    </option>
                  ))}
                </select>
              </VStack>
            </HStack>
            {coachDetail && (
              <VStack align={{ base: "start", md: "end" }} gap={1}>
                <Heading size="md">
                  {coachDetail.coach.name} {coachDetail.coach.last_name}
                </Heading>
                <HStack gap={4} fontSize="sm" color="var(--color-muted)">
                  <Text>Kunden: {coachDetail.customersCount.toLocaleString()}</Text>
                  <Text>Neukunden ({coachDays}T): {coachDetailGrowth.reduce((s, p) => s + (p.newCustomers || 0), 0).toLocaleString()}</Text>
                </HStack>
              </VStack>
            )}
          </Flex>

          {/* Coach Growth Chart + Requirements */}
          {selectedCoachId ? (
            <SimpleGrid columns={{ base: 1, xl: 3 }} gap={6} mb={6}>
              <Card.Root gridColumn={{ base: "1", xl: "1 / 3" }} bg="rgba(59, 130, 246, 0.05)" borderColor="blue.200">
                <CardHeader>
                  <Flex align="center" gap={2}>
                    <Icon as={FiTrendingUp} color="blue.500" boxSize={4} />
                    <Text fontWeight="semibold">Kundenwachstum ({coachDays} Tage)</Text>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <Box height={260}>
                    {coachDetailGrowthLoading ? (
                      <Flex justify="center" align="center" h="100%">
                        <VStack gap={3}>
                          <Spinner size="lg" color="blue.500" />
                          <Text fontSize="sm" color="var(--color-muted)">Lade Wachstumsdaten...</Text>
                        </VStack>
                      </Flex>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={coachDetailGrowth}>
                      <defs>
                        <linearGradient id="coachNew" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ReTooltip />
                      <Legend wrapperStyle={{ color: "var(--color-muted)" }} />
                      <Area
                        type="monotone"
                        dataKey="newCustomers"
                        name="Neue Kunden"
                        stroke="#3b82f6"
                        fillOpacity={0.35}
                        fill="url(#coachNew)"
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        name="Kumulativ"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                      />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </CardBody>
              </Card.Root>

              <Card.Root>
                <CardHeader>
                  <Flex align="center" gap={2}>
                    <Icon as={FiTarget} color="purple.500" boxSize={4} />
                    <Text fontWeight="semibold">Coach Kriterien ({coachRequirements.length})</Text>
                  </Flex>
                </CardHeader>
                <CardBody>
                  {coachRequirements.length === 0 ? (
                    <Flex justify="center" align="center" py={8}>
                      <VStack gap={3}>
                        <Icon as={FiSettings} boxSize={12} color="var(--color-muted)" />
                        <Text color="var(--color-muted)" textAlign="center">
                          Keine Kriterien vorhanden
                        </Text>
                      </VStack>
                    </Flex>
                  ) : (
                    <VStack gap={3} align="stretch" maxH="340px" overflowY="auto">
                      {coachRequirements.map((r: any) => (
                        <Card.Root 
                          key={r.id}
                          bg="rgba(168, 85, 247, 0.05)"
                          borderColor="purple.200"
                          size="sm"
                        >
                          <CardBody p={3}>
                            <VStack align="stretch" gap={2}>
                              <Text fontSize="sm" fontWeight="semibold">{r.title}</Text>
                              {r.description ? (
                                <Text fontSize="xs" color="var(--color-muted)" whiteSpace="pre-wrap">
                                  {r.description}
                                </Text>
                              ) : (
                                <Text fontSize="xs" color="var(--color-muted)" fontStyle="italic">
                                  Keine Beschreibung verfügbar
                                </Text>
                              )}
                            </VStack>
                          </CardBody>
                        </Card.Root>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              </Card.Root>
            </SimpleGrid>
          ) : (
            <Card.Root mb={6}>
              <CardBody>
                <Flex justify="center" align="center" py={12}>
                  <VStack gap={3}>
                    <Icon as={FiUser} boxSize={16} color="var(--color-muted)" />
                    <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                      Bitte wähle einen Coach aus, um detaillierte Statistiken anzuzeigen.
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>
          )}

          {/* Customer Cards */}
          {coachDetail && (
            <Card.Root>
              <CardHeader>
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={2}>
                    <Icon as={FiUsers} color="green.500" boxSize={4} />
                    <Text fontWeight="semibold">Kunden ({coachDetail.customersCount})</Text>
                  </Flex>
                  <HStack gap={2}>
                    <Button size="sm" variant={coachSort.key === 'name' ? 'solid' : 'outline'} onClick={() => onCoachSort('name')}>
                      Name {coachSort.key==='name' && (coachSort.dir==='asc' ? '↑':'↓')}
                    </Button>
                    <Button size="sm" variant={coachSort.key === 'red' ? 'solid' : 'outline'} onClick={() => onCoachSort('red')} colorScheme="red">
                      Flags {coachSort.key==='red' && (coachSort.dir==='asc' ? '↑':'↓')}
                    </Button>
                  </HStack>
                </Flex>
              </CardHeader>
              <CardBody>
                {sortedCoachCustomers.length === 0 ? (
                  <Flex justify="center" align="center" py={12}>
                    <VStack gap={4}>
                      <Icon as={FiUsers} boxSize={16} color="var(--color-muted)" />
                      <Heading size="md" color="var(--color-muted)">
                        Keine Kunden gefunden
                      </Heading>
                      <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                        Dieser Coach hat noch keine Kunden zugewiesen.
                      </Text>
                    </VStack>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                    {sortedCoachCustomers.map((customer) => {
                      const riskLevel = customer.red >= 10 ? 'lost' : customer.red >= 5 ? 'at-risk' : 'safe';
                      
                      return (
                        <Card.Root
                          key={customer.id}
                          _hover={{
                            transform: "translateY(-2px)",
                            borderColor: riskLevel === 'lost' ? "red.300" : riskLevel === 'at-risk' ? "orange.300" : "green.300",
                            cursor: "pointer"
                          }}
                          transition="all 0.2s ease"
                          borderWidth="1px"
                          borderColor={riskLevel === 'lost' ? "red.200" : riskLevel === 'at-risk' ? "orange.200" : "var(--color-border)"}
                          bg="var(--color-surface)"
                          onClick={() => navigate(`/dashboard/CUSTOMER?userId=${customer.id}`)}
                        >
                          <CardBody>
                            <VStack align="stretch" gap={4}>
                              {/* Header */}
                              <Flex align="start" justify="space-between" gap={3}>
                                <Flex align="center" gap={3} flex={1}>
                                  <Flex 
                                    w={10} h={10} 
                                    align="center" justify="center" 
                                    rounded="full" 
                                    bg={riskLevel === 'lost' ? "red.500" : riskLevel === 'at-risk' ? "orange.500" : "green.500"}
                                    color="white"
                                    fontSize="sm"
                                    fontWeight="bold"
                                  >
                                    {customer.name?.charAt(0)}{customer.last_name?.charAt(0)}
                                  </Flex>
                                  <VStack align="start" gap={0} flex={1}>
                                    <Text fontWeight="semibold" lineHeight="1.3">
                                      {customer.name} {customer.last_name}
                                    </Text>
                                    <HStack gap={2}>
                                      {riskLevel === 'lost' && (
                                        <Badge colorScheme="red" variant="solid" size="sm">
                                          <Icon as={FiFlag} mr={1} boxSize={3} />
                                          Verloren
                                        </Badge>
                                      )}
                                      {riskLevel === 'at-risk' && (
                                        <Badge colorScheme="orange" variant="solid" size="sm">
                                          <Icon as={FiFlag} mr={1} boxSize={3} />
                                          Gefährdet
                                        </Badge>
                                      )}
                                      {riskLevel === 'safe' && (
                                        <Badge colorScheme="green" variant="subtle" size="sm">
                                          OK
                                        </Badge>
                                      )}
                                    </HStack>
                                  </VStack>
                                </Flex>
                              </Flex>
                              
                              {/* Contact Info */}
                              <VStack gap={2} align="stretch">
                                {coachCustomerExtra[customer.id]?.email && (
                                  <Flex align="center" gap={2}>
                                    <Icon as={FiMail} boxSize={4} color="var(--color-muted)" />
                                    <Text fontSize="sm" color="var(--color-muted)">
                                      {coachCustomerExtra[customer.id].email}
                                    </Text>
                                  </Flex>
                                )}
                                {coachCustomerExtra[customer.id]?.mobileNumber && (
                                  <Flex align="center" gap={2}>
                                    <Icon as={FiPhone} boxSize={4} color="var(--color-muted)" />
                                    <Text fontSize="sm" color="var(--color-muted)">
                                      {coachCustomerExtra[customer.id].mobileNumber}
                                    </Text>
                                  </Flex>
                                )}
                              </VStack>
                              
                              {/* Flags */}
                              {(customer.yellow > 0 || customer.red > 0) && (
                                <HStack gap={3}>
                                  {customer.yellow > 0 && (
                                    <Flex align="center" gap={1}>
                                      <Box w={3} h={3} rounded="full" bg="yellow.400" />
                                      <Text fontSize="sm" fontWeight="medium" color="yellow.600">
                                        {customer.yellow}
                                      </Text>
                                    </Flex>
                                  )}
                                  {customer.red > 0 && (
                                    <Flex align="center" gap={1}>
                                      <Box w={3} h={3} rounded="full" bg="red.400" />
                                      <Text fontSize="sm" fontWeight="medium" color="red.600">
                                        {customer.red}
                                      </Text>
                                    </Flex>
                                  )}
                                </HStack>
                              )}
                            </VStack>
                          </CardBody>
                        </Card.Root>
                      );
                    })}
                  </SimpleGrid>
                )}
              </CardBody>
            </Card.Root>
          )}

          {coachDetailLoading && (
            <Flex justify="center" py={6}>
              <VStack gap={3}>
                <Spinner size="lg" color="blue.500" />
                <Text fontSize="sm" color="var(--color-muted)">Lade Coach Details...</Text>
              </VStack>
            </Flex>
          )}
        </CardBody>
      </Card.Root>

    </Box>
  );
}
export default AdminAnalytics;
