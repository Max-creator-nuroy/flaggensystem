import {
  Box,
  Flex,
  Grid,
  Text,
  Icon,
  Input,
  Spinner,
  Badge,
  Progress,
  HStack,
  Table,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { CgDanger, CgProfile } from "react-icons/cg";
import { FcQuestions } from "react-icons/fc";
import { useNavigate, useSearchParams } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { kpiColor } from "@/components/dashboard/theme";



export default function DashboardCoach() {
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [countAffiliate, setCountAffiliate] = useState<number>(0);
  const [countCustomer, setCountCustomer] = useState<number>(0);
  const [cRForCustomers, setCRForCustomers] = useState<number>(0);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<'name' | 'red' | 'yellow'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();

  const borderCol = useColorModeValue("gray.200", "gray.600");
  const cardBg = useColorModeValue("white", "gray.700");

  const handleClick = (destination: string) => navigate(destination);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/users/getCustomersByCoach/${
          userId == null ? coach.id : userId
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
        const redFlags = customer.flags.filter((f:any) => f.color === "RED").length;
        if (redFlags >= 10) lost += 1;
        else if (redFlags >= 5) risk += 1;
      });
      setAtRisk(risk);
      setGarantyLost(lost);
      setLoading(false);

      // Survey Completion
      const resCR = await fetch(
        `http://localhost:3000/surveys/getSurveyCompletionRateForCustomersByCoach/${
          userId == null ? coach.id : userId
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
      setCRForCustomers(truncateToTwoDecimals(cr )?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Extra KPIs ----
  // Removed unused extraStats after design simplification

  // Suche
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = customerList.filter(c => (`${c.name} ${c.last_name}`).toLowerCase().includes(term));
    const sorted = [...filtered].sort((a,b) => {
      let av:any; let bv:any;
      if (sortKey === 'name') {
        av = (`${a.name} ${a.last_name}`).toLowerCase();
        bv = (`${b.name} ${b.last_name}`).toLowerCase();
      } else if (sortKey === 'red') {
        av = a.flags.filter((f:any)=>f.color==='RED').length;
        bv = b.flags.filter((f:any)=>f.color==='RED').length;
      } else {
        av = a.flags.filter((f:any)=>f.color==='YELLOW').length;
        bv = b.flags.filter((f:any)=>f.color==='YELLOW').length;
      }
      if (av < bv) return sortDir==='asc' ? -1 : 1;
      if (av > bv) return sortDir==='asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [customerList, searchTerm, sortKey, sortDir]);

  const toggleSort = (key: 'name' | 'red' | 'yellow') => {
    if (sortKey === key) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortKey(key); setSortDir('asc'); }
  };

  // --- Helper ---
  const countColor = (customer: any, color: "RED" | "YELLOW" | "GREEN") =>
    customer.flags.filter((f:any) => f.color === color && f.escalatedTo.length == 0).length;

  function truncateToTwoDecimals(num: number): number {
    return Math.trunc(num * 100) / 100;
  }

  return (
    <Box>
      {/* KPI Grid */}
      {/* KPI Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2,1fr)', xl: 'repeat(4,1fr)' }} gap={5} mt={6} mb={8}>
        <KpiCard
          title="Gesamte Nutzer"
          value={customerList.length}
          subtitle={`${countAffiliate} Affiliates • ${countCustomer} Kunden`}
          gradient={kpiColor('users')}
          icon={<CgProfile />}
          onClick={() => handleClick('/customerList')}
        />
        <KpiCard
          title="Garantie gefährdet"
          value={atRisk}
          subtitle={'≥ 5 rote Flaggen'}
          gradient={kpiColor('risk')}
          icon={<CgDanger color='orange' />}
          onClick={() => handleClick('/customerFlags?garanty=RISK')}
        />
        <KpiCard
          title="Garantie verloren"
          value={garantyLost}
          subtitle={'≥ 10 rote Flaggen'}
          gradient={kpiColor('lost')}
          icon={<CgDanger color='red' />}
          onClick={() => handleClick('/customerFlags?garanty=LOST')}
        />
        <Box borderRadius="lg" borderWidth={1} m={1} mt={0} bg={cardBg} borderColor={borderCol} p={5} _hover={{ cursor: 'pointer', bg: useColorModeValue('blue.50','gray.600') }} onClick={() => handleClick('/survey/surveyAnswers')}>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="semibold">Umfragen</Text>
            <Icon as={FcQuestions} />
          </Flex>
          <Progress.Root value={cRForCustomers ?? 0}>
            <HStack>
              <Progress.Label w="90px">Kunden</Progress.Label>
              <Progress.Track flex="1"><Progress.Range /></Progress.Track>
              <Progress.ValueText>{cRForCustomers ?? 0}%</Progress.ValueText>
            </HStack>
          </Progress.Root>
        </Box>
      </Grid>

  {/* (Optional) Additional KPIs could be inserted here */}

      {/* Kundenliste */}
      <Box p={5} mx="auto" borderRadius="lg" m={5} bg={cardBg} borderWidth={1} borderColor={borderCol}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Box>
            <Text fontSize="2xl" fontWeight="bold">Meine Kunden</Text>
            <Text fontSize="sm" color="gray.500">Detailansicht aller zugewiesenen Kunden</Text>
          </Box>
          <Input placeholder="Nach Namen suchen…" maxW={{ base: '100%', md: '300px' }} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        </Flex>
        {loading ? <Flex justify="center" py={10}><Spinner /></Flex> : (
          <>
            <Table.ScrollArea borderWidth="1px" rounded="md" height="60vh" mt={4}>
              <Table.Root size="sm" stickyHeader interactive>
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader onClick={()=>toggleSort('name')} _hover={{cursor:'pointer', bg:'blue.25'}}>
                      Name {sortKey==='name' && (sortDir==='asc'?'▲':'▼')}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>Handynummer</Table.ColumnHeader>
                    <Table.ColumnHeader>Rolle</Table.ColumnHeader>
                    <Table.ColumnHeader onClick={()=>toggleSort('yellow')} _hover={{cursor:'pointer', bg:'blue.25'}} textAlign="right">
                      Gelb {sortKey==='yellow' && (sortDir==='asc'?'▲':'▼')}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader onClick={()=>toggleSort('red')} _hover={{cursor:'pointer', bg:'blue.25'}} textAlign="right">
                      Rot {sortKey==='red' && (sortDir==='asc'?'▲':'▼')}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredCustomers.map(c => (
                    <Table.Row key={c.id} _hover={{ cursor: 'pointer', bg: 'blue.50' }} onClick={()=> handleClick(`/dashboard/CUSTOMER?userId=${c.id}`)}>
                      <Table.Cell>{c.name} {c.last_name}</Table.Cell>
                      <Table.Cell>{c.mobileNumber || '—'}</Table.Cell>
                      <Table.Cell>
                        <Badge colorScheme={c.isAffiliate? 'purple':'blue'}>{c.isAffiliate? 'Affiliate':'Kunde'}</Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right">{countColor(c,'YELLOW')}</Table.Cell>
                      <Table.Cell textAlign="right">{countColor(c,'RED')}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </>
        )}
      </Box>
    </Box>
  );
}

/* ---------- Reusable UI Bits ---------- */

// Removed legacy CardRoot & MiniStatCard after redesign
