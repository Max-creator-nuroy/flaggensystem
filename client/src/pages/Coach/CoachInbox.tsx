import { useEffect, useState, useCallback } from 'react';
import { Box, Flex, Heading, Spinner, Button, Badge, Text, Icon, VStack } from '@chakra-ui/react';
import { FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import getUserFromToken from '@/services/getTokenFromLokal';

interface AbsenceMessage {
  id: string;
  type: 'URLAUB' | 'KRANKHEIT' | 'ANDERES';
  from: string;
  to: string;
  note?: string | null;
  createdAt: string;
  processed: boolean;
  accepted: boolean | null;
  customer: { id: string; name: string; last_name: string };
}

interface InboxGroup { unbearbeitet: AbsenceMessage[]; bearbeitet: AbsenceMessage[]; }
interface InboxResponse { URLAUB: InboxGroup; KRANKHEIT: InboxGroup; }

export default function CoachInbox() {
  const token = localStorage.getItem('token');
  getUserFromToken(token); // aktuell nicht genutzt, reserviert für spätere Erweiterung
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("URLAUB_UNBEARBEITET");

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/absence/request/coach', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler');
      const json = await res.json();
      // Wir transformieren die flache Liste in unsere Struktur
      const grouped: InboxResponse = {
        URLAUB: { unbearbeitet: [], bearbeitet: [] },
        KRANKHEIT: { unbearbeitet: [], bearbeitet: [] },
      };
      (json as any[]).forEach((req: any) => {
        if (req.type === 'URLAUB' || req.type === 'KRANKHEIT') {
          const bucket: 'bearbeitet' | 'unbearbeitet' = req.processed ? 'bearbeitet' : 'unbearbeitet';
          (grouped as any)[req.type][bucket].push(req);
        }
      });
      setData(grouped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const decide = async (id: string, accept: boolean) => {
    setToggling(id);
    try {
      const res = await fetch(`http://localhost:3000/absence/request/decide/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accept })
      });
      if (res.ok) await fetchInbox();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const renderMessagesForSelection = () => {
    if (!data) return null;
    const map: Record<string, { title: string; items: AbsenceMessage[]; processed: boolean }> = {
      URLAUB_UNBEARBEITET: { title: 'Urlaub · Unbearbeitet', items: data.URLAUB.unbearbeitet, processed: false },
      URLAUB_BEARBEITET: { title: 'Urlaub · Bearbeitet', items: data.URLAUB.bearbeitet, processed: true },
      KRANKHEIT_UNBEARBEITET: { title: 'Krank · Unbearbeitet', items: data.KRANKHEIT.unbearbeitet, processed: false },
      KRANKHEIT_BEARBEITET: { title: 'Krank · Bearbeitet', items: data.KRANKHEIT.bearbeitet, processed: true },
    };
    const entry = map[selectedKey];
    if (!entry) return null;
    const DarkBadge = ({ children, color }: { children: any; color: string }) => (
      <Badge
        bg="var(--color-surface)"
        color="var(--color-text)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        borderLeftWidth="4px"
        borderLeftColor={color}
        rounded="md"
        fontWeight="medium"
      >
        {children}
      </Badge>
    );

    return (
      <Box>
        <Heading size="sm" mb={4}>{entry.title}</Heading>
        <VStack align="stretch" gap={3}>
          {entry.items.length === 0 && <Text fontSize="sm" color="var(--color-muted)">Keine Nachrichten</Text>}
          {entry.items.map(m => {
            const processed = entry.processed;
            return (
              <Flex key={m.id} direction="column" p={3} borderWidth="1px" borderColor="var(--color-border)" bg="var(--color-surface)" rounded="md" gap={2}>
                <Flex align="center" gap={2} wrap="wrap">
                  <Heading size="xs">{m.customer.name} {m.customer.last_name}</Heading>
                  <DarkBadge color={m.type === 'URLAUB' ? 'blue.500' : m.type === 'KRANKHEIT' ? 'red.500' : 'gray.500'}>
                    {m.type === 'URLAUB' ? 'Urlaub' : m.type === 'KRANKHEIT' ? 'Krank' : 'Anderes'}
                  </DarkBadge>
                  <DarkBadge color={processed ? 'gray.500' : 'yellow.500'}>
                    {processed ? 'Bearbeitet' : 'Offen'}
                  </DarkBadge>
                  {m.accepted === true && (
                    <DarkBadge color='green.500'>Akzeptiert</DarkBadge>
                  )}
                  {m.accepted === false && (
                    <DarkBadge color='red.600'>Abgelehnt</DarkBadge>
                  )}
                  <Text fontSize="xs" ml="auto" color="var(--color-muted)">{new Date(m.createdAt).toLocaleDateString('de-DE')}</Text>
                </Flex>
                <Text fontSize="sm"><b>Von:</b> {new Date(m.from).toLocaleDateString('de-DE')} <b>Bis:</b> {new Date(m.to).toLocaleDateString('de-DE')}</Text>
                {m.note && <Text fontSize="sm" whiteSpace="pre-wrap">{m.note}</Text>}
                <Flex justify="flex-end" gap={2} wrap="wrap">
                  {m.accepted == null && !processed && (
                    <>
                      <Button size='xs' variant='outline' colorScheme='green' onClick={() => decide(m.id, true)} loading={toggling===m.id}>
                        <Flex align='center' gap={1}><Icon as={FiCheckCircle} /><span>Akzeptieren</span></Flex>
                      </Button>
                      <Button size='xs' variant='outline' colorScheme='red' onClick={() => decide(m.id, false)} loading={toggling===m.id}>
                        <Flex align='center' gap={1}><Icon as={FiXCircle} /><span>Ablehnen</span></Flex>
                      </Button>
                    </>
                  )}
                </Flex>
              </Flex>
            );
          })}
        </VStack>
      </Box>
    );
  };

  const folderList = (data?: InboxResponse) => {
    if (!data) return [] as { key: string; label: string; count: number }[];
    return [
      { key: 'URLAUB_UNBEARBEITET', label: 'Urlaub (Offen)', count: data.URLAUB.unbearbeitet.length },
      { key: 'URLAUB_BEARBEITET', label: 'Urlaub (Bearbeitet)', count: data.URLAUB.bearbeitet.length },
      { key: 'KRANKHEIT_UNBEARBEITET', label: 'Krank (Offen)', count: data.KRANKHEIT.unbearbeitet.length },
      { key: 'KRANKHEIT_BEARBEITET', label: 'Krank (Bearbeitet)', count: data.KRANKHEIT.bearbeitet.length },
    ];
  };

  return (
    <Box maxW="1200px" mx="auto" p={{ base: 4, md: 8 }}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={3} mb={6}>
        <Box>
          <Heading size="lg" fontWeight="800">Nachrichten Postfach</Heading>
          <Text fontSize="sm" color="var(--color-muted)">Urlaub & Krankmeldungen deiner Kunden</Text>
        </Box>
        <Button size="sm" onClick={fetchInbox}>
          <Flex align="center" gap={2}>
            <Icon as={FiRefreshCw} />
            <span>Aktualisieren</span>
          </Flex>
        </Button>
      </Flex>
      {loading && (
        <Flex align="center" justify="center" py={20}><Spinner /></Flex>
      )}
      {!loading && data && (
        <Flex direction={{ base: 'column', md: 'row' }} gap={6} align="stretch">
          {/* Folder Sidebar */}
          <VStack align="stretch" minW={{ base: '100%', md: '260px' }} maxW={{ base: '100%', md: '280px' }}
            p={3} borderWidth="1px" borderColor="var(--color-border)" rounded="lg" bg="var(--color-surface)" gap={2}>
            <Heading size="xs" textTransform="uppercase" letterSpacing="0.05em" color="var(--color-muted)" mb={1}>Ordner</Heading>
            {folderList(data).map(f => {
              const active = selectedKey === f.key;
              return (
                <Button key={f.key} justifyContent="space-between" variant={active ? 'solid' : 'outline'} size="sm"
                  onClick={() => setSelectedKey(f.key)}
                  bg={active ? 'teal.600' : 'var(--color-surface)'}
                  _hover={{ bg: active ? 'teal.500' : 'rgba(255,255,255,0.04)' }}
                >
                  <Flex align="center" gap={2}>
                    <Box w="8px" h="8px" rounded="full" bg={f.key.includes('URLAUB') ? 'blue.400' : 'red.400'} />
                    <Text fontSize="sm" style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{f.label}</Text>
                  </Flex>
                  <Badge
                    bg="var(--color-surface)"
                    color="var(--color-text)"
                    borderWidth="1px"
                    borderColor="var(--color-border)"
                    borderLeftWidth="4px"
                    borderLeftColor={f.key.includes('URLAUB') ? 'blue.500' : 'red.500'}
                    rounded="md"
                    fontWeight="medium"
                  >{f.count}</Badge>
                </Button>
              );
            })}
      <Box h="1px" bg="var(--color-border)" my={1} />
            <Button size="sm" variant="ghost" onClick={fetchInbox}>
              <Flex align="center" gap={2}><Icon as={FiRefreshCw} />Aktualisieren</Flex>
            </Button>
          </VStack>
          {/* Content */}
          <Box flex={1}>{renderMessagesForSelection()}</Box>
        </Flex>
      )}
    </Box>
  );
}
