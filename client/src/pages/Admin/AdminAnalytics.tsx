import { useEffect, useState, useMemo } from "react";
import { Box, Flex, Text, Button, Table, Spinner } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const selectStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "0.8rem",
};
const SimpleSelect = ({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(parseInt(e.target.value))}
    style={selectStyle}
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o} Tage
      </option>
    ))}
  </select>
);

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
  // New: refetch multi-coach series when coach list or range changes
  useEffect(() => {
    fetchCoachGrowthAll();
  }, [flagsCoachData, daysGrowth]);

  const sortedFlagsCoach = useMemo(
    () => [...flagsCoachData].sort((a, b) => b.total - a.total),
    [flagsCoachData]
  );
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
    color?: string
  ) => (
    <Box
      key={label}
      p={4}
      rounded="lg"
      borderWidth="1px"
      borderColor="var(--color-border)"
      bg="linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)"
      backdropFilter="blur(6px)"
      shadow="xs"
      position="relative"
      overflow="hidden"
    >
      <Text
        fontSize="xs"
        fontWeight="medium"
        color="var(--color-muted)"
        textTransform="uppercase"
        letterSpacing="0.5px"
      >
        {label}
      </Text>
      <Text
        fontSize="2xl"
        fontWeight="bold"
        lineHeight="1.1"
        color={color || "var(--color-text)"}
      >
        {value}
      </Text>
      {sub && (
        <Text fontSize="xs" color="var(--color-muted)" mt={1}>
          {sub}
        </Text>
      )}
      <Box
        position="absolute"
        right="-16px"
        top="-16px"
        w="70px"
        h="70px"
        rounded="full"
        bg="whiteAlpha.100"
      />
    </Box>
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
    <Flex
      direction="column"
      gap={8}
      maxW="7xl"
      mx="auto"
      w="100%"
      px={{ base: 3, md: 6 }}
      py={6}
    >
      {/* KPI Row */}
      <Flex gap={4} wrap="wrap">
        {kpiCard(
          "Gesamt Kunden",
          totalCustomersAll.toLocaleString(),
          "Aktiv gesamt"
        )}
        {kpiCard(
          "Neue Kunden",
          newInPeriod.toLocaleString(),
          "Summe im Zeitraum",
          "teal.600"
        )}
      </Flex>

      {/* Filter Bar */}
      <Flex
        p={3}
        rounded="lg"
        borderWidth="1px"
        borderColor="var(--color-border)"
        bg="var(--color-surface)"
        align="center"
        gap={6}
        wrap="wrap"
        shadow="xs"
      >
        <Flex align="center" gap={2}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.600">
            Wachstum
          </Text>
          <SimpleSelect
            value={daysGrowth}
            onChange={setDaysGrowth}
            options={dayOptions}
          />
          <Button
            size="xs"
            onClick={fetchGrowth}
            disabled={growthLoading}
            variant="outline"
          >
            {growthLoading ? "..." : "Reload"}
          </Button>
        </Flex>
        <Flex ml="auto" fontSize="xs" color="gray.500">
          Letzte Aktualisierung: {new Date().toLocaleTimeString()}
        </Flex>
      </Flex>

      {/* Charts Grid */}
      <Box display="grid" gap={6}>
        {/* Growth per Coach (cumulative multi-line) */}
        <Box
          p={5}
          borderWidth="1px"
          borderColor="var(--color-border)"
          rounded="xl"
          bg="var(--color-surface)"
          shadow="sm"
          position="relative"
        >
          <Flex justify="space-between" align="start" mb={3}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold">
                Kundenwachstum pro Coach (kumulativ)
              </Text>
              <Text fontSize="xs" color="gray.500">
                Gesamt Kunden je Coach
              </Text>
            </Box>
          </Flex>
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
          <Box height={260}>
            {coachGrowthLoading ? (
              <Flex justify="center" align="center" h="100%">
                <Spinner size="sm" />
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
        </Box>
      </Box>

      {/* Coach Details Section */}
      <Text
        fontSize={{ base: "xl", md: "2xl" }}
        fontWeight="bold"
        textAlign="center"
        color="var(--color-text)"
      >
        Coach Details
      </Text>
      <Box
        p={6}
        borderWidth="1px"
        borderColor="var(--color-border)"
        rounded="xl"
        bg="var(--color-surface)"
        shadow="sm"
      >
        <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold">
              Coach auswählen
            </Text>
            <Flex gap={3} align="center" mt={1}>
              <select
                value={selectedCoachId}
                onChange={(e) => handleCoachChange(e.target.value)}
                style={selectStyle}
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
              <SimpleSelect
                value={coachDays}
                onChange={setCoachDays}
                options={dayOptions}
              />
            </Flex>
          </Box>
          {coachDetail && (
            <Box textAlign={{ base: "left", md: "right" }}>
              <Text fontSize="lg" fontWeight="bold">
                {coachDetail.coach.name} {coachDetail.coach.last_name}
              </Text>
              <Text fontSize="xs" color="var(--color-muted)">
                Kunden gesamt: {coachDetail.customersCount.toLocaleString()} •
                Neukunden ({coachDays}T):{" "}
                {coachDetailGrowth
                  .reduce((s, p) => s + (p.newCustomers || 0), 0)
                  .toLocaleString()}
              </Text>
            </Box>
          )}
        </Flex>

        {/* Coach Growth (selected) */}
        {selectedCoachId ? (
          <Box p={0} mb={6}>
            <Text fontWeight="semibold" mb={2}>
              Kundenwachstum ({coachDays} Tage)
            </Text>
            <Box height={260}>
              {coachDetailGrowthLoading ? (
                <Flex justify="center" align="center" h="100%">
                  <Spinner size="sm" />
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
          </Box>
        ) : (
          <Box mb={6}>
            <Text fontSize="sm" color="var(--color-muted)">
              Bitte oben einen Coach auswählen.
            </Text>
          </Box>
        )}

        {/* Customers + Requirements */}
        {coachDetail && (
          <Flex gap={6} wrap="wrap">
            <Box
              flex="2"
              minW="480px"
              p={5}
              borderWidth="1px"
              rounded="lg"
              bg="var(--color-surface)"
              borderColor="var(--color-border)"
            >
              <Text fontWeight="semibold" mb={2}>
                Kunden
              </Text>
              <Table.Root
                size='sm' stickyHeader interactive className="admin-table"
              >
                <Table.Header>
                  <Table.Row bg="#0d1424" borderBottom="1px solid #0a0f18">
                    <Table.ColumnHeader
                      onClick={() => onCoachSort("name")}
                      cursor="pointer"
                      aria-sort={
                        coachSort.key === "name"
                          ? coachSort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Flex align="center" gap={1}>
                        <span>Name</span>
                        {coachSort.key === "name" && (
                          <Text
                            as="span"
                            fontSize="xs"
                            color="var(--color-muted)"
                          >
                            {coachSort.dir === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      onClick={() => onCoachSort("email")}
                      cursor="pointer"
                      aria-sort={
                        coachSort.key === "email"
                          ? coachSort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Flex align="center" gap={1}>
                        <span>E-Mail</span>
                        {coachSort.key === "email" && (
                          <Text
                            as="span"
                            fontSize="xs"
                            color="var(--color-muted)"
                          >
                            {coachSort.dir === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      onClick={() => onCoachSort("mobile")}
                      cursor="pointer"
                      aria-sort={
                        coachSort.key === "mobile"
                          ? coachSort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Flex align="center" gap={1}>
                        <span>Telefon</span>
                        {coachSort.key === "mobile" && (
                          <Text
                            as="span"
                            fontSize="xs"
                            color="var(--color-muted)"
                          >
                            {coachSort.dir === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      textAlign="right"
                      onClick={() => onCoachSort("yellow")}
                      cursor="pointer"
                      aria-sort={
                        coachSort.key === "yellow"
                          ? coachSort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Flex align="center" gap={1} justify="flex-end">
                        <span>Gelb</span>
                        {coachSort.key === "yellow" && (
                          <Text
                            as="span"
                            fontSize="xs"
                            color="var(--color-muted)"
                          >
                            {coachSort.dir === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      textAlign="right"
                      onClick={() => onCoachSort("red")}
                      cursor="pointer"
                      aria-sort={
                        coachSort.key === "red"
                          ? coachSort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Flex align="center" gap={1} justify="flex-end">
                        <span>Rot</span>
                        {coachSort.key === "red" && (
                          <Text
                            as="span"
                            fontSize="xs"
                            color="var(--color-muted)"
                          >
                            {coachSort.dir === "asc" ? "▲" : "▼"}
                          </Text>
                        )}
                      </Flex>
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedCoachCustomers.map((c) => (
                    <Table.Row
                      key={c.id}
                      bg="var(--color-surface)"
                      borderBottom="1px solid #0a0f18"
                      _hover={{ bg: "rgba(0,0,0,0.22)", cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/dashboard/CUSTOMER?userId=${c.id}`)
                      }
                    >
                      <Table.Cell>
                        {c.name} {c.last_name}
                      </Table.Cell>
                      <Table.Cell>
                        {coachCustomerExtra[c.id]?.email || "—"}
                      </Table.Cell>
                      <Table.Cell>
                        {coachCustomerExtra[c.id]?.mobileNumber || "—"}
                      </Table.Cell>
                      <Table.Cell textAlign="right" color="yellow.600">
                        {c.yellow}
                      </Table.Cell>
                      <Table.Cell textAlign="right" color="red.600">
                        {c.red}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>

            <Box
              flex="1"
              minW="320px"
              p={5}
              borderWidth="1px"
              rounded="lg"
              bg="var(--color-surface)"
              borderColor="var(--color-border)"
            >
              <Text fontWeight="semibold" mb={3}>
                Kriterien des Coaches
              </Text>
              <Flex direction="column" gap={2} maxH="420px" overflowY="auto">
                {coachRequirements.length === 0 ? (
                  <Text color="var(--color-muted)">
                    Keine Kriterien vorhanden.
                  </Text>
                ) : (
                  coachRequirements.map((r: any) => (
                    <Flex
                      key={r.id}
                      justify="space-between"
                      p={2}
                      borderWidth="1px"
                      borderColor="var(--color-border)"
                      rounded="md"
                    >
                      <Text>{r.title}</Text>
                    </Flex>
                  ))
                )}
              </Flex>
            </Box>
          </Flex>
        )}

        {coachDetailLoading && (
          <Flex justify="center" py={6}>
            <Spinner />
          </Flex>
        )}
      </Box>

      {/* End Coach Details Section */}
    </Flex>
  );
}
export default AdminAnalytics;
