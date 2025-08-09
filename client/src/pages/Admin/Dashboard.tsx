import { Box, Flex, Grid, Input, Text, Button, Table, HStack, Progress, Spinner } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CgProfile, CgDanger } from "react-icons/cg";
import { FcQuestions } from "react-icons/fc";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { kpiColor } from "@/components/dashboard/theme";
import { toaster } from "@/components/ui/toaster";
import AdminCustomerList from "./AdminCustomerList";
import AdminAnalytics from "./AdminAnalytics";

type Coach = {
  id: string;
  name: string;
  last_name: string;
  customerCount?: number;
};

type Customer = {
  id: string;
  name: string;
  last_name: string;
  isAffiliate?: boolean;
  flags?: { color: string }[];
};

export default function DashboardAdmin() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [surveyCRCustomers, setSurveyCRCustomers] = useState(0);
  const [surveyCRCoaches, setSurveyCRCoaches] = useState(0);
  const [searchCoach, setSearchCoach] = useState("");
  const [sortKey, setSortKey] = useState<'name' | 'customerCount'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const toastId = toaster.create({
        title: "Lade Dashboard",
        description: "Daten werden abgerufen…",
        type: "loading",
      });
      const [coachRes, custRes] = await Promise.all([
        fetch("http://localhost:3000/users/getAllCoaches", { headers: authHeaders }),
        fetch("http://localhost:3000/users/getAllCustomer", { headers: authHeaders }),
      ]);
      if (!coachRes.ok || !custRes.ok) throw new Error("Fehler beim Laden");
      const coachData = await coachRes.json();
      const customerData = await custRes.json();
      setCoaches(coachData);
      setCustomers(customerData);
      toaster.dismiss(toastId);
      toaster.create({ title: "Aktualisiert", type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Fehler", description: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveyRates = async () => {
    setSurveyLoading(true);
    try {
      const [crCustRes, crCoachRes] = await Promise.all([
        fetch("http://localhost:3000/surveys/getSurveyCompletionRateForCustomers", { headers: authHeaders }),
        fetch("http://localhost:3000/surveys/getSurveyCompletionRateForCoaches", { headers: authHeaders }),
      ]);
      if (crCustRes.ok) {
        const cr = await crCustRes.json();
        setSurveyCRCustomers(trunc2(cr) ?? 0);
      }
      if (crCoachRes.ok) {
        const cr = await crCoachRes.json();
        setSurveyCRCoaches(trunc2(cr) ?? 0);
      }
    } catch (e) {
      // optional logging
    } finally {
      setSurveyLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSurveyRates();
  }, []);

  const affiliateCount = useMemo(
    () => customers.filter(c => c.isAffiliate).length,
    [customers]
  );
  const nonAffiliateCount = useMemo(
    () => customers.filter(c => !c.isAffiliate).length,
    [customers]
  );

  const flagStats = useMemo(() => {
    let risk = 0; let lost = 0;
    customers.forEach(c => {
      const reds = c.flags?.filter(f => f.color === "RED").length || 0;
      if (reds >= 10) lost++; else if (reds >=5) risk++;
    });
    return { risk, lost };
  }, [customers]);

  const filteredCoaches = useMemo(() => {
    const term = searchCoach.toLowerCase();
    const filtered = coaches.filter(c => (c.name + " " + c.last_name).toLowerCase().includes(term));
    const sorted = [...filtered].sort((a,b) => {
      let av: any; let bv: any;
      if (sortKey === 'name') { av = (a.name + ' ' + a.last_name).toLowerCase(); bv = (b.name + ' ' + b.last_name).toLowerCase(); }
      else { av = a.customerCount ?? 0; bv = b.customerCount ?? 0; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [coaches, searchCoach, sortKey, sortDir]);

  const toggleSort = (key: 'name' | 'customerCount') => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  function trunc2(num: number) { return Math.trunc(num * 100) / 100; }

  return (
    <Box px={{ base: 3, md: 6 }} py={6}>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">Admin Dashboard</Text>
          <Text fontSize="sm" color="gray.500">Überblick über Plattform Kennzahlen</Text>
        </Box>
        <Button colorScheme="blue" onClick={() => navigate('/createCoach')}>Coach anlegen</Button>
      </Flex>

      {/* KPI Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={5} mb={8}>
        <KpiCard
          title="Gesamte Nutzer"
            value={customers.length}
            subtitle={`${affiliateCount} Affiliates • ${nonAffiliateCount} Kunden`}
            gradient={kpiColor('users')}
            icon={<CgProfile />}
            onClick={() => navigate('/customerList/ADMIN')}
          />
          <KpiCard
            title="Gesamte Coaches"
            value={coaches.length}
            gradient={kpiColor('coaches')}
            icon={<CgProfile />}
            onClick={() => navigate('/dashboard/COACH')}
          />
          <KpiCard
            title="Garantie gefährdet"
            value={flagStats.risk}
            subtitle={'>= 5 rote Flaggen'}
            gradient={kpiColor('risk')}
            icon={<CgDanger color='orange' />}
            onClick={() => navigate('/customerFlags?garanty=RISK')}
          />
          <KpiCard
            title="Garantie verloren"
            value={flagStats.lost}
            subtitle={'>= 10 rote Flaggen'}
            gradient={kpiColor('lost')}
            icon={<CgDanger color='red' />}
            onClick={() => navigate('/customerFlags?garanty=LOST')}
          />
      </Grid>

      {/* Surveys Progress */}
      <Box mb={10} p={6} borderWidth={1} rounded="xl" bg="white" shadow="sm" _hover={{ shadow: 'md' }} cursor="pointer" onClick={() => navigate('/survey/surveyAnswers')}>
        <Flex justify="space-between" align="center" mb={4}>
          <Flex align="center" gap={3}>
            <Box fontSize="2xl"><FcQuestions /></Box>
            <Text fontSize="lg" fontWeight="semibold">Umfragen beantwortet</Text>
          </Flex>
          {surveyLoading && <Spinner size="sm" />}
        </Flex>
        <Flex flexDirection="column" gap={4} maxW="600px">
          <Progress.Root value={surveyCRCustomers}>
            <HStack w="100%">
              <Progress.Label w="120px">Kunden</Progress.Label>
              <Progress.Track flex="1"><Progress.Range /></Progress.Track>
              <Progress.ValueText>{surveyCRCustomers}%</Progress.ValueText>
            </HStack>
          </Progress.Root>
          <Progress.Root value={surveyCRCoaches}>
            <HStack w="100%">
              <Progress.Label w="120px">Coaches</Progress.Label>
              <Progress.Track flex="1"><Progress.Range /></Progress.Track>
              <Progress.ValueText>{surveyCRCoaches}%</Progress.ValueText>
            </HStack>
          </Progress.Root>
        </Flex>
      </Box>

      {/* Analytics */}
      <Box mb={10}>
        <AdminAnalytics />
      </Box>

      {/* Coach Liste */}
      <Box mb={10} p={6} borderWidth={1} rounded="xl" bg="white" shadow="sm">
        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
          <Box>
            <Text fontSize="lg" fontWeight="semibold">Coaches</Text>
            <Text fontSize="xs" color="gray.500">Alle registrierten Coaches und deren Kundenanzahl</Text>
          </Box>
          <Input placeholder="Coach suchen…" maxW={{ base: '100%', md: '300px' }} value={searchCoach} onChange={e => setSearchCoach(e.target.value)} />
        </Flex>
        {loading ? (
          <Flex justify="center" py={10}><Spinner /></Flex>
        ) : (
          <Table.ScrollArea borderWidth="1px" rounded="md" height="55vh">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row bg="bg.subtle">
                  <Table.ColumnHeader
                    onClick={() => toggleSort('name')}
                    _hover={{ cursor: 'pointer', bg: 'blue.25' }}
                  >
                    Name {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    onClick={() => toggleSort('customerCount')}
                    _hover={{ cursor: 'pointer', bg: 'blue.25' }}
                    textAlign="right"
                  >
                    Kunden {sortKey === 'customerCount' && (sortDir === 'asc' ? '▲' : '▼')}
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredCoaches.map(c => (
                  <Table.Row key={c.id} _hover={{ cursor: 'pointer', bg: 'blue.50' }} onClick={() => navigate(`/dashboard/COACH?userId=${c.id}`)}>
                    <Table.Cell>{c.name} {c.last_name}</Table.Cell>
                    <Table.Cell textAlign="right">{c.customerCount ?? '—'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
      </Box>

      {/* Kundenliste (bestehende Komponente) */}
      <Box mb={4}>
        <AdminCustomerList />
      </Box>
    </Box>
  );
}
