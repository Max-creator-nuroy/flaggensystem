import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function CoachCustomerList() {
  const token = localStorage.getItem("token");
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const coach = getUserFromToken(token);
  // Filter-Status: "all" = alle, "atRisk" = garantie gefährdet, "lost" = garantie verloren
  const [filterStatus, setFilterStatus] = useState<"all" | "atRisk" | "lost">(
    "all"
  );
  const [sortKey, setSortKey] = useState<'name' | 'phone' | 'role' | 'yellow' | 'red'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // Replace single role filter with independent toggles
  const [showCustomers, setShowCustomers] = useState(true);
  const [showAffiliates, setShowAffiliates] = useState(true);

  const handleClick = (userId: string) => {
    navigate(`/dashboard/CUSTOMER?userId=${userId}`);
  };

  const fetchCustomer = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/users/getCustomersByCoach/${coach.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setCustomerList(data);

      let atRiskCount = 0;
      let lostCount = 0;

      for (const customer of data) {
        if (customer.flags) {
          const redFlags = customer.flags.filter(
            (flag: any) => flag.color === "RED"
          ).length;

          if (redFlags >= 10) lostCount++;
          else if (redFlags >= 5) atRiskCount++;
        }
      }

      setAtRisk(atRiskCount);
      setGarantyLost(lostCount);
    } catch (error) {
      console.error("Fehler beim Laden der Kunden:", error);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, []);

  // helper for role sorting weight
  const roleWeight = (u:any) => {
    const isCust = u.isCustomer ?? (u.role === 'CUSTOMER');
    const isAff = !!u.isAffiliate;
    return (isAff && isCust) ? 2 : (isAff ? 1 : (isCust ? 0 : -1));
  };

  // erweitertes Filtern nach Suchbegriff, Status, Rolle
  const filteredCustomers = customerList.filter((customer: any) => {
    const isCust = (customer.isCustomer ?? (customer.role === 'CUSTOMER')) as boolean;
    const isAff = !!customer.isAffiliate;

    // Suche filtern (inkl. beider Rollenbezeichnungen, falls beides)
    const roleTextParts:string[] = [];
    if (isAff) roleTextParts.push("Affiliate");
    if (isCust) roleTextParts.push("Kunde");
    const fullText = `${customer.name} ${customer.last_name} ${customer.mobileNumber} ${roleTextParts.join(" ")}`.toLowerCase();
    if (!fullText.includes(searchTerm.toLowerCase())) return false;

    const redFlags = customer.flags?.filter((flag: any) => flag.color === "RED").length || 0;

    // Filter nach Flag-Status
    if (filterStatus === "atRisk") {
      if (!(redFlags >= 5 && redFlags < 10)) return false;
    } else if (filterStatus === "lost") {
      if (!(redFlags >= 10)) return false;
    }

    // Rollen-Toggles (OR-Logik): zeigen, wenn eine der gewählten Rollen zutrifft
    const roleMatch = ((showCustomers && isCust) || (showAffiliates && isAff));
    if (!roleMatch) return false;

    return true; // alles bestanden
  });

  const sortedCustomers = [...filteredCustomers].sort((a,b) => {
    let av:any; let bv:any;
    switch (sortKey) {
      case 'name':
        av = (a.name + ' ' + a.last_name).toLowerCase();
        bv = (b.name + ' ' + b.last_name).toLowerCase();
        break;
      case 'phone':
        av = a.mobileNumber || '';
        bv = b.mobileNumber || '';
        break;
      case 'role':
        av = roleWeight(a);
        bv = roleWeight(b);
        break;
      case 'yellow':
        av = a.flags?.filter((f:any)=> f.color==='YELLOW' && f.escalatedTo.length===0).length || 0;
        bv = b.flags?.filter((f:any)=> f.color==='YELLOW' && f.escalatedTo.length===0).length || 0;
        break;
      case 'red':
        av = a.flags?.filter((f:any)=> f.color==='RED').length || 0;
        bv = b.flags?.filter((f:any)=> f.color==='RED').length || 0;
        break;
    }
    if (av < bv) return sortDir==='asc' ? -1 : 1;
    if (av > bv) return sortDir==='asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d=> d==='asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <Box p={4} maxW="100%">
      {/* Kopfzeile: Titel links, Button rechts */}
      <Flex justifyContent="space-between" align="center" mb={4}>
        <Heading size="md">Kundenübersicht</Heading>
        <Button onClick={()=> navigate('/createUser')}>Kunde anlegen</Button>
      </Flex>

      {/* Suchleiste + Filter zentral */}
      <VStack align="center" w="100%">
        {/* zentrierte Suche */}
        <Input
          placeholder="Suche nach Name, Nummer oder Rolle"
          bg="var(--color-surface)"
          borderColor="var(--color-border)"
          color="var(--color-text)"
          shadow="sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          width="100%"
          maxW="600px"
          mx="auto"
        />
        {/* Neue, aufgeräumte Filterleiste (vertikal gestapelt) */}
        <VStack align="center" w="100%" maxW="800px" mx="auto" mb={3} >
          {/* Rollen (native Checkboxen) */}
          <Flex align="center" justify="center" gap={3} >
            <Text fontSize="sm" color="gray.400">Rolle:</Text>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={showCustomers}
                onChange={(e)=> setShowCustomers(e.currentTarget.checked)}
              />
              <span>Kunde</span>
            </label>
            <label style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={showAffiliates}
                onChange={(e)=> setShowAffiliates(e.currentTarget.checked)}
              />
              <span>Affiliate</span>
            </label>
          </Flex>
          {/* Status */}
          <Flex align="center" justify="center" gap={2}>
            <Text fontSize="sm" color="gray.400">Status:</Text>
            <Button
              size="sm"
              variant={filterStatus==='all' ? 'solid':'outline'}
              colorScheme="gray"
              onClick={()=> setFilterStatus('all')}
            >
              Alle
            </Button>
            <Button
              size="sm"
              variant={filterStatus==='atRisk' ? 'solid':'outline'}
              colorScheme="orange"
              onClick={()=> setFilterStatus('atRisk')}
            >
              Gefährdet ({atRisk})
            </Button>
            <Button
              size="sm"
              variant={filterStatus==='lost' ? 'solid':'outline'}
              colorScheme="red"
              onClick={()=> setFilterStatus('lost')}
            >
              Verloren ({garantyLost})
            </Button>
          </Flex>
        </VStack>
      </VStack>

      {/* Scoped dark styles for the table (avoid sx on Table) */}
      <style>{`
        .customerTableWrap table { background: transparent; border-collapse: collapse; border-spacing: 0; }
        .customerTableWrap thead { background: transparent; }
        .customerTableWrap thead tr th, .customerTableWrap thead tr td { background: rgba(255,255,255,0.04); color: var(--color-text); border-color: var(--color-border); }
        .customerTableWrap thead tr th { position: sticky; top: 0; z-index: 1; }
        .customerTableWrap tbody { background: transparent; }
        .customerTableWrap tbody tr { background: transparent; }
        .customerTableWrap tbody tr:hover { background: rgba(255,255,255,0.06); }
        .customerTableWrap tbody td, .customerTableWrap tbody th { background: transparent; border-color: var(--color-border); }
      `}</style>

      <Box
        overflowX="auto"
        borderRadius="lg"
        shadow="sm"
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        className="customerTableWrap"
      >
        <Table.Root
          size="sm"
          stickyHeader
          interactive
          bg="transparent"
          color="var(--color-text)"
          style={{ borderCollapse: 'collapse', borderSpacing: 0 }}
        >
          <Table.Header>
            <Table.Row bg="rgba(255,255,255,0.04)">
              <Table.ColumnHeader onClick={()=>toggleSort('name')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                Name {sortKey==='name' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('phone')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                Telefon {sortKey==='phone' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('role')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                Rolle {sortKey==='role' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" onClick={()=>toggleSort('yellow')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                Gelb {sortKey==='yellow' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" onClick={()=>toggleSort('red')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                Rot {sortKey==='red' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedCustomers.map((customer) => (
              <Table.Row
                key={customer.id}
                onClick={() => handleClick(customer.id)}
                _hover={{ bg: "rgba(255,255,255,0.06)", cursor: "pointer" }}
                bg="transparent"
              >
                <Table.Cell>
                  {customer.name} {customer.last_name}
                </Table.Cell>
                <Table.Cell>{customer.mobileNumber}</Table.Cell>
                <Table.Cell>
                  {((customer.isAffiliate) && (customer.isCustomer ?? (customer.role === 'CUSTOMER')))
                    ? "Affiliate & Kunde"
                    : customer.isAffiliate
                      ? "Affiliate"
                      : (customer.isCustomer ?? (customer.role === 'CUSTOMER'))
                        ? "Kunde"
                        : "—"}
                </Table.Cell>
                <Table.Cell textAlign="end" color="yellow.600">
                  {customer.flags?.filter(
                    (f: any) => f.color === "YELLOW" && f.escalatedTo.length === 0
                  ).length || 0}
                </Table.Cell>
                <Table.Cell textAlign="end" color="red.600">
                  {customer.flags?.filter((f: any) => f.color === "RED")
                    .length || 0}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}
