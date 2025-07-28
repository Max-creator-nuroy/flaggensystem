import getUserFromToken from "@/services/getTokenFromLokal";
import { Box, Flex, Input, Spinner, Table, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CustomerList = () => {
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleClick = (userId: any) => {
    navigate(`/dashboard/CUSTOMER?userId=${userId}`); // Ziel-Route
  };

  useEffect(() => {
    fetch(`http://localhost:3000/users/getCustomersByCoach/${coach.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setCustomerList(data || []); // <- Passe dies ggf. an deine API an
        setLoading(false);
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Kunden:", error);
        setLoading(false);
      });
  }, [coach.id, token]); // <- wichtig, damit useEffect nur neu auslöst, wenn sich etwas ändert

  const filteredCustomers = customerList.filter((customer: any) =>
    customer.name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  return (
    <Box p={5} mx="auto" borderRadius="lg" m={5}>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>
        Meine Kunden
      </Text>
      <Text fontSize="sm" mb={4}>
        Detailansicht aller geworbenen Kunden
      </Text>

      {loading ? (
        <Spinner />
      ) : (
        <Flex flexDirection={"column"}>
          <Input
            placeholder="Nach namen Suchen"
            maxWidth={{ base: "20vh", sm: "40vh", lg: "60vh" }}
            type="text"
            onChange={(e) => setSearchTerm(e.target.value)}
          ></Input>
          <Table.ScrollArea mt={2} borderWidth="1px" rounded="md" height="50vh">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row bg="bg.subtle">
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Handynummer</Table.ColumnHeader>
                  <Table.ColumnHeader>Rolle</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">
                    Flaggen
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredCustomers.map((customer: any) => (
                  <Table.Row
                    key={customer.id}
                    _hover={{ cursor: "pointer", bg: "blue.100" }}
                    onClick={() => handleClick(customer.id)}
                  >
                    <Table.Cell>
                      {customer.name} {customer.last_name}
                    </Table.Cell>
                    <Table.Cell>{customer.mobileNumber}</Table.Cell>
                    <Table.Cell>
                      {customer.isAffiliate ? "Affiliate" : "Kunde"}
                    </Table.Cell>
                    <Table.Cell>
                      <Flex justifyContent={"end"}>
                        <Text color="green.500">
                          {" "}
                          {customer.flags.length == 0
                            ? 0
                            : customer.flags.filter((flag: any) => {
                                flag.color == "GREEN";
                              }).length}
                        </Text>
                        <Text color="yellow.500" ml={1}>
                          {" "}
                          {customer.flags.length == 0
                            ? 0
                            : customer.flags.filter((flag: any) => {
                                flag.color == "YELLO";
                              }).length}
                        </Text>
                        <Text color="red.500" ml={1}>
                          {" "}
                          {customer.flags.length == 0
                            ? 0
                            : customer.flags.filter((flag: any) => {
                                flag.color == "RED";
                              }).length}
                        </Text>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Flex>
      )}
    </Box>
  );
};

export default CustomerList;
