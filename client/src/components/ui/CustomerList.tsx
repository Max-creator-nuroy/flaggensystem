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

export default function AdminCustomerList() {
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

  // erweitertes Filtern nach Suchbegriff UND Status
  const filteredCustomers = customerList.filter((customer: any) => {
    // Suche filtern
    const fullText = `${customer.name} ${customer.last_name} ${customer.mobileNumber
      } ${customer.isAffiliate ? "Affiliate" : "Kunde"}`.toLowerCase();
    if (!fullText.includes(searchTerm.toLowerCase())) return false;

    // Filter nach Flag-Status
    if (filterStatus === "atRisk") {
      const redFlags =
        customer.flags?.filter((flag: any) => flag.color === "RED").length || 0;
      return redFlags >= 5 && redFlags < 10;
    } else if (filterStatus === "lost") {
      const redFlags =
        customer.flags?.filter((flag: any) => flag.color === "RED").length || 0;
      return redFlags >= 10;
    }

    return true; // "all"
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
        av = a.isAffiliate ? 1 : 0;
        bv = b.isAffiliate ? 1 : 0;
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
      <Flex justifyContent={"space-between"} mb={4}>
        <VStack>
          <Heading size="md">Kundenübersicht</Heading>
          <Input
            placeholder="Suche nach Name, Nummer oder Rolle"
            bg="white"
            shadow="sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            width="100%"
            maxW="600px"
          />
          <Flex gap={4} wrap="wrap">
            <Text
              color="yellow.600"
              cursor="pointer"
              fontWeight={filterStatus === "atRisk" ? "bold" : "normal"}
              onClick={() =>
                setFilterStatus(filterStatus === "atRisk" ? "all" : "atRisk")
              }
            >
              Garantie gefährdet: {atRisk}
            </Text>
            <Text
              color="red.600"
              cursor="pointer"
              fontWeight={filterStatus === "lost" ? "bold" : "normal"}
              onClick={() =>
                setFilterStatus(filterStatus === "lost" ? "all" : "lost")
              }
            >
              Garantie verloren: {garantyLost}
            </Text>
            <Flex justifyContent={"end"}>
              <Button
                onClick={() => {
                  navigate(`/createUser`);
                }}
              >
                Kunde anlegen
              </Button>
            </Flex>
          </Flex>
        </VStack>
      </Flex>

      <Box overflowX="auto" borderRadius="lg" shadow="sm">
        <Table.Root size="sm" stickyHeader interactive>
          <Table.Header>
            <Table.Row bg="gray.100">
              <Table.ColumnHeader onClick={()=>toggleSort('name')} _hover={{cursor:'pointer', bg:'gray.50'}}>
                Name {sortKey==='name' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('phone')} _hover={{cursor:'pointer', bg:'gray.50'}}>
                Telefon {sortKey==='phone' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader onClick={()=>toggleSort('role')} _hover={{cursor:'pointer', bg:'gray.50'}}>
                Rolle {sortKey==='role' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" onClick={()=>toggleSort('yellow')} _hover={{cursor:'pointer', bg:'gray.50'}}>
                Gelb {sortKey==='yellow' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" onClick={()=>toggleSort('red')} _hover={{cursor:'pointer', bg:'gray.50'}}>
                Rot {sortKey==='red' && (sortDir==='asc' ? '▲':'▼')}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedCustomers.map((customer) => (
              <Table.Row
                key={customer.id}
                onClick={() => handleClick(customer.id)}
                _hover={{ bg: "gray.50", cursor: "pointer" }}
              >
                <Table.Cell>
                  {customer.name} {customer.last_name}
                </Table.Cell>
                <Table.Cell>{customer.mobileNumber}</Table.Cell>
                <Table.Cell>
                  {customer.isAffiliate ? "Affiliate" : "Kunde"}
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
