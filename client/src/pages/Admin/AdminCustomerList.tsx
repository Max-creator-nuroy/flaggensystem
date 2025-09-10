import { Box, Flex, Heading, Input, Table, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

export default function AdminCustomerList() {
  const token = localStorage.getItem("token");
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'phone' | 'role' | 'yellow' | 'red'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  // Filter-Status: "all" = alle, "atRisk" = garantie gefährdet, "lost" = garantie verloren
  const [filterStatus, setFilterStatus] = useState<"all" | "atRisk" | "lost">(
    "all"
  );

  const handleClick = (userId: string) => {
    navigate(`/dashboard/CUSTOMER?userId=${userId}`);
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/users/getAllCustomer`,
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, []);

  // erweitertes Filtern nach Suchbegriff UND Status
  const filteredCustomers = customerList.filter((customer: any) => {
    // Suche filtern
    const fullText = `${customer.name} ${customer.last_name} ${
      customer.mobileNumber
    } ${customer.isAffiliate ? "Affiliate" : "Kunde"}`.toLowerCase();
    if (!fullText.includes(searchTerm.toLowerCase())) return false;

    // Filter nach Flag-Status
    if (filterStatus === "atRisk") {
      const redFlags = (customer.flags?.filter((flag: any) => flag.color === "RED")?.length ?? 0);
      return redFlags >= 5 && redFlags < 10;
    } else if (filterStatus === "lost") {
      const redFlags = (customer.flags?.filter((flag: any) => flag.color === "RED")?.length ?? 0);
      return redFlags >= 10;
    }

    return true; // "all"
  });

  const sortedCustomers = useMemo(()=> {
    const list = [...filteredCustomers];
    return list.sort((a:any,b:any) => {
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
          av = a.isAffiliate ? 1 : 0;
          bv = b.isAffiliate ? 1 : 0;
          break;
        case 'yellow':
          av = (a.flags?.filter((f:any)=> f.color==='YELLOW' && ((f.escalatedTo?.length ?? 0)===0))?.length ?? 0);
          bv = (b.flags?.filter((f:any)=> f.color==='YELLOW' && ((f.escalatedTo?.length ?? 0)===0))?.length ?? 0);
          break;
        case 'red':
          av = (a.flags?.filter((f:any)=> f.color==='RED')?.length ?? 0);
          bv = (b.flags?.filter((f:any)=> f.color==='RED')?.length ?? 0);
          break;
      }
      if (av < bv) return sortDir==='asc' ? -1 : 1;
      if (av > bv) return sortDir==='asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d=> d==='asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); }
  };

  const exportCsv = () => {
    const headers = ['Name','Telefon','Rolle','Gelb','Rot'];
    const rows = sortedCustomers.map((c:any)=> [
      `${c.name} ${c.last_name}`,
      c.mobileNumber || '',
      c.isAffiliate ? 'Affiliate' : 'Kunde',
      (c.flags?.filter((f:any)=> f.color==='YELLOW' && ((f.escalatedTo?.length ?? 0)===0))?.length ?? 0),
      (c.flags?.filter((f:any)=> f.color==='RED')?.length ?? 0),
    ]);
    const csv = [headers, ...rows].map(r=> r.join(';')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kunden.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalCustomers = customerList.length;
  const avgRed = totalCustomers ? (customerList.reduce((acc,c)=> acc + ((c.flags?.filter((f:any)=> f.color==='RED')?.length ?? 0)),0)/ totalCustomers).toFixed(2) : '0';

  return (
    <Box p={4} borderWidth="1px" rounded="lg" bg="var(--color-surface)" borderColor="var(--color-border)">
      <Flex justify="space-between" wrap="wrap" gap={6}>
        <Box minW="260px" flex="1">
          <Heading size="md" mb={3}>
            Kundenübersicht
          </Heading>
          <Input
            placeholder="Suche nach Name, Nummer oder Rolle"
            bg="var(--color-surface)"
            borderColor="var(--color-border)"
            shadow="sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            width="100%"
            maxW="520px"
            size="sm"
          />
          <Flex mt={3} gap={5} wrap="wrap" fontSize="sm">
            <Text
              px={3}
              py={1}
              bg={filterStatus==='atRisk' ? 'rgba(255,255,255,0.10)' : 'var(--color-badge-bg)'}
              color="var(--color-text)"
              border="1px solid var(--color-border)"
              borderLeftWidth={filterStatus==='atRisk' ? '4px' : '1px'}
              borderLeftColor="#a16207"
              borderRadius="full"
              cursor="pointer"
              _hover={{ bg: 'rgba(255,255,255,0.12)' }}
              onClick={()=> setFilterStatus(filterStatus==='atRisk' ? 'all':'atRisk')}
              fontWeight="medium"
            >
              Gefährdet: {atRisk}
            </Text>
            <Text
              px={3}
              py={1}
              bg={filterStatus==='lost' ? 'rgba(255,255,255,0.10)' : 'var(--color-badge-bg)'}
              color="var(--color-text)"
              border="1px solid var(--color-border)"
              borderLeftWidth={filterStatus==='lost' ? '4px' : '1px'}
              borderLeftColor="#b91c1c"
              borderRadius="full"
              cursor="pointer"
              _hover={{ bg: 'rgba(255,255,255,0.12)' }}
              onClick={()=> setFilterStatus(filterStatus==='lost' ? 'all':'lost')}
              fontWeight="medium"
            >
              Verloren: {garantyLost}
            </Text>
            <Text px={3} py={1} bg="rgba(255,255,255,0.06)" color="var(--color-text)" borderRadius="full">Gesamt: {totalCustomers}</Text>
            <Text px={3} py={1} bg="rgba(168,85,247,0.15)" color="var(--color-text)" borderRadius="full">∅ Rot: {avgRed}</Text>
          </Flex>
        </Box>
        <Flex gap={4} align="flex-start" fontSize="sm">
          <Text
            as="span"
            px={3}
            py={1}
            bg="rgba(255,255,255,0.06)"
            color="var(--color-text)"
            border="1px solid var(--color-border)"
            borderRadius="md"
            cursor={loading ? 'not-allowed':'pointer'}
            opacity={loading?0.6:1}
            _hover={loading ? {} : { bg: 'rgba(255,255,255,0.10)' }}
            onClick={()=> !loading && fetchCustomer()}
          >{loading? 'Lade...' : 'Aktualisieren'}</Text>
          <Text
            as="span"
            px={3}
            py={1}
            bg="rgba(255,255,255,0.06)"
            color="var(--color-text)"
            border="1px solid var(--color-border)"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'rgba(255,255,255,0.10)' }}
            onClick={exportCsv}
          >Export CSV</Text>
        </Flex>
      </Flex>


      <Box
        overflowX="auto"
        borderRadius="lg"
        shadow="sm"
        bg='var(--color-surface)'
      >
        <Table.Root size='sm' stickyHeader interactive className="admin-table">
          <Table.Header>
            <Table.Row bg="rgba(255,255,255,0.04)" borderBottom="1px solid var(--color-border)">
              <Table.ColumnHeader onClick={()=>toggleSort('name')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                <Flex align='center' gap={1}>Name {sortKey==='name' && (sortDir==='asc' ? <FiChevronUp /> : <FiChevronDown />)}</Flex>
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('phone')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                <Flex align='center' gap={1}>Telefon {sortKey==='phone' && (sortDir==='asc' ? <FiChevronUp /> : <FiChevronDown />)}</Flex>
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('role')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                <Flex align='center' gap={1}>Rolle {sortKey==='role' && (sortDir==='asc' ? <FiChevronUp /> : <FiChevronDown />)}</Flex>
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign='end' onClick={()=>toggleSort('yellow')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                <Flex justify='flex-end' align='center' gap={1}>Gelb {sortKey==='yellow' && (sortDir==='asc' ? <FiChevronUp /> : <FiChevronDown />)}</Flex>
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign='end' onClick={()=>toggleSort('red')} _hover={{cursor:'pointer', bg:'rgba(255,255,255,0.06)'}}>
                <Flex justify='flex-end' align='center' gap={1}>Rot {sortKey==='red' && (sortDir==='asc' ? <FiChevronUp /> : <FiChevronDown />)}</Flex>
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedCustomers.map((c) => (
              <Table.Row
                key={c.id}
                bg='var(--color-surface)'
                borderBottom='1px solid #0a0f18'
                _hover={{ bg:'rgba(0,0,0,0.22)' }}
                onClick={() => handleClick(c.id)}
              >
                <Table.Cell>{c.name} {c.last_name}</Table.Cell>
                <Table.Cell>{c.mobileNumber}</Table.Cell>
                <Table.Cell>{c.isAffiliate ? 'Affiliate' : 'Kunde'}</Table.Cell>
                <Table.Cell textAlign='end' color='yellow.600'>{(c.flags?.filter((f:any)=> f.color==='YELLOW' && ((f.escalatedTo?.length ?? 0)===0))?.length ?? 0)}</Table.Cell>
                <Table.Cell textAlign='end' color='red.600'>{(c.flags?.filter((f:any)=> f.color==='RED')?.length ?? 0)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}
