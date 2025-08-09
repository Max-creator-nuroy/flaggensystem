import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Flex, Text, Table, Spinner } from '@chakra-ui/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, LineChart, Line, Legend } from 'recharts';

interface CoachDetailData {
  coach: { id:string; name:string; last_name:string; email?:string; mobileNumber?:string };
  days: number;
  customersCount: number;
  flagTotals: { red:number; yellow:number; green:number };
  customers: { id:string; name:string; last_name:string; red:number; yellow:number; green:number; total:number }[];
  timeline: { date:string; red:number; yellow:number; green:number; total:number }[];
  requirementFlags: { requirementId:string; title:string; red:number; yellow:number; green:number; total:number }[];
}

export default function CoachDetail(){
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const days = searchParams.get('days') || '30';
  const [data,setData] = useState<CoachDetailData|null>(null);
  const [loading,setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(()=> {
    if(!id) return;
    (async()=> {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/admin/stats/coach/${id}?days=${days}`, { headers });
        if(res.ok){ const json = await res.json(); setData(json.data); }
      } finally { setLoading(false); }
    })();
  }, [id,days]);

  if(!id) return <Text>Keine Coach-ID.</Text>;

  return (
    <Box p={6}>
      {loading && <Flex justify='center'><Spinner /></Flex>}
      {data && (
        <Flex direction='column' gap={8}>
          <Box>
            <Text fontSize='2xl' fontWeight='bold'>Coach: {data.coach.name} {data.coach.last_name}</Text>
            <Text fontSize='sm' color='gray.500'>Zeitraum: {data.days} Tage • Kunden: {data.customersCount}</Text>
          </Box>
          <Flex gap={6} wrap='wrap'>
            <Stat label='Rot' value={data.flagTotals.red} color='red.600' />
            <Stat label='Gelb' value={data.flagTotals.yellow} color='yellow.600' />
            <Stat label='Grün' value={data.flagTotals.green} color='green.600' />
            <Stat label='Total Flags' value={data.flagTotals.red + data.flagTotals.yellow + data.flagTotals.green} />
          </Flex>
          <Box p={5} borderWidth='1px' rounded='lg' bg='white'>
            <Text fontWeight='semibold' mb={3}>Flag Timeline</Text>
            <Box height={260}>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data.timeline}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' hide={data.timeline.length>40} />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Line type='monotone' dataKey='red' stroke='#E53E3E' dot={false} />
                  <Line type='monotone' dataKey='yellow' stroke='#D69E2E' dot={false} />
                  <Line type='monotone' dataKey='green' stroke='#38A169' dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
          <Flex gap={6} wrap='wrap'>
            <Box flex='1' minW='340px' p={5} borderWidth='1px' rounded='lg' bg='white'>
              <Text fontWeight='semibold' mb={3}>Kunden Flags</Text>
              <Box height={320}>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={[...data.customers].sort((a,b)=> b.total - a.total).slice(0,12)} layout='vertical' margin={{left:120}}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis type='number' />
                    <YAxis type='category' dataKey={(d:any)=> d.name + ' ' + d.last_name} width={140} />
                    <ReTooltip />
                    <Bar dataKey='green' stackId='a' fill='#38A169' />
                    <Bar dataKey='yellow' stackId='a' fill='#D69E2E' />
                    <Bar dataKey='red' stackId='a' fill='#E53E3E' />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            <Box flex='1' minW='340px' p={5} borderWidth='1px' rounded='lg' bg='white'>
              <Text fontWeight='semibold' mb={3}>Requirement Flags</Text>
              <Box height={320}>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={data.requirementFlags.slice(0,12)} layout='vertical' margin={{left:160}} onClick={(chart:any)=> { const p = chart?.activePayload?.[0]?.payload; if(p?.requirementId) navigate(`/requirementDetail?id=${p.requirementId}`); }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis type='number' />
                    <YAxis type='category' dataKey='title' width={180} />
                    <ReTooltip />
                    <Bar dataKey='green' stackId='a' fill='#38A169' />
                    <Bar dataKey='yellow' stackId='a' fill='#D69E2E' />
                    <Bar dataKey='red' stackId='a' fill='#E53E3E' />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Flex>
          <Box>
            <Text fontWeight='semibold' mb={2}>Kunden Tabelle</Text>
            <Table.Root size='sm' stickyHeader interactive>
              <Table.Header>
                <Table.Row bg='gray.100'>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='right'>Gelb</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='right'>Rot</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='right'>Grün</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='right'>Total</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.customers.sort((a,b)=> b.total - a.total).map(c => (
                  <Table.Row key={c.id} _hover={{bg:'gray.50'}}>
                    <Table.Cell>{c.name} {c.last_name}</Table.Cell>
                    <Table.Cell textAlign='right' color='yellow.600'>{c.yellow}</Table.Cell>
                    <Table.Cell textAlign='right' color='red.600'>{c.red}</Table.Cell>
                    <Table.Cell textAlign='right' color='green.600'>{c.green}</Table.Cell>
                    <Table.Cell textAlign='right'>{c.total}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Flex>
      )}
    </Box>
  );
}

function Stat({ label, value, color }: { label:string; value:any; color?:string }) {
  return (
    <Box bg='white' borderWidth='1px' rounded='md' p={3} minW='140px' shadow='sm'>
      <Text fontSize='xs' textTransform='uppercase' color={color || 'gray.600'} fontWeight='bold'>{label}</Text>
      <Text fontSize='xl' fontWeight='semibold'>{value}</Text>
    </Box>
  );
}
