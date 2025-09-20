import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Badge,
  SimpleGrid,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  FiUsers, 
  FiUserPlus, 
  FiSearch, 
  FiFilter,
  FiAlertTriangle,
  FiXCircle,
  FiPhone,
  FiUser,
  FiTrendingUp
} from "react-icons/fi";

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
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header */}
      <Card.Root mb={6}>
        <CardHeader>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <Flex 
                w={12} h={12} 
                align="center" justify="center" 
                rounded="full" 
                bg="blue.500"
                color="white"
              >
                <Icon as={FiUsers} boxSize={6} />
              </Flex>
              <VStack align="start" gap={0}>
                <Heading size="lg">Kundenübersicht</Heading>
                <Text color="var(--color-muted)" fontSize="sm">
                  {filteredCustomers.length} von {customerList.length} Kunden
                </Text>
              </VStack>
            </Flex>
            <Button 
              onClick={() => navigate('/createUser')}
              colorScheme="blue"
              size="lg"
            >
              <Icon as={FiUserPlus} mr={2} />
              Kunde anlegen
            </Button>
          </Flex>
        </CardHeader>
      </Card.Root>

      <Flex gap={6} direction={{ base: "column", lg: "row" }} align="flex-start">
        {/* Sidebar Filters */}
        <Card.Root w={{ base: "100%", lg: "320px" }} flexShrink={0} position="sticky" top={6}>
          <CardHeader>
            <Flex align="center" gap={2}>
              <Icon as={FiFilter} color="blue.500" />
              <Heading size="md">Filter & Suche</Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack gap={6} align="stretch">
              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiSearch} color="green.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Suche</Text>
                </Flex>
                <Input
                  placeholder="Name, Nummer oder Rolle"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="var(--color-surface)"
                  borderColor="var(--color-border)"
                />
              </VStack>

              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiUser} color="purple.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Rollen</Text>
                </Flex>
                <VStack gap={2} align="stretch">
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showCustomers}
                      onChange={(e)=> setShowCustomers(e.currentTarget.checked)}
                    />
                    <Text fontSize="sm">Kunde</Text>
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showAffiliates}
                      onChange={(e)=> setShowAffiliates(e.currentTarget.checked)}
                    />
                    <Text fontSize="sm">Affiliate</Text>
                  </label>
                </VStack>
              </VStack>

              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiAlertTriangle} color="orange.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Status</Text>
                </Flex>
                <VStack gap={2} align="stretch">
                  <Button
                    size="sm"
                    variant={filterStatus==='all' ? 'solid':'outline'}
                    colorScheme="gray"
                    onClick={()=> setFilterStatus('all')}
                    justifyContent="flex-start"
                    w="100%"
                  >
                    Alle Kunden
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus==='atRisk' ? 'solid':'outline'}
                    colorScheme="orange"
                    onClick={()=> setFilterStatus('atRisk')}
                    justifyContent="space-between"
                    w="100%"
                  >
                    <Text>Gefährdet</Text>
                    <Badge colorScheme="orange" variant="subtle">{atRisk}</Badge>
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus==='lost' ? 'solid':'outline'}
                    colorScheme="red"
                    onClick={()=> setFilterStatus('lost')}
                    justifyContent="space-between"
                    w="100%"
                  >
                    <Text>Verloren</Text>
                    <Badge colorScheme="red" variant="subtle">{garantyLost}</Badge>
                  </Button>
                </VStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card.Root>

        {/* Main Content */}
        <Box flex="1">

          {/* Sort Controls */}
          <Card.Root mb={4}>
            <CardBody>
              <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                <Text fontSize="sm" color="var(--color-muted)">
                  Zeige {sortedCustomers.length} Kunden · Sortiert nach: {sortKey === 'name' ? 'Name' : sortKey === 'phone' ? 'Telefon' : sortKey === 'role' ? 'Rolle' : sortKey === 'yellow' ? 'Gelbe Flags' : 'Rote Flags'} ({sortDir === 'asc' ? 'aufsteigend' : 'absteigend'})
                </Text>
                <HStack gap={2}>
                  <Button size="sm" variant={sortKey === 'name' ? 'solid' : 'outline'} onClick={() => toggleSort('name')}>
                    Name {sortKey==='name' && (sortDir==='asc' ? '↑':'↓')}
                  </Button>
                  <Button size="sm" variant={sortKey === 'role' ? 'solid' : 'outline'} onClick={() => toggleSort('role')}>
                    Rolle {sortKey==='role' && (sortDir==='asc' ? '↑':'↓')}
                  </Button>
                  <Button size="sm" variant={sortKey === 'red' ? 'solid' : 'outline'} onClick={() => toggleSort('red')} colorScheme="red">
                    Flags {sortKey==='red' && (sortDir==='asc' ? '↑':'↓')}
                  </Button>
                </HStack>
              </Flex>
            </CardBody>
          </Card.Root>

          {/* Customer Cards */}
          {sortedCustomers.length === 0 ? (
            <Card.Root>
              <CardBody>
                <Flex justify="center" align="center" py={12}>
                  <VStack gap={4}>
                    <Icon as={FiUsers} boxSize={16} color="var(--color-muted)" />
                    <Heading size="md" color="var(--color-muted)">
                      Keine Kunden gefunden
                    </Heading>
                    <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                      Keine Kunden entsprechen den aktuellen Filterkriterien.
                      Passe deine Filter an oder lege einen neuen Kunden an.
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
              {sortedCustomers.map((customer) => {
                const yellowFlags = customer.flags?.filter(
                  (f: any) => f.color === "YELLOW" && f.escalatedTo.length === 0
                ).length || 0;
                const redFlags = customer.flags?.filter((f: any) => f.color === "RED").length || 0;
                const isAffiliate = !!customer.isAffiliate;
                const isCustomer = customer.isCustomer ?? (customer.role === 'CUSTOMER');
                const riskLevel = redFlags >= 10 ? 'lost' : redFlags >= 5 ? 'at-risk' : 'safe';
                
                return (
                  <Card.Root
                    key={customer.id}
                    _hover={{
                      transform: "translateY(-2px)",
                      borderColor: riskLevel === 'lost' ? "red.300" : riskLevel === 'at-risk' ? "orange.300" : "blue.300",
                      cursor: "pointer"
                    }}
                    transition="all 0.2s ease"
                    borderWidth="1px"
                    borderColor={riskLevel === 'lost' ? "red.200" : riskLevel === 'at-risk' ? "orange.200" : "var(--color-border)"}
                    bg="var(--color-surface)"
                    onClick={() => handleClick(customer.id)}
                  >
                    <CardBody>
                      <VStack align="stretch" gap={4}>
                        {/* Header */}
                        <Flex align="start" justify="space-between" gap={3}>
                          <Flex align="center" gap={3} flex={1}>
                            <Flex 
                              w={10} h={10} 
                              align="center" justify="center" 
                              rounded="full" 
                              bg={riskLevel === 'lost' ? "red.500" : riskLevel === 'at-risk' ? "orange.500" : "blue.500"}
                              color="white"
                              fontSize="sm"
                              fontWeight="bold"
                            >
                              {customer.name?.charAt(0)}{customer.last_name?.charAt(0)}
                            </Flex>
                            <VStack align="start" gap={0} flex={1}>
                              <Text fontWeight="semibold" lineHeight="1.3">
                                {customer.name} {customer.last_name}
                              </Text>
                              <HStack gap={2}>
                                {isAffiliate && isCustomer ? (
                                  <Badge colorScheme="purple" variant="subtle" size="sm">
                                    Affiliate & Kunde
                                  </Badge>
                                ) : isAffiliate ? (
                                  <Badge colorScheme="green" variant="subtle" size="sm">
                                    Affiliate
                                  </Badge>
                                ) : isCustomer ? (
                                  <Badge colorScheme="blue" variant="subtle" size="sm">
                                    Kunde
                                  </Badge>
                                ) : (
                                  <Badge variant="subtle" size="sm">Unbekannt</Badge>
                                )}
                                
                                {riskLevel === 'lost' && (
                                  <Badge colorScheme="red" variant="solid" size="sm">
                                    <Icon as={FiXCircle} mr={1} boxSize={3} />
                                    Verloren
                                  </Badge>
                                )}
                                {riskLevel === 'at-risk' && (
                                  <Badge colorScheme="orange" variant="solid" size="sm">
                                    <Icon as={FiAlertTriangle} mr={1} boxSize={3} />
                                    Gefährdet
                                  </Badge>
                                )}
                              </HStack>
                            </VStack>
                          </Flex>
                        </Flex>
                        
                        {/* Contact Info */}
                        {customer.mobileNumber && (
                          <Flex align="center" gap={2}>
                            <Icon as={FiPhone} boxSize={4} color="var(--color-muted)" />
                            <Text fontSize="sm" color="var(--color-muted)">
                              {customer.mobileNumber}
                            </Text>
                          </Flex>
                        )}
                        
                        {/* Flags */}
                        {(yellowFlags > 0 || redFlags > 0) && (
                          <HStack justify="space-between">
                            <HStack gap={3}>
                              {yellowFlags > 0 && (
                                <Flex align="center" gap={1}>
                                  <Box w={3} h={3} rounded="full" bg="yellow.400" />
                                  <Text fontSize="sm" fontWeight="medium" color="yellow.600">
                                    {yellowFlags}
                                  </Text>
                                </Flex>
                              )}
                              {redFlags > 0 && (
                                <Flex align="center" gap={1}>
                                  <Box w={3} h={3} rounded="full" bg="red.400" />
                                  <Text fontSize="sm" fontWeight="medium" color="red.600">
                                    {redFlags}
                                  </Text>
                                </Flex>
                              )}
                            </HStack>
                            <Icon as={FiTrendingUp} boxSize={4} color="var(--color-muted)" />
                          </HStack>
                        )}
                      </VStack>
                    </CardBody>
                  </Card.Root>
                );
              })}
            </SimpleGrid>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
