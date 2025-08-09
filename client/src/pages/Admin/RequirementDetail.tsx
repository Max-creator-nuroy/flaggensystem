import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Flex, Text, Table, Spinner } from '@chakra-ui/react';

interface RequirementDetailData {
  id: string;
  title: string;
  description?: string;
  coach?: { id: string; name: string; last_name: string };
  flagCounts: Record<string, number>;
  totalFlags: number;
  recentFlags: { id: string; color: string; createdAt: string; userId: string }[];
  periodDays: number;
  failures: number;
  totalEntries: number;
  failureRate: number;
}

export default function RequirementDetail() {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const days = searchParams.get('days') || '30';
  const [data, setData] = useState<RequirementDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=> {
    if (!id) return;
    (async()=> {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/admin/stats/requirement/${id}?days=${days}`, { headers });
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } finally { setLoading(false); }
    })();
  }, [id, days]);

  if (!id) return <Text>Keine Requirement-ID angegeben.</Text>;

  return (
    <Box p={6}>
      {loading && <Flex justify='center'><Spinner /></Flex>}
      {data && (
        <Flex direction='column' gap={6}>
          <Box>
            <Text fontSize='2xl' fontWeight='bold'>{data.title}</Text>
            <Text fontSize='sm' color='gray.500'>{data.description || 'Keine Beschreibung.'}</Text>
            {data.coach && <Text fontSize='sm' mt={2}>Coach: {data.coach.name} {data.coach.last_name}</Text>}
          </Box>
          <Flex gap={8} wrap='wrap'>
            <StatBox label='Zeitraum (Tage)' value={data.periodDays} />
            <StatBox label='Total Flags' value={data.totalFlags} />
            <StatBox label='Rot' value={data.flagCounts?.RED || 0} color='red.600' />
            <StatBox label='Gelb' value={data.flagCounts?.YELLOW || 0} color='yellow.600' />
            <StatBox label='Grün' value={data.flagCounts?.GREEN || 0} color='green.600' />
            <StatBox label='Fails' value={data.failures} />
            <StatBox label='Entries' value={data.totalEntries} />
            <StatBox label='Fail Rate %' value={data.failureRate.toFixed(1)} />
          </Flex>
          <Box>
            <Text fontWeight='semibold' mb={2}>Letzte Flags</Text>
            <Table.Root size='sm' stickyHeader interactive>
              <Table.Header>
                <Table.Row bg='gray.100'>
                  <Table.ColumnHeader>Farbe</Table.ColumnHeader>
                  <Table.ColumnHeader>Datum</Table.ColumnHeader>
                  <Table.ColumnHeader>User</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.recentFlags.map(f => (
                  <Table.Row key={f.id}>
                    <Table.Cell><Text color={f.color==='RED'?'red.600': f.color==='YELLOW'?'yellow.600':'green.600'}>{f.color}</Text></Table.Cell>
                    <Table.Cell>{new Date(f.createdAt).toLocaleString()}</Table.Cell>
                    <Table.Cell>{f.userId}</Table.Cell>
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

function StatBox({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <Box bg='white' borderWidth='1px' rounded='md' p={3} minW='130px' shadow='sm'>
      <Text fontSize='xs' textTransform='uppercase' color={color || 'gray.600'} fontWeight='bold'>{label}</Text>
      <Text fontSize='xl' fontWeight='semibold'>{value}</Text>
    </Box>
  );
}
