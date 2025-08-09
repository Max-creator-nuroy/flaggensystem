import { useEffect, useState, useMemo } from 'react';
import { Box, Flex, Text, Button, Table, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

interface CustomerGrowthPoint { date: string; newCustomers: number; cumulative: number; }
interface FlagsPerCoach { coachId: string; name: string; last_name: string; red: number; yellow: number; green: number; total: number; }
interface RequirementFailure { requirementId: string; title: string; failures: number; coachId?: string | null; coachName?: string | null; }

const dayOptions = [7,14,30,90];
const limitOptions = [5,10,20]; // still used for failures limit

const selectStyle: React.CSSProperties = { padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E0', background: 'white', fontSize: '0.8rem' };
const SimpleSelect = ({ value, onChange, options }: { value: number; onChange: (v:number)=>void; options: number[] }) => (
  <select value={value} onChange={e=> onChange(parseInt(e.target.value))} style={selectStyle}>
    {options.map(o=> <option key={o} value={o}>{o} Tage</option>)}
  </select>
);

const LimitSelect = ({ value, onChange, options, labelPrefix }: { value: number; onChange: (v:number)=>void; options: number[]; labelPrefix?: string }) => (
  <select value={value} onChange={e=> onChange(parseInt(e.target.value))} style={selectStyle}>
    {options.map(o=> <option key={o} value={o}>{labelPrefix || 'Top'} {o}</option>)}
  </select>
);

export function AdminAnalytics() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [daysGrowth, setDaysGrowth] = useState(30);
  const [growthData, setGrowthData] = useState<CustomerGrowthPoint[]>([]);
  const [growthLoading, setGrowthLoading] = useState(false);

  const [flagsCoachData, setFlagsCoachData] = useState<FlagsPerCoach[]>([]);
  const [flagsCoachLoading, setFlagsCoachLoading] = useState(false);

  // Removed separate requirement flag color chart; keep placeholders if reintroduced later
  // const [limitReqFlags, setLimitReqFlags] = useState(10);
  // const [reqFlagsData, setReqFlagsData] = useState<RequirementFlag[]>([]);
  // const [reqFlagsLoading, setReqFlagsLoading] = useState(false);

  const [daysFailures, setDaysFailures] = useState(30);
  const [limitFailures, setLimitFailures] = useState(10);
  const [failureData, setFailureData] = useState<RequirementFailure[]>([]);
  const [failureLoading, setFailureLoading] = useState(false);

  const fetchGrowth = async () => {
    setGrowthLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/admin/stats/customerGrowth?days=${daysGrowth}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setGrowthData(json.data || []);
      }
    } finally { setGrowthLoading(false); }
  };

  const fetchFlagsPerCoach = async () => {
    setFlagsCoachLoading(true);
    try {
      const res = await fetch('http://localhost:3000/admin/stats/flagsPerCoach', { headers });
      if (res.ok) {
        const json = await res.json();
        setFlagsCoachData(json.data || []);
      }
    } finally { setFlagsCoachLoading(false); }
  };

  // const fetchRequirementFlags = async () => {
  //   setReqFlagsLoading(true);
  //   try {
  //     const res = await fetch(`http://localhost:3000/admin/stats/topRequirements?limit=${limitReqFlags}`, { headers });
  //     if (res.ok) { const json = await res.json(); setReqFlagsData(json.data || []); }
  //   } finally { setReqFlagsLoading(false); }
  // };

  const fetchFailures = async () => {
    setFailureLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/admin/stats/requirementFailures?days=${daysFailures}&limit=${limitFailures}`, { headers });
      if (res.ok) { const json = await res.json(); setFailureData(json.data || []); }
    } finally { setFailureLoading(false); }
  };

  useEffect(() => { fetchGrowth(); }, [daysGrowth]);
  useEffect(() => { fetchFlagsPerCoach(); }, []);
  // useEffect(() => { fetchRequirementFlags(); }, [limitReqFlags]);
  useEffect(() => { fetchFailures(); }, [daysFailures, limitFailures]);

  const sortedFlagsCoach = useMemo(()=> [...flagsCoachData].sort((a,b)=> b.total - a.total), [flagsCoachData]);
  // (Removed flags chart; keep reqFlagsData only for potential KPI extensions)
  const sortedFailures = useMemo(()=> [...failureData].sort((a,b)=> b.failures - a.failures), [failureData]);
  const navigate = useNavigate();
  const goRequirement = (id:string) => navigate(`/requirementDetail?id=${id}`);
  const goCoach = (id:string) => navigate(`/dashboard/COACH?userId=${id}`);

  // Derived KPI values
  const totalCustomers = growthData.length ? growthData[growthData.length - 1].cumulative : 0;
  const newInPeriod = useMemo(()=> growthData.reduce((s,c)=> s + c.newCustomers, 0), [growthData]);
  const totalFlags = useMemo(()=> flagsCoachData.reduce((s,c)=> s + c.total, 0), [flagsCoachData]);
  const redFlags = useMemo(()=> flagsCoachData.reduce((s,c)=> s + c.red, 0), [flagsCoachData]);
  const topFailure = sortedFailures[0];

  const kpiCard = (label:string, value: string | number, sub?: string, color?: string) => (
    <Box key={label} p={4} rounded='lg' borderWidth='1px' bg='linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 100%)' backdropFilter='blur(6px)'
         shadow='xs' position='relative' overflow='hidden'>
      <Text fontSize='xs' fontWeight='medium' color='gray.600' textTransform='uppercase' letterSpacing='0.5px'>{label}</Text>
      <Text fontSize='2xl' fontWeight='bold' lineHeight='1.1' color={color || 'gray.800'}>{value}</Text>
      {sub && <Text fontSize='xs' color='gray.500' mt={1}>{sub}</Text>}
      <Box position='absolute' right='-16px' top='-16px' w='70px' h='70px' rounded='full' bg='teal.50' opacity={0.6} />
    </Box>
  );

  return (
    <Flex direction='column' gap={8}>
      {/* KPI Row */}
      <Flex gap={4} wrap='wrap'>
        {kpiCard('Gesamt Kunden', totalCustomers.toLocaleString(), `Zeitraum: ${daysGrowth} Tage`)}
        {kpiCard('Neue Kunden', newInPeriod.toLocaleString(), 'Summe im Zeitraum', 'teal.600')}
        {kpiCard('Alle Flags', totalFlags.toLocaleString(), `${redFlags} rot`, 'orange.600')}
        {kpiCard('Top Fehlversuch', topFailure ? topFailure.failures : '-', topFailure?.title?.slice(0,28) || ' ', 'red.600')}
      </Flex>

      {/* Filter Bar */}
      <Flex p={3} rounded='lg' borderWidth='1px' bg='white' align='center' gap={6} wrap='wrap' shadow='xs'>
  <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Wachstum</Text>
          <SimpleSelect value={daysGrowth} onChange={setDaysGrowth} options={dayOptions} />
          <Button size='xs' onClick={fetchGrowth} disabled={growthLoading} variant='outline'>{growthLoading ? '...' : 'Reload'}</Button>
        </Flex>
  <Box w='1px' h='24px' bg='gray.200' />
        {/* Removed Req Flags control */}
        {/* <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Req Flags</Text>
          <LimitSelect value={limitReqFlags} onChange={setLimitReqFlags} options={limitOptions} />
          <Button size='xs' onClick={fetchRequirementFlags} disabled={reqFlagsLoading} variant='outline'>{reqFlagsLoading ? '...' : 'Reload'}</Button>
        </Flex>
        <Box w='1px' h='24px' bg='gray.200' /> */}
        <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Fails</Text>
          <SimpleSelect value={daysFailures} onChange={setDaysFailures} options={dayOptions} />
          <LimitSelect value={limitFailures} onChange={setLimitFailures} options={limitOptions} />
          <Button size='xs' onClick={fetchFailures} disabled={failureLoading} variant='outline'>{failureLoading ? '...' : 'Reload'}</Button>
        </Flex>
        <Flex ml='auto' fontSize='xs' color='gray.500'>Letzte Aktualisierung: {new Date().toLocaleTimeString()}</Flex>
      </Flex>

      {/* Charts Grid */}
      <Box display='grid' gap={6} gridTemplateColumns='repeat(auto-fill,minmax(340px,1fr))'>
        {/* Growth Daily */}
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm' position='relative'>
          <Flex justify='space-between' align='start' mb={3}>
            <Box>
              <Text fontSize='sm' fontWeight='semibold'>Kundenwachstum (neu)</Text>
              <Text fontSize='xs' color='gray.500'>Tägliche neue Kunden</Text>
            </Box>
          </Flex>
          <Box height={220}>
            {growthLoading ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={growthData.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey='newCustomers' fill='url(#gradNew)' name='Neue Kunden' radius={[4,4,0,0]} />
                  <defs>
                    <linearGradient id='gradNew' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#0d9488' stopOpacity={0.9}/>
                      <stop offset='95%' stopColor='#0d9488' stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>

        {/* Growth Cumulative */}
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Flex justify='space-between' align='start' mb={3}>
            <Box>
              <Text fontSize='sm' fontWeight='semibold'>Kundenwachstum (kumulativ)</Text>
              <Text fontSize='xs' color='gray.500'>Gesamt Kunden</Text>
            </Box>
          </Flex>
          <Box height={220}>
            {growthLoading ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={growthData.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Line type='monotone' dataKey='cumulative' stroke='#2563eb' strokeWidth={2} dot={false} name='Kumulativ' />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>

  {/* Flags per Coach */}
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Flex justify='space-between' align='start' mb={3}>
            <Box>
              <Text fontSize='sm' fontWeight='semibold'>Flaggen pro Coach</Text>
              <Text fontSize='xs' color='gray.500'>Verteilung nach Farbe</Text>
            </Box>
            <Button size='xs' onClick={fetchFlagsPerCoach} disabled={flagsCoachLoading} variant='ghost'>{flagsCoachLoading? '...' : 'Reload'}</Button>
          </Flex>
          <Box height={260}>
            {flagsCoachLoading ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={sortedFlagsCoach} layout='vertical' margin={{ left: 100, right: 16 }} onClick={(chart:any)=> { const payload = chart?.activePayload?.[0]?.payload; if (payload?.coachId) goCoach(payload.coachId); }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis type='number' />
                  <YAxis type='category' dataKey={(d:any)=> d.name + ' ' + d.last_name} width={140} />
                  <Legend />
                  <ReTooltip />
                  <Bar dataKey='green' stackId='a' fill='#16a34a' name='Grün' />
                  <Bar dataKey='yellow' stackId='a' fill='#d97706' name='Gelb' />
                  <Bar dataKey='red' stackId='a' fill='#dc2626' name='Rot' />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>

        {/* Top Requirement Failures (single metric) */}
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Flex justify='space-between' align='start' mb={3}>
            <Box>
              <Text fontSize='sm' fontWeight='semibold'>Meiste Fehlversuche (Requirements)</Text>
              <Text fontSize='xs' color='gray.500'>Hover: verantwortlicher Coach</Text>
            </Box>
            <Button size='xs' onClick={fetchFailures} disabled={failureLoading} variant='ghost'>{failureLoading? '...' : 'Reload'}</Button>
          </Flex>
          <Box height={260}>
            {failureLoading ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={sortedFailures} layout='vertical' margin={{ left: 24, right: 12 }} onClick={(chart:any)=> { const payload = chart?.activePayload?.[0]?.payload; if (payload?.requirementId) goRequirement(payload.requirementId); }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis type='number' />
                  <YAxis type='category' dataKey='title' width={240} />
                  <ReTooltip content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                    if (active && payload && payload.length) {
                      const p:any = payload[0].payload;
                      return (
                        <Box p={2} bg='white' borderWidth='1px' rounded='md' shadow='sm'>
                          <Text fontSize='xs' fontWeight='semibold'>{p.title}</Text>
                          <Text fontSize='xs'>Fails: {p.failures}</Text>
                          {p.coachName && <Text fontSize='xs' color='gray.600'>Coach: {p.coachName}</Text>}
                        </Box>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey='failures' fill='#dc2626' name='Fehlversuche' radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
      </Box>

      {/* Failures Table full width */}
      <Box p={6} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
        <Flex justify='space-between' align='center' mb={4} wrap='wrap' gap={4}>
          <Box>
            <Text fontSize='sm' fontWeight='semibold'>Requirement Fehlversuche</Text>
            <Text fontSize='xs' color='gray.500'>Nicht erfüllte DailyCheck-Einträge</Text>
          </Box>
          <Flex gap={3}>
            <Button size='xs' onClick={fetchFailures} disabled={failureLoading} variant='outline'>{failureLoading? '...' : 'Reload'}</Button>
          </Flex>
        </Flex>
        <Box overflowX='auto'>
          {failureLoading ? <Flex justify='center' py={10}><Spinner /></Flex> : (
            <Table.Root size='sm' stickyHeader interactive>
              <Table.Header>
                <Table.Row bg='gray.50'>
                  <Table.ColumnHeader>Requirement</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='right'>Fehlversuche</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedFailures.map(r => (
                  <Table.Row key={r.requirementId} _hover={{bg:'gray.100', cursor:'pointer'}} onClick={()=> goRequirement(r.requirementId)}>
                    <Table.Cell maxW={280} whiteSpace='nowrap' overflow='hidden' textOverflow='ellipsis'>{r.title}</Table.Cell>
                    <Table.Cell textAlign='right'>{r.failures}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
export default AdminAnalytics;
