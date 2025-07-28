import { Flex, Input, Table, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function AdminCustomerList() {
  const token = localStorage.getItem("token");
  const [customerList, setCustomerList] = useState<any>([]);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleClick = (userId: any) => {
    navigate(`/dashboard/CUSTOMER?userId=${userId}`); // Ziel-Route
  };

  const fetchCustomer = async () => {
    await fetch(`http://localhost:3000/users/getAllCustomer`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setCustomerList(data);

        for (const customer of data) {
          if (customer.flags) {
            const redFlags = customer.flags.filter(
              (flag: any) => flag.color == "RED"
            ).length;
            if (redFlags >= 10) {
              setGarantyLost(garantyLost + 1);
            } else if (redFlags >= 5) {
              setAtRisk(atRisk + 1);
            }
          }
        }
      });
  };
  useEffect(() => {
    fetchCustomer();
  }, []);

  const filteredCustomers = customerList.filter((customer: any) =>
    customer.name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  return (
    <Flex flexDirection={"column"} m={5}>
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
              <Table.ColumnHeader textAlign="end">Flaggen</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredCustomers.map((customer: any) => (
              <Table.Row
                key={customer.id}
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
  );
}
