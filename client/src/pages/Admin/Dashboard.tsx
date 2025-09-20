import { 
  Box, 
  Flex, 
  Grid, 
  Text, 
  Button, 
  Spinner, 
  Card,
  CardHeader,
  CardBody,
  Heading,
  VStack,
  HStack,
  Icon,
  Badge,
  SimpleGrid,
  Select,
  createListCollection,
  Portal
} from "@chakra-ui/react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiUsers, 
  FiUserCheck, 
  FiTrendingUp, 
  FiBarChart, 
  FiSettings, 
  FiMessageSquare,
  FiFlag,
  FiShield,
  FiPlus,
  FiEye
} from "react-icons/fi";
import { toaster } from "@/components/ui/toaster";
import {
  ResponsiveContainer,
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
    const load = async () => {
      setLoadingCounts(true);
      try {
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
      }
    };
    load();
  }, [authHeaders]);

  // Load customer growth
  useEffect(() => {
    const load = async () => {
      setLoadingCustomerGrowth(true);
      try {
        const res = await fetch(`http://localhost:3000/admin/stats/customerGrowth?days=${daysCustomer}`,{ headers: authHeaders });
        if (!res.ok) throw new Error("Fehler beim Laden Kundenwachstum");
        const json = await res.json();
        setCustomerGrowth(json.data || []);
      } catch (e: any) {
        toaster.create({ title: "Fehler", description: e?.message || String(e), type: "error" });
      } finally {
        setLoadingCustomerGrowth(false);
      }
    };
    load();
  }, [authHeaders, daysCustomer]);

  const timeFilters = createListCollection({
    items: [
      { label: "7 Tage", value: "7" },
      { label: "30 Tage", value: "30" },
      { label: "90 Tage", value: "90" },
    ],
  });

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
              <Icon as={FiShield} boxSize={6} />
            </Flex>
            <VStack align="start" gap={0}>
              <Heading size="lg">Admin Dashboard</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                Systemübersicht und Verwaltung
              </Text>
            </VStack>
          </Flex>
        </CardHeader>
      </Card.Root>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4} mb={6}>
        <Card.Root 
          cursor="pointer"
          onClick={() => navigate('/customerList/ADMIN')}
          _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
          transition="all 0.2s"
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="var(--color-muted)">Gesamt Kunden</Text>
                <Heading size="lg">{loadingCounts ? "..." : totalCustomers}</Heading>
                <Text fontSize="xs" color="var(--color-muted)">Aktive Nutzer</Text>
              </VStack>
              <Icon as={FiUsers} color="blue.500" boxSize={6} />
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
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="var(--color-muted)">Gesamt Coaches</Text>
                <Heading size="lg">{loadingCounts ? "..." : totalCoaches}</Heading>
                <Text fontSize="xs" color="var(--color-muted)">Registrierte Trainer</Text>
              </VStack>
              <Icon as={FiUserCheck} color="green.500" boxSize={6} />
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
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="var(--color-muted)">Wachstum</Text>
                <Heading size="lg">
                  {loadingCustomerGrowth ? "..." : (chartData.length ? chartData[chartData.length - 1].cumulative : 0)}
                </Heading>
                <Text fontSize="xs" color="var(--color-muted)">In {daysCustomer} Tagen</Text>
              </VStack>
              <Icon as={FiTrendingUp} color="purple.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>

        <Card.Root 
          cursor="pointer"
          onClick={() => navigate('/survey/surveyAnswers')}
          _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
          transition="all 0.2s"
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
        >
          <CardBody>
            <Flex align="center" justify="space-between">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="var(--color-muted)">Umfragen</Text>
                <Heading size="lg">∞</Heading>
                <Text fontSize="xs" color="var(--color-muted)">System aktiv</Text>
              </VStack>
              <Icon as={FiMessageSquare} color="orange.500" boxSize={6} />
            </Flex>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Main Content Grid */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={6} mb={6}>
        {/* Customer Growth Chart */}
        <Card.Root>
          <CardHeader>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={3}>
                <Icon as={FiBarChart} color="blue.500" />
                <VStack align="start" gap={0}>
                  <Heading size="md">Kundenwachstum</Heading>
                  <Text fontSize="sm" color="var(--color-muted)">Neue Kunden vs. kumulativ</Text>
                </VStack>
              </Flex>
              <Select.Root
                collection={timeFilters}
                value={[String(daysCustomer)]}
                onValueChange={({ value: [val] }) => setDaysCustomer(parseInt(val))}
                size="sm"
              >
                <Select.HiddenSelect />
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {timeFilters.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Flex>
          </CardHeader>
          <CardBody>
            <Box h={{ base: 260, md: 300 }}>
              {loadingCustomerGrowth ? (
                <Flex h="100%" align="center" justify="center">
                  <VStack gap={3}>
                    <Spinner size="lg" color="blue.500" />
                    <Text fontSize="sm" color="var(--color-muted)">Lade Daten...</Text>
                  </VStack>
                </Flex>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="newCustomers" 
                      name="Neue Kunden" 
                      stroke="#3b82f6" 
                      fillOpacity={0.35} 
                      fill="url(#custNew)" 
                      dot={false} 
                      activeDot={false} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Kumulativ" 
                      stroke="#8b5cf6" 
                      dot={false} 
                      activeDot={false} 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardBody>
        </Card.Root>

        {/* Coach List */}
        <Card.Root>
          <CardHeader>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={3}>
                <Icon as={FiUserCheck} color="green.500" />
                <VStack align="start" gap={0}>
                  <Heading size="md">Coach-Übersicht</Heading>
                  <Text fontSize="sm" color="var(--color-muted)">
                    {coaches.length} registrierte Coaches
                  </Text>
                </VStack>
              </Flex>
              <Button 
                colorScheme="green" 
                onClick={() => navigate('/createCoach')}
                size="sm"
              >
                <Icon as={FiPlus} mr={2} />
                Coach anlegen
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {loadingCounts ? (
              <Flex align="center" justify="center" py={8}>
                <VStack gap={3}>
                  <Spinner size="lg" color="green.500" />
                  <Text fontSize="sm" color="var(--color-muted)">Lade Coaches...</Text>
                </VStack>
              </Flex>
            ) : coaches.length === 0 ? (
              <Flex align="center" justify="center" py={8}>
                <VStack gap={3}>
                  <Icon as={FiUserCheck} boxSize={12} color="var(--color-muted)" />
                  <Text color="var(--color-muted)" fontWeight="medium">
                    Keine Coaches vorhanden
                  </Text>
                  <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                    Lege den ersten Coach an, um zu starten
                  </Text>
                </VStack>
              </Flex>
            ) : (
              <VStack gap={3} align="stretch">
                {coaches.slice(0, 4).map((c) => (
                  <Card.Root 
                    key={c.id} 
                    cursor="pointer"
                    onClick={() => navigate(`/statistic?coachId=${c.id}`)}
                    _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateX(4px)" }}
                    transition="all 0.2s"
                    bg="rgba(34, 197, 94, 0.1)"
                    borderWidth="1px"
                    borderColor="green.200"
                  >
                    <CardBody p={3}>
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={0}>
                          <Text fontWeight="semibold">{c.name} {c.last_name}</Text>
                          {c.email && (
                            <Text fontSize="sm" color="var(--color-muted)">{c.email}</Text>
                          )}
                        </VStack>
                        <Button size="xs" variant="outline" colorScheme="green">
                          <Icon as={FiEye} mr={1} />
                          Details
                        </Button>
                      </Flex>
                    </CardBody>
                  </Card.Root>
                ))}
                {coaches.length > 4 && (
                  <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                    +{coaches.length - 4} weitere Coaches...
                  </Text>
                )}
              </VStack>
            )}
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Quick Actions */}
      <Card.Root>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Icon as={FiSettings} color="purple.500" />
            <VStack align="start" gap={0}>
              <Heading size="md">Schnellzugriff</Heading>
              <Text fontSize="sm" color="var(--color-muted)">Häufig verwendete Funktionen</Text>
            </VStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            <Card.Root 
              cursor="pointer"
              onClick={() => navigate('/customerList/ADMIN')}
              _hover={{ transform: "translateY(-2px)", borderColor: "red.300" }}
              transition="all 0.2s"
              bg="rgba(239, 68, 68, 0.1)"
              borderWidth="1px"
              borderColor="red.200"
            >
              <CardBody p={4}>
                <Flex align="center" gap={3}>
                  <Icon as={FiFlag} color="red.500" boxSize={5} />
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">Flaggen-Übersicht</Text>
                    <Text fontSize="sm" color="var(--color-muted)">Kritische Kunden finden</Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>

            <Card.Root 
              cursor="pointer"
              onClick={() => navigate('/survey/surveyAnswers')}
              _hover={{ transform: "translateY(-2px)", borderColor: "blue.300" }}
              transition="all 0.2s"
              bg="rgba(59, 130, 246, 0.1)"
              borderWidth="1px"
              borderColor="blue.200"
            >
              <CardBody p={4}>
                <Flex align="center" gap={3}>
                  <Icon as={FiMessageSquare} color="blue.500" boxSize={5} />
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">Umfrage-Auswertung</Text>
                    <Text fontSize="sm" color="var(--color-muted)">Antworten analysieren</Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>

            <Card.Root 
              cursor="pointer"
              onClick={() => navigate('/survey/questions')}
              _hover={{ transform: "translateY(-2px)", borderColor: "green.300" }}
              transition="all 0.2s"
              bg="rgba(34, 197, 94, 0.1)"
              borderWidth="1px"
              borderColor="green.200"
            >
              <CardBody p={4}>
                <Flex align="center" gap={3}>
                  <Icon as={FiSettings} color="green.500" boxSize={5} />
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold">System-Verwaltung</Text>
                    <Text fontSize="sm" color="var(--color-muted)">Umfragen & Einstellungen</Text>
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
