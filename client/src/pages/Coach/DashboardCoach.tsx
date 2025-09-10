import {
  Box,
  Flex,
  Grid,
  Text,
  Icon,
  Spinner,
  Progress,
  HStack,
  Input,
  Table,
  Badge,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import {  CgProfile } from "react-icons/cg";
import { FcQuestions } from "react-icons/fc";
import { useNavigate, useSearchParams } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { kpiColor } from "@/components/dashboard/theme";
import {
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
  Area,
} from "recharts";

export default function DashboardCoach() {
  // Base data
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [countAffiliate, setCountAffiliate] = useState<number>(0);
  const [countCustomer, setCountCustomer] = useState<number>(0);
  const [cRForCustomers, setCRForCustomers] = useState<number>(0);

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();

  const isAdmin = coach?.role === "ADMIN";

  // Admin view: load target coach info
  const [coachInfo, setCoachInfo] = useState<any>(null);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  } as const;

  const fetchCoachInfo = async () => {
    if (!isAdmin || !userId) return; // only when Admin views a specific coach
    try {
      const res = await fetch(`http://localhost:3000/users/getUser/${userId}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setCoachInfo({
          id: data.id,
          name: data.name,
          last_name: data.last_name,
          isDeleted: data.isDeleted,
        });
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchCoachInfo();
  }, [userId, isAdmin]);

  // Force dark theme surfaces via CSS variables
  const borderCol = "var(--color-border)";
  const cardBg = "var(--color-surface)";
  const handleClick = (destination: string) => navigate(destination);

  // Fetch customers and KPIs
  const fetchCustomer = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/users/getCustomersByCoach/${
          userId == null ? (coach as any).id : userId
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data: any[] = await res.json();

      setCustomerList(data);
      setCountCustomer(data.filter((c) => !c.isAffiliate).length);
      setCountAffiliate(data.filter((c) => c.isAffiliate).length);

      let risk = 0;
      let lost = 0;
      data.forEach((customer) => {
        const redFlags = customer.flags.filter(
          (f: any) => f.color === "RED"
        ).length;
        if (redFlags >= 10) lost += 1;
        else if (redFlags >= 5) risk += 1;
      });

      // Survey Completion
      const resCR = await fetch(
        `http://localhost:3000/surveys/getSurveyCompletionRateForCustomersByCoach/${
          userId == null ? (coach as any).id : userId
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const cr = await resCR.json();
      setCRForCustomers(truncateToTwoDecimals(cr) ?? 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coach?.id]);

  function truncateToTwoDecimals(num: number): number {
    return Math.trunc(num * 100) / 100;
  }

  // Dummy series generator for fallback
  function generateDummySeries(days: number, key: "newCustomers") {
    const series: any[] = [];
    const from = new Date();
    from.setDate(from.getDate() - days);
    let cursor = new Date(from);
    let cumulative = 0;
    while (cursor <= new Date()) {
      const v = Math.floor(Math.random() * 4); // 0..3
      cumulative += v;
      const date = cursor.toISOString().slice(0, 10);
      series.push({ date, [key]: v, cumulative });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  }

  // Charts (same style as Admin)
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
  const dayOptions = [7, 30, 90];

  type CustPoint = { date: string; newCustomers: number; cumulative: number };

  const [custDays, setCustDays] = useState(30);
  const [custGrowth, setCustGrowth] = useState<CustPoint[]>([]);
  const [custLoading, setCustLoading] = useState(false);

  // Admin-only customer list helpers
  const [search, setSearch] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customerList;
    return customerList.filter((c:any) => (
      ((c.name || "") + " " + (c.last_name || "")).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.mobileNumber || "").toLowerCase().includes(q)
    ));
  }, [customerList, search]);

  const roleBadge = (c:any) => {
    const both = c?.isAffiliate && c?.isCustomer;
    const onlyAff = c?.isAffiliate && !c?.isCustomer;
    const onlyCust = !c?.isAffiliate && c?.isCustomer;
    return (
      <HStack gap={1} wrap="wrap">
        {both && <Badge colorScheme="purple">Affiliate & Kunde</Badge>}
        {onlyAff && <Badge colorScheme="teal">Affiliate</Badge>}
        {onlyCust && <Badge colorScheme="blue">Kunde</Badge>}
        {!both && !onlyAff && !onlyCust && <Badge>—</Badge>}
      </HStack>
    );
  };

  const flagCount = (c:any, color:'RED'|'YELLOW'|'GREEN') => (c?.flags?.filter((f:any)=> f.color===color).length) || 0;

  // Coach-specific dashboard: render logic
  const coachId = userId == null ? coach?.id : userId;

  const fetchCoachCustomerGrowth = async () => {
    if (!coachId) return;
    setCustLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/admin/stats/coachCustomerGrowth/${coachId}?days=${custDays}`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        setCustGrowth(json.data || []);
      }
    } finally {
      setCustLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachCustomerGrowth();
  }, [custDays, coachId]);

  // Derived/fallback series
  const custSeries =
    custGrowth && custGrowth.length
      ? custGrowth
      : (generateDummySeries(custDays, "newCustomers") as any[]);

  // Custom dark tooltip for growth chart
  const GrowthTooltip = ({ active, label, payload }: any) => {
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

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header banner (like Admin) */}
      <Box
        mb={8}
        p={{ base: 5, md: 8 }}
        bg={cardBg}
        borderWidth="1px"
        borderColor={borderCol}
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" top="-40" right="-40" w="80" h="80" bg="whiteAlpha.100" rounded="full" />
        <Flex align="center" justify="space-between" gap={4} flexWrap="wrap">
          <Box>
            <Text color="var(--color-text)" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold">
              {isAdmin && coachInfo ? `${coachInfo.name} ${coachInfo.last_name}` : "Coach Dashboard"}
            </Text>
            <Text color="var(--color-text)" fontSize={{ base: "sm" }}>
              Übersicht über Wachstum und Kunden
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* KPI Grid */}
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2,1fr)",
          xl: "repeat(4,1fr)",
        }}
        gap={5}
        mt={6}
        mb={8}
      >
        <KpiCard
          title="Gesamte Nutzer"
          value={customerList.length}
          subtitle={`${countAffiliate} Affiliates • ${countCustomer} Kunden`}
          gradient={kpiColor("users")}
          icon={<CgProfile />}
          onClick={() => handleClick("/customerList")}
        />
        <Box
          borderRadius="lg"
          borderWidth={1}
          m={1}
          mt={0}
          bg={cardBg}
          borderColor={borderCol}
          p={5}
          _hover={{
            cursor: "pointer",
            bg: 'rgba(255,255,255,0.04)',
          }}
          onClick={() => handleClick("/survey/surveyAnswers")}
        >
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="semibold">Umfragen</Text>
            <Icon as={FcQuestions} />
          </Flex>
          <Progress.Root value={cRForCustomers ?? 0}>
            <HStack>
              <Progress.Label w="90px">Kunden</Progress.Label>
              <Progress.Track flex="1">
                <Progress.Range />
              </Progress.Track>
              <Progress.ValueText>{cRForCustomers ?? 0}%</Progress.ValueText>
            </HStack>
          </Progress.Root>
        </Box>
      </Grid>

      {/* Charts statt Kundenliste */}
      <Box
        p={5}
        mx="auto"
        borderRadius="2xl"
        bg={cardBg}
        borderWidth={1}
        borderColor={borderCol}
        shadow="sm"
      >
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3} mb={4}>
          <Box>
            <Text fontSize="lg" fontWeight="semibold" color="blue.700">Kundenwachstum</Text>
            <Text fontSize="xs" color="gray.600">Neue Kunden vs. kumulativ</Text>
          </Box>
          <Flex align="center" gap={2}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.600">Zeitraum</Text>
            <SimpleSelect value={custDays} onChange={setCustDays} options={dayOptions} />
          </Flex>
        </Flex>

        <Box height={320}>
          {custLoading ? (
            <Flex justify="center" align="center" h="100%"><Spinner size="sm" /></Flex>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={custSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="custNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                <ReTooltip content={<GrowthTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: 'var(--color-muted)' }} iconType="plainline" formatter={(v: any) => <span style={{ color: 'var(--color-muted)' }}>{v}</span>} />
                <Area type="monotone" dataKey="newCustomers" name="Neue Kunden" stroke="#2563eb" fillOpacity={0.35} fill="url(#custNew)" dot={false} activeDot={false} />
                <Line type="monotone" dataKey="cumulative" name="Kumulativ" stroke="#8f95a1ff" dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Box>

      {/* Admin-only: Kundenliste des Coaches */}
      {isAdmin && !!userId && (
        <Box p={5} mx="auto" borderRadius="lg" m={5} bg={cardBg} borderWidth={1} borderColor={borderCol}>
          <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
            <Box>
              <Text fontSize="lg" fontWeight="semibold">Kundenliste</Text>
              <Text fontSize="xs" color="gray.500">Nur sichtbar für Admins • {filteredCustomers.length} Kunden</Text>
            </Box>
            <Input placeholder="Kunde suchen…" maxW={{ base: '100%', md: '300px' }} value={search} onChange={e=> setSearch(e.target.value)} />
          </Flex>
          <Table.ScrollArea borderWidth="1px" rounded="md" height="55vh">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row bg="rgba(255,255,255,0.04)">
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>E-Mail</Table.ColumnHeader>
                  <Table.ColumnHeader>Rolle</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Flags (Y/R)</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredCustomers.map((c:any) => (
                  <Table.Row
                    key={c.id}
                    _hover={{ bg: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/CUSTOMER?userId=${c.id}`)}
                  >
                    <Table.Cell>{c.name} {c.last_name}</Table.Cell>
                    <Table.Cell>{c.email || '—'}</Table.Cell>
                    <Table.Cell>{roleBadge(c)}</Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack justify="flex-end" gap={2}>
                        <Badge colorScheme="yellow">{flagCount(c,'YELLOW')}</Badge>
                        <Badge colorScheme="red">{flagCount(c,'RED')}</Badge>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
                {filteredCustomers.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={4}>
                      <Flex justify="center" py={6}>
                        <Text fontSize="sm" color="gray.500">Keine Kunden gefunden</Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>
      )}

      {/* Quick Actions */}
      <Grid mt={8} templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5}>
        <Box p={5} rounded="xl" borderWidth="1px" bg={cardBg} borderColor={borderCol} _hover={{ shadow: 'md' }} cursor="pointer" onClick={() => navigate('/customerList')}>
          <Text fontWeight="semibold" mb={1}>Flaggen-Übersicht</Text>
          <Text fontSize="sm" color="gray.600">Auffällige Kunden schnell finden</Text>
        </Box>
        <Box p={5} rounded="xl" borderWidth="1px" bg={cardBg} borderColor={borderCol} _hover={{ shadow: 'md' }} cursor="pointer" onClick={() => navigate('/survey/surveyAnswers')}>
          <Text fontWeight="semibold" mb={1}>Umfragen</Text>
          <Text fontSize="sm" color="gray.600">Antwortquoten und Details</Text>
        </Box>
      </Grid>
    </Box>
  );
}

/* ---------- Reusable UI Bits ---------- */

// Removed legacy CardRoot & MiniStatCard after redesign
