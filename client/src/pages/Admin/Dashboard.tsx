import { Box, Flex, Grid, Text, Button, Spinner } from "@chakra-ui/react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CgProfile } from "react-icons/cg";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { kpiColor } from "@/components/dashboard/theme";
import { toaster } from "@/components/ui/toaster";
import {
  ResponsiveContainer,
  // AreaChart,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [totalCoaches, setTotalCoaches] = useState<number>(0);

  const [daysCustomer, setDaysCustomer] = useState<number>(30);
  const [customerGrowth, setCustomerGrowth] = useState<Array<{ date: string; newCustomers: number; cumulative: number }>>([]);

  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [loadingCustomerGrowth, setLoadingCustomerGrowth] = useState<boolean>(true);

  // Coach list for CoachList section
  type Coach = { id: string; name: string; last_name: string; email?: string };
  const [coaches, setCoaches] = useState<Coach[]>([]);

  // Load base counts and coach list
  useEffect(() => {
    let toastId: string | undefined;
    const load = async () => {
      try {
        setLoadingCounts(true);
        toastId = String(toaster.create({ title: "Lade Übersichts-Daten", type: "loading" }));
        const [coachRes, custRes] = await Promise.all([
          fetch("http://localhost:3000/users/getAllCoaches", { headers: authHeaders }),
          fetch("http://localhost:3000/users/getAllCustomer", { headers: authHeaders }),
        ]);
        if (!coachRes.ok || !custRes.ok) throw new Error("Fehler beim Laden der Basisdaten");
        const coachList: Coach[] = await coachRes.json();
        const customerData = await custRes.json();
        setCoaches(coachList || []);
        setTotalCoaches((coachList?.length) || 0);
        setTotalCustomers((customerData?.length) || 0);
      } catch (e: any) {
        toaster.create({ title: "Fehler", description: e?.message || String(e), type: "error" });
      } finally {
        setLoadingCounts(false);
        if (toastId) toaster.dismiss(toastId);
      }
    };
    load();
  }, [authHeaders]);

  // Load customer growth
  useEffect(() => {
    let toastId: string | undefined;
    const load = async () => {
      try {
        setLoadingCustomerGrowth(true);
        toastId = String(toaster.create({ title: "Kundenwachstum", description: `${daysCustomer} Tage…`, type: "loading" }));
        const res = await fetch(`http://localhost:3000/admin/stats/customerGrowth?days=${daysCustomer}`,{ headers: authHeaders });
        if (!res.ok) throw new Error("Fehler beim Laden Kundenwachstum");
        const json = await res.json();
        setCustomerGrowth(json.data || []);
      } catch (e: any) {
        toaster.create({ title: "Fehler", description: e?.message || String(e), type: "error" });
      } finally {
        setLoadingCustomerGrowth(false);
        if (toastId) toaster.dismiss(toastId);
      }
    };
    load();
  }, [authHeaders, daysCustomer]);

  const Header = (
    <Box
      mb={8}
      p={{ base: 5, md: 8 }}
      bg="var(--color-surface)"
      borderWidth="1px"
      borderColor="var(--color-border)"
      position="relative"
      overflow="hidden"
    >
      <Box position="absolute" top="-40" right="-40" w="80" h="80" bg="whiteAlpha.100" rounded="full" />
      <Flex align="center" justify="space-between" gap={4} flexWrap="wrap">
        <Box>
          <Text color="var(--color-text)" fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold">Admin Dashboard</Text>
          <Text color="var(--color-text)" fontSize={{ base: "sm" }} >Übersicht über Wachstum und Coaches</Text>
        </Box>
        {/* Button zum Coach anlegen wurde in die Coach-Liste verschoben */}
      </Flex>
    </Box>
  );

  // Derive chart data ensuring cumulative exists even if API doesn't send it
  const chartData = useMemo(() => {
    let cum = 0;
    return (customerGrowth || []).map((d) => {
      const newC = typeof d.newCustomers === 'number' ? d.newCustomers : 0;
      if (typeof d.cumulative === 'number' && !Number.isNaN(d.cumulative)) {
        cum = d.cumulative;
      } else {
        cum += newC;
      }
      return { ...d, newCustomers: newC, cumulative: cum };
    });
  }, [customerGrowth]);

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {Header}

      {/* KPIs */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={5} mb={8}>
        <KpiCard
          title="Kunden gesamt"
          value={loadingCounts ? '-' : totalCustomers}
          subtitle="Aktive Kunden"
          gradient={kpiColor('users')}
          icon={<CgProfile />}
          onClick={() => navigate('/customerList/ADMIN')}
        />
        <KpiCard
          title="Coaches gesamt"
          value={loadingCounts ? '-' : totalCoaches}
          subtitle="Registrierte Coaches"
          gradient={kpiColor('coaches')}
          icon={<CgProfile />}
        />
        <KpiCard
          title="Kundenwachstum"
          value={loadingCustomerGrowth ? '-' : (chartData.length ? chartData[chartData.length - 1].cumulative : 0)}
          subtitle={`Summe in ${daysCustomer} Tagen`}
          gradient={kpiColor('growth')}
          icon={<CgProfile />}
        />
      </Grid>

      {/* Customer Growth Chart */}
      <Grid templateColumns={{ base: '1fr' }} gap={6}>
        <Box p={5} rounded="2xl" bg="var(--color-surface)" borderWidth="1px" borderColor="var(--color-border)" shadow="sm">
          <Flex justify="space-between" align="center" mb={4} gap={3} flexWrap="wrap">
            <Box>
              <Text fontSize="lg" fontWeight="semibold" color="blue.700">Kundenwachstum</Text>
              <Text fontSize="xs" color="gray.600">Neue Kunden vs. kumulativ</Text>
            </Box>
            <select
              value={String(daysCustomer)}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setDaysCustomer(parseInt(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value={7}>7 Tage</option>
              <option value={30}>30 Tage</option>
              <option value={90}>90 Tage</option>
            </select>
          </Flex>
          <Box h={{ base: 260, md: 300 }}>
            {loadingCustomerGrowth ? (
              <Flex h="100%" align="center" justify="center"><Spinner /></Flex>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="custNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="newCustomers" name="Neue Kunden" stroke="#2563eb" fillOpacity={0.35} fill="url(#custNew)" dot={false} activeDot={false} />
                  <Line type="monotone" dataKey="cumulative" name="Kumulativ" stroke="#8f95a1ff" dot={false} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
      </Grid>

      {/* Coach List */}
      <Box mt={8} p={5} rounded="2xl" borderWidth="1px" bg="var(--color-surface)" borderColor="var(--color-border)" shadow="sm">
        <Flex justify="space-between" align="center" mb={4} gap={3} flexWrap="wrap">
          <Box>
            <Text fontSize="lg" fontWeight="semibold">Coach-Liste</Text>
            <Text fontSize="xs" color="gray.600">Alle registrierten Coaches im Überblick</Text>
          </Box>
          <Button colorScheme="blue" onClick={() => navigate('/createCoach')}>Coach anlegen</Button>
        </Flex>
        {loadingCounts ? (
          <Flex align="center" justify="center" py={8}><Spinner /></Flex>
        ) : (
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', xl: 'repeat(3, 1fr)' }} gap={4}>
            {coaches.map((c) => (
              <Box key={c.id} p={4} borderWidth="1px" borderColor="var(--color-border)" bg="var(--color-surface)" rounded="lg" _hover={{ shadow: 'md', bg: 'rgba(255,255,255,0.04)' }}>
                <Flex justify="space-between" align="center" gap={3}>
                  <Box>
                    <Text fontWeight="medium">{c.name} {c.last_name}</Text>
                    {c.email && <Text fontSize="sm" color="var(--color-muted)">{c.email}</Text>}
                  </Box>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/statistic?coachId=${c.id}`)}>Details</Button>
                </Flex>
              </Box>
            ))}
            {coaches.length === 0 && (
              <Box p={4} borderWidth="1px" rounded="lg">
                <Text color="gray.600">Keine Coaches gefunden.</Text>
              </Box>
            )}
          </Grid>
        )}
      </Box>

      {/* Quick Actions */}
      <Grid mt={8} templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5}>
        <Box p={5} rounded="xl" borderWidth="1px" bg="var(--color-surface)" borderColor="var(--color-border)" _hover={{ shadow: 'md' }} cursor="pointer" onClick={() => navigate('/customerList/ADMIN')}>
          <Text fontWeight="semibold" mb={1}>Flaggen-Übersicht</Text>
          <Text fontSize="sm" color="gray.600">Auffällige Kunden schnell finden</Text>
        </Box>
        <Box p={5} rounded="xl" borderWidth="1px" bg="var(--color-surface)" borderColor="var(--color-border)" _hover={{ shadow: 'md' }} cursor="pointer" onClick={() => navigate('/survey/surveyAnswers')}>
          <Text fontWeight="semibold" mb={1}>Umfragen</Text>
          <Text fontSize="sm" color="gray.600">Antwortquoten und Details</Text>
        </Box>
      </Grid>
    </Box>
  );
}
