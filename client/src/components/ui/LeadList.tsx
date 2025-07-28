import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Badge,
  Box,
  Card,
  Flex,
  Input,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";

const LeadList = () => {
  const [leadList, setLeadList] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [pipeLineStageList, setPipeLineStageList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  // Leads laden
  useEffect(() => {
    fetch(`http://localhost:3000/users/getLeadsByUser/${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setLeadList(data || []);
        setFilteredLeads(data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Kunden:", error);
        setLoading(false);
      });
  }, []);

  // PipelineStages laden
  useEffect(() => {
    fetch(`http://localhost:3000/pipeLineStage/getPipeLineStages`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setPipeLineStageList(data || []);
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Stages:", error);
      });
  }, []);

  // Zähle Leads pro PipelineStage
  const leadsPerStage = useMemo(() => {
    const counts: { [stageId: string]: number } = {};
    pipeLineStageList.forEach((stage) => {
      counts[stage.id] = leadList.filter(
        (lead) => lead.stage?.id === stage.id
      ).length;
    });
    return counts;
  }, [pipeLineStageList, leadList]);

  // Suche
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredLeads(leadList);
      return;
    }
    const lowerTerm = term.toLowerCase();
    setFilteredLeads(
      leadList.filter(
        (lead) =>
          lead.name.toLowerCase().includes(lowerTerm) ||
          (lead.phone && lead.phone.toLowerCase().includes(lowerTerm))
      )
    );
  };

  const StatusBadge = (status: any) => {
    const color = status === "Garantie Sicher" ? "green" : "yellow";
    return (
      <Badge colorScheme={color} borderRadius="full" px="2">
        {status}
      </Badge>
    );
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold">
        Deine Leads
      </Text>

      {loading ? (
        <Spinner mt={4} />
      ) : (
        <>
          {/* PipelineStages Übersicht */}
          <Flex gap={2} mt={4} flexWrap="wrap">
            {pipeLineStageList.map((stage) => (
              <Card.Root key={stage.id} flex="1" minW="100px" textAlign="center">
                <Text fontSize="md" fontWeight="bold">{stage.name}</Text>
                <Text fontSize="lg" fontWeight="bold" color="teal.600">
                  {leadsPerStage[stage.id] || 0}
                </Text>
              </Card.Root>
            ))}
          </Flex>

          {/* Suche */}
          <Input
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Leads durchsuchen..."
            mt={4}
          />

          {/* Desktop Ansicht */}
          <Box display={{ base: "none", md: "block" }} mt={4} mr={5}>
            <Table.ScrollArea borderWidth="1px" rounded="md" height="100%">
              <Table.Root size="sm" stickyHeader interactive>
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader>Name</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Handynummer</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredLeads.map((lead) => (
                    <Table.Row key={lead.id}>
                      <Table.Cell>{lead.name}</Table.Cell>
                      <Table.Cell>{StatusBadge(lead.stage?.name)}</Table.Cell>
                      <Table.Cell>{lead.phone || "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Box>

          {/* Mobile Ansicht als Cards */}
          <VStack display={{ base: "flex", md: "none" }} mt={4} w="100%">
            {filteredLeads.map((lead) => (
              <Card.Root key={lead.id} w="100%">
                <Flex justify="space-between">
                  <Box>
                    <Text fontWeight="bold">{lead.name}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {lead.phone || "Keine Nummer"}
                    </Text>
                  </Box>
                  {StatusBadge(lead.stage?.name)}
                </Flex>
              </Card.Root>
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
};

export default LeadList;
