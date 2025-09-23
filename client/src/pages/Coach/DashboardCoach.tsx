import {
  Box,
  Flex,
  Text,
  Icon,
  Spinner,
  Progress,
  HStack,
  Input,
  Table,
  Badge,
  Card,
  CardBody,
  CardHeader,
  VStack,
  Heading,
  SimpleGrid,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { FiUsers, FiTrendingUp, FiBarChart2, FiUser, FiAward, FiTarget } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";
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
      setCountCustomer(data.filter((c) => c.isCustomer).length);
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
  type LeadPoint = { date: string; newLeads: number; cumulative: number };

  const [custDays, setCustDays] = useState(30);
  const [custGrowth, setCustGrowth] = useState<CustPoint[]>([]);
  const [custLoading, setCustLoading] = useState(false);

  // Lead growth data
  const [leadDays, setLeadDays] = useState(30);
  const [leadGrowth, setLeadGrowth] = useState<LeadPoint[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);

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
        console.log('Coach Customer Growth API Response:', json);
        setCustGrowth(json.data || []);
      } else {
        console.log('Coach Customer Growth API Error:', res.status, res.statusText);
      }
    } finally {
      setCustLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachCustomerGrowth();
  }, [custDays, coachId]);

  const fetchLeadGrowth = async () => {
    // For coach dashboard, we want leads from all their affiliates
    const targetCoachId = coachId; // This is the coach whose dashboard we're viewing
    console.log('fetchLeadGrowth - targetCoachId:', targetCoachId);
    console.log('fetchLeadGrowth - userId:', userId);
    console.log('fetchLeadGrowth - coach?.id:', coach?.id);
    if (!targetCoachId) return;
    setLeadLoading(true);
    try {
      const apiUrl = `http://localhost:3000/leads/coachLeadGrowth?days=${leadDays}&coachId=${targetCoachId}`;
      console.log('Making API call to:', apiUrl);
      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const json = await res.json();
        console.log('Coach Lead Growth API Response:', json);
        console.log('Lead Growth Data:', json.data);
        console.log('Lead Growth Data Length:', json.data?.length);
        setLeadGrowth(json.data || []);
      } else {
        console.log('Coach Lead Growth API Error:', res.status, res.statusText);
        const errorText = await res.text();
        console.log('Error response:', errorText);
      }
    } finally {
      setLeadLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadGrowth();
  }, [leadDays, coachId]);

  // Derived/fallback series - only use real data for stats, dummy data for chart display only
  const custSeries =
    custGrowth && custGrowth.length
      ? custGrowth
      : (generateDummySeries(custDays, "newCustomers") as any[]);

  // Calculate total new customers in the period - only from real data
  const totalNewCustomers = (custGrowth && custGrowth.length) 
    ? custGrowth.reduce((sum, item) => sum + (item.newCustomers || 0), 0) 
    : 0;

  // Calculate total new leads in the period - only from real data
  const totalNewLeads = (leadGrowth && leadGrowth.length) 
    ? leadGrowth.reduce((sum, item) => sum + (item.newLeads || 0), 0) 
    : 0;
  
  console.log('Lead Growth State:', leadGrowth);
  console.log('Total New Leads Calculated:', totalNewLeads);

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
      {/* Modern Hero Section */}
      <Card.Root 
        mb={8}
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
          bgGradient="linear(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))"
        />
        <CardBody p={{ base: 6, md: 8 }} position="relative">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
            <VStack align="start" gap={2}>
              <Flex align="center" gap={3}>
                <Flex 
                  w={12} h={12} 
                  align="center" justify="center" 
                  rounded="full" 
                  bg="purple.500"
                  color="white"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  <Icon as={FiUser} boxSize={6} />
                </Flex>
                <VStack align="start" gap={0}>
                  <Heading size="lg" color="var(--color-text)">
                    {isAdmin && coachInfo ? `Coach ${coachInfo.name} ${coachInfo.last_name}` : "Coach Dashboard"}
                  </Heading>
                  <Text color="var(--color-muted)" fontSize="sm">
                    Übersicht über deine Kunden und deren Fortschritt
                  </Text>
                </VStack>
              </Flex>
              
              <Flex wrap="wrap" gap={2} mt={2}>
                <Badge colorScheme="purple" variant="subtle">
                  Coach
                </Badge>
                {isAdmin && (
                  <Badge colorScheme="blue" variant="subtle">
                    Admin-Ansicht
                  </Badge>
                )}
              </Flex>
            </VStack>
            
            <VStack align={{ base: "start", md: "end" }} gap={2}>
              <Text fontSize="sm" color="var(--color-muted)">
                {customerList.length} Kunden betreut
              </Text>
              <Text fontSize="xs" color="var(--color-muted)">
                {countAffiliate} Affiliates • {countCustomer} Kunden
              </Text>
            </VStack>
          </Flex>
        </CardBody>
      </Card.Root>

      {/* Modern KPI Grid */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 5 }} gap={4} mb={8}>
        <Card.Root 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor="var(--color-border)"
          cursor="pointer"
          _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
          transition="all 0.2s"
          onClick={() => handleClick("/customerList")}
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <Flex direction="column">
                <Text fontSize="sm" color="var(--color-muted)">Gesamte Nutzer</Text>
                <Heading size="lg">{customerList.length}</Heading>
                <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                  {countAffiliate} Affiliates • {countCustomer} Kunden
                </Text>
              </Flex>
              <Icon as={FiUsers} color="blue.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>

        <Card.Root 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor="var(--color-border)"
          cursor="pointer"
          _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-1px)" }}
          transition="all 0.2s"
          onClick={() => handleClick("/survey/surveyAnswers")}
        >
          <CardBody>
            <Flex align="center" justify="space-between" mb={3}>
              <Flex direction="column">
                <Text fontSize="sm" color="var(--color-muted)">Umfragen</Text>
                <Heading size="lg">{cRForCustomers ?? 0}%</Heading>
              </Flex>
              <Icon as={FiBarChart2} color="green.500" boxSize={6} />
            </Flex>
            <Progress.Root value={cRForCustomers ?? 0} colorScheme="green">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text fontSize="xs" color="var(--color-muted)" mt={2}>
              Antwortrate deiner Kunden
            </Text>
          </CardBody>
        </Card.Root>

        <Card.Root 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor="var(--color-border)"
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <Flex direction="column">
                <Text fontSize="sm" color="var(--color-muted)">Erfolgsrate</Text>
                <Heading size="lg">
                  {customerList.length > 0 ? 
                    Math.round((customerList.filter(c => 
                      (c?.flags?.filter((f:any) => f.color === "RED").length || 0) < 5
                    ).length / customerList.length) * 100) : 0}%
                </Heading>
                <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                  Kunden ohne Risiko
                </Text>
              </Flex>
              <Icon as={FiAward} color="yellow.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>

        <Card.Root 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor="var(--color-border)"
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <Flex direction="column">
                <Text fontSize="sm" color="var(--color-muted)">Kundenwachstum</Text>
                <Heading size="lg">+{totalNewCustomers}</Heading>
                <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                  Neue Kunden ({custDays}d)
                </Text>
              </Flex>
              <Icon as={FiTrendingUp} color="purple.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>

        <Card.Root 
          bg="var(--color-surface)" 
          borderWidth="1px" 
          borderColor="var(--color-border)"
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <Flex direction="column">
                <Text fontSize="sm" color="var(--color-muted)">Lead-Wachstum</Text>
                <Heading size="lg">+{totalNewLeads}</Heading>
                <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                  Neue Leads ({leadDays}d)
                </Text>
              </Flex>
              <Icon as={FiTarget} color="blue.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Modern Chart Section */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        {/* Customer Growth Chart */}
        <Card.Root 
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
        >
          <CardHeader>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <VStack align="start" gap={0}>
                <Heading size="md" color="var(--color-text)">Kundenwachstum</Heading>
                <Text fontSize="sm" color="var(--color-muted)">Neue Kunden vs. kumulativ</Text>
              </VStack>
              <Flex align="center" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="var(--color-muted)">Zeitraum:</Text>
                <SimpleSelect value={custDays} onChange={setCustDays} options={dayOptions} />
              </Flex>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={320}>
              {custLoading ? (
                <Flex justify="center" align="center" h="100%">
                  <VStack gap={3}>
                    <Spinner size="lg" color="blue.500" />
                    <Text fontSize="sm" color="var(--color-muted)">Lade Wachstumsdaten...</Text>
                  </VStack>
                </Flex>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={custSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <ReTooltip content={<GrowthTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ color: 'var(--color-muted)' }} iconType="plainline" formatter={(v: any) => <span style={{ color: 'var(--color-muted)' }}>{v}</span>} />
                    <Area type="monotone" dataKey="newCustomers" name="Neue Kunden" stroke="#6366f1" fillOpacity={1} fill="url(#custNew)" dot={false} activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="cumulative" name="Kumulativ" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardBody>
        </Card.Root>

        {/* Lead Growth Chart */}
        <Card.Root 
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
        >
          <CardHeader>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <VStack align="start" gap={0}>
                <Heading size="md" color="var(--color-text)">Lead-Wachstum</Heading>
                <Text fontSize="sm" color="var(--color-muted)">Neue Leads von allen Affiliates</Text>
              </VStack>
              <Flex align="center" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="var(--color-muted)">Zeitraum:</Text>
                <SimpleSelect value={leadDays} onChange={setLeadDays} options={dayOptions} />
              </Flex>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height={320}>
              {leadLoading ? (
                <Flex justify="center" align="center" h="100%">
                  <VStack gap={3}>
                    <Spinner size="lg" color="teal.500" />
                    <Text fontSize="sm" color="var(--color-muted)">Lade Lead-Daten...</Text>
                  </VStack>
                </Flex>
              ) : leadGrowth && leadGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={leadGrowth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} tickLine={false} axisLine={false} />
                    <ReTooltip content={<GrowthTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ color: 'var(--color-muted)' }} iconType="plainline" formatter={(v: any) => <span style={{ color: 'var(--color-muted)' }}>{v}</span>} />
                    <Area type="monotone" dataKey="newLeads" name="Neue Leads" stroke="#14b8a6" fillOpacity={1} fill="url(#leadNew)" dot={false} activeDot={{ r: 4, stroke: '#14b8a6', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="cumulative" name="Kumulativ" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Flex justify="center" align="center" h="100%">
                  <VStack gap={3}>
                    <Icon as={FiTarget} boxSize={12} color="var(--color-muted)" />
                    <Text fontSize="sm" color="var(--color-muted)">Keine Lead-Daten verfügbar</Text>
                    <Text fontSize="xs" color="var(--color-muted)">Leads werden von Affiliates erstellt</Text>
                  </VStack>
                </Flex>
              )}
            </Box>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

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
      <Card.Root mb={6}>
        <CardHeader>
          <Heading size="md">Schnellzugriff</Heading>
          <Text fontSize="sm" color="var(--color-muted)">
            Häufig verwendete Funktionen für Coaches
          </Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            <Card.Root 
              cursor="pointer"
              _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-2px)" }}
              transition="all 0.2s"
              onClick={() => navigate('/customerList')}
              bg="var(--color-surface)"
              borderWidth="1px"
              borderColor="var(--color-border)"
            >
              <CardBody p={5}>
                <Flex align="center" gap={3} mb={2}>
                  <Flex 
                    w={10} h={10} 
                    align="center" justify="center" 
                    rounded="full" 
                    bg="red.500"
                    color="white"
                  >
                    <Icon as={FiTarget} boxSize={5} />
                  </Flex>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">Flaggen-Übersicht</Text>
                    <Text fontSize="sm" color="var(--color-muted)">
                      Auffällige Kunden schnell finden
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>

            <Card.Root 
              cursor="pointer"
              _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-2px)" }}
              transition="all 0.2s"
              onClick={() => navigate('/survey/surveyAnswers')}
              bg="var(--color-surface)"
              borderWidth="1px"
              borderColor="var(--color-border)"
            >
              <CardBody p={5}>
                <Flex align="center" gap={3} mb={2}>
                  <Flex 
                    w={10} h={10} 
                    align="center" justify="center" 
                    rounded="full" 
                    bg="green.500"
                    color="white"
                  >
                    <Icon as={FiBarChart2} boxSize={5} />
                  </Flex>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">Umfragen</Text>
                    <Text fontSize="sm" color="var(--color-muted)">
                      Antwortquoten und Details einsehen
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>

            <Card.Root 
              cursor="pointer"
              _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-2px)" }}
              transition="all 0.2s"
              onClick={() => navigate('/createUser')}
              bg="var(--color-surface)"
              borderWidth="1px"
              borderColor="var(--color-border)"
            >
              <CardBody p={5}>
                <Flex align="center" gap={3} mb={2}>
                  <Flex 
                    w={10} h={10} 
                    align="center" justify="center" 
                    rounded="full" 
                    bg="blue.500"
                    color="white"
                  >
                    <Icon as={FiUsers} boxSize={5} />
                  </Flex>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">Neuer Kunde</Text>
                    <Text fontSize="sm" color="var(--color-muted)">
                      Neuen Kunden hinzufügen
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>
          </SimpleGrid>
        </CardBody>
      </Card.Root>
    </Box>
  );
}

/* ---------- Reusable UI Bits ---------- */

// Removed legacy CardRoot & MiniStatCard after redesign
