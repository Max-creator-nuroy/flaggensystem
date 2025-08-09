import { useEffect, useState, useMemo } from 'react';
import { Box, Flex, Text, Button, Spinner } from '@chakra-ui/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import getUserFromToken from '@/services/getTokenFromLokal';

interface LeadGrowthPoint { date:string; newLeads:number; cumulative:number; }
interface CustomerGrowthPoint { date:string; newCustomers:number; cumulative:number; }
interface RequirementFailure { requirementId:string; title:string; failures:number; }

const dayOptions = [7,14,30,60,90];
const selectStyle: React.CSSProperties = { padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E0', background: 'white', fontSize: '0.7rem' };
const SimpleSelect = ({ value, onChange, options }: { value:number; onChange:(v:number)=>void; options:number[] }) => (
  <select value={value} onChange={e=> onChange(parseInt(e.target.value))} style={selectStyle}>
    {options.map(o=> <option key={o} value={o}>{o} Tage</option>)}
  </select>
);

export default function CoachAnalytics(){
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` };
  const [searchParams] = useSearchParams();
  const coachId = searchParams.get('coachId');

  const [days, setDays] = useState(30);
  const [growth, setGrowth] = useState<LeadGrowthPoint[]>([]);
  const [loadingGrowth, setLoadingGrowth] = useState(false);

  // Customer growth
  const [custDays, setCustDays] = useState(30);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowthPoint[]>([]);
  const [loadingCustGrowth, setLoadingCustGrowth] = useState(false);

  // Requirement failures
  const [failDays, setFailDays] = useState(30);
  const [failures, setFailures] = useState<RequirementFailure[]>([]);
  const [loadingFailures, setLoadingFailures] = useState(false);

  const fetchLeadGrowth = async () => {
    setLoadingGrowth(true);
    try {
      const res = await fetch(`http://localhost:3000/leads/leadGrowth?days=${days}${coachId?`&coachId=${coachId}`:''}`, { headers });
      if(res.ok){ const json = await res.json(); setGrowth(json.data || []); }
    } finally { setLoadingGrowth(false); }
  };

  const fetchCustomerGrowth = async () => {
    setLoadingCustGrowth(true);
    try {
      const current = getUserFromToken(token || '')?.id;
      const id = coachId || current;
      if(!id) return;
      const res = await fetch(`http://localhost:3000/admin/stats/coachCustomerGrowth/${id}?days=${custDays}`, { headers });
      if(res.ok){ const json = await res.json();
        let data:CustomerGrowthPoint[] = json.data || [];
        // If baseline present but no points (edge) ensure we show one synthetic point
        if(!data.length && json.baseline){
          const todayKey = new Date().toISOString().slice(0,10);
          data = [{ date: todayKey, newCustomers:0, cumulative: json.baseline }];
        }
        // Fallback: if still no customers visible but coach has customers via relation endpoint
        const allZero = data.every(d=> d.newCustomers===0 && d.cumulative===0);
        if(allZero){
          const alt = await fetch(`http://localhost:3000/users/getCustomersByCoach/${id}`, { headers });
          if(alt.ok){
            const arr = await alt.json();
            if(Array.isArray(arr) && arr.length){
              // Build growth from user createdAt timestamps
              const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - custDays);
              const map: Record<string, number> = {};
              let baseline = 0;
              arr.forEach((c:any)=> {
                const created = new Date(c.createdAt);
                if(created < fromDate) baseline += 1; else {
                  const key = created.toISOString().slice(0,10);
                  map[key] = (map[key]||0)+1;
                }
              });
              const rebuilt: CustomerGrowthPoint[] = [];
              let cursor = new Date(fromDate); let cumulative = baseline; const today = new Date();
              while(cursor <= today){
                const key = cursor.toISOString().slice(0,10);
                const nc = map[key]||0; cumulative += nc;
                rebuilt.push({ date:key, newCustomers:nc, cumulative });
                cursor.setDate(cursor.getDate()+1);
              }
              data = rebuilt;
            }
          }
        }
        setCustomerGrowth(data);
      }
    } finally { setLoadingCustGrowth(false); }
  };

  const fetchRequirementFailures = async () => {
    setLoadingFailures(true);
    try {
      const current = getUserFromToken(token || '')?.id;
      const id = coachId || current;
      if(!id) return;
  const res = await fetch(`http://localhost:3000/admin/stats/coachRequirementFailures/${id}?days=${failDays}`, { headers });
      if(res.ok){ const json = await res.json(); setFailures(json.data || []); }
    } finally { setLoadingFailures(false); }
  };

  useEffect(()=> { fetchLeadGrowth(); }, [days, coachId]);
  useEffect(()=> { fetchCustomerGrowth(); }, [custDays, coachId]);
  useEffect(()=> { fetchRequirementFailures(); }, [failDays, coachId]);

  const totalLeads = growth.length ? growth[growth.length-1].cumulative : 0;
  const newLeadsPeriod = useMemo(()=> growth.reduce((s,c)=> s + c.newLeads,0), [growth]);
  const totalCustomers = customerGrowth.length ? customerGrowth[customerGrowth.length-1].cumulative : 0;
  const newCustomersPeriod = useMemo(()=> customerGrowth.reduce((s,c)=> s + c.newCustomers,0), [customerGrowth]);
  const topFailure = failures[0];

  const kpiBox = (label:string, value:string|number, sub?:string, color?:string) => (
    <Box key={label} p={4} rounded='lg' borderWidth='1px' bg='white' minW='160px'>
      <Text fontSize='xs' color='gray.500' textTransform='uppercase' fontWeight='semibold'>{label}</Text>
      <Text fontSize='xl' fontWeight='bold' color={color||'gray.800'}>{value}</Text>
      {sub && <Text fontSize='xs' color='gray.500'>{sub}</Text>}
    </Box>
  );

  return (
    <Flex direction='column' gap={8}>
      <Flex gap={3} wrap='wrap'>
        {kpiBox('Neue Leads', newLeadsPeriod, `${days} Tage`,'teal')} 
        {kpiBox('Leads gesamt', totalLeads)}
        {kpiBox('Neue Kunden', newCustomersPeriod, `${custDays} Tage`,'green')} 
        {kpiBox('Kunden gesamt', totalCustomers)}
        {kpiBox('Top Requirement Fail', topFailure? topFailure.failures : '-', topFailure?.title?.slice(0,28),'red')} 
      </Flex>

      <Flex p={3} borderWidth='1px' bg='white' rounded='lg' align='center' gap={6} wrap='wrap'>
        <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Leads</Text>
          <SimpleSelect value={days} onChange={setDays} options={dayOptions} />
          <Button size='xs' onClick={fetchLeadGrowth} disabled={loadingGrowth} variant='outline'>{loadingGrowth?'...':'Reload'}</Button>
        </Flex>
        <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Kunden</Text>
          <SimpleSelect value={custDays} onChange={setCustDays} options={dayOptions} />
          <Button size='xs' onClick={fetchCustomerGrowth} disabled={loadingCustGrowth} variant='outline'>{loadingCustGrowth?'...':'Reload'}</Button>
        </Flex>
        <Flex align='center' gap={2}>
          <Text fontSize='xs' fontWeight='semibold' color='gray.600'>Failures</Text>
          <SimpleSelect value={failDays} onChange={setFailDays} options={dayOptions} />
        </Flex>
        <Flex ml='auto' fontSize='xs' color='gray.500'>Aktualisiert: {new Date().toLocaleTimeString()}</Flex>
      </Flex>

      <Box display='grid' gap={6} gridTemplateColumns='repeat(auto-fill,minmax(340px,1fr))'>
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Text fontSize='sm' fontWeight='semibold' mb={2}>Lead Wachstum (neu)</Text>
          <Box height={220}>
            {loadingGrowth ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={growth}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={growth.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey='newLeads' fill='#0d9488' radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
  <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Text fontSize='sm' fontWeight='semibold' mb={2}>Lead Wachstum (kumulativ)</Text>
          <Box height={220}>
            {loadingGrowth ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={growth.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Line type='monotone' dataKey='cumulative' stroke='#2563eb' strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Text fontSize='sm' fontWeight='semibold' mb={2}>Kunden Wachstum (neu)</Text>
          <Box height={220}>
            {loadingCustGrowth ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : customerGrowth.length===0 ? <Flex justify='center' align='center' h='100%'><Text fontSize='xs' color='gray.500'>Keine Kunden gefunden</Text></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={customerGrowth.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey='newCustomers' fill='#10b981' radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Text fontSize='sm' fontWeight='semibold' mb={2}>Kunden Wachstum (kumulativ)</Text>
          <Box height={220}>
            {loadingCustGrowth ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : customerGrowth.length===0 ? <Flex justify='center' align='center' h='100%'><Text fontSize='xs' color='gray.500'>Keine Kunden Daten</Text></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={customerGrowth.length>25} />
                  <YAxis />
                  <ReTooltip />
                  <Line type='monotone' dataKey='cumulative' stroke='#059669' strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
        <Box p={5} borderWidth='1px' rounded='xl' bg='white' shadow='sm'>
          <Text fontSize='sm' fontWeight='semibold' mb={2}>Top Requirement Failures</Text>
          <Box height={260}>
            {loadingFailures ? <Flex justify='center' align='center' h='100%'><Spinner size='sm' /></Flex> : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={failures} layout='vertical' margin={{ left: 20, right: 12 }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis type='number' />
                  <YAxis type='category' dataKey='title' width={200} />
                  <ReTooltip />
                  <Bar dataKey='failures' fill='#dc2626' radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
