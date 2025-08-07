import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  Progress,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  CgDanger,
  CgProfile,
} from "react-icons/cg";
import { useEffect, useState } from "react";
import { FcQuestions } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import AdminCustomerList from "./AdminCustomerList";

export default function DashboardAdmin() {
  const [coachList, setCoachList] = useState<any>([]);
  const [customerList, setCustomerList] = useState<any>([]);
  const [countAffiliate, setCountAffiliate] = useState();
  const [countCustomer, setCountCustomer] = useState();
  const [cRForCustomers, setCRForCustomers] = useState<number>(0);
  const [cRForCoaches, setCRForCoaches] = useState<number>(0);
  const [countUser, setCountUser] = useState();
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [searchTermCoach, setSearchTermCoach] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const handleClick = (destination: any) => {
    navigate(destination); // Ziel-Route
  };

  const fetchCoach = async () => {
    await fetch(`http://localhost:3000/users/getAllCoaches`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setCoachList(data);
        setCountCustomer(
          data.filter((customer: any) => customer.isAffiliate === true).length
        );

        setCountUser(countUser + data.length);
      });
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
        setCountCustomer(
          data.filter((customer: any) => customer.isAffiliate === false).length
        );
        setCountAffiliate(
          data.filter((customer: any) => customer.isAffiliate === true).length
        );

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
    const resCR = await fetch(
      `http://localhost:3000/surveys/getSurveyCompletionRateForCustomers`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const cr = await resCR.json();
    setCRForCustomers(truncateToTwoDecimals(cr) ?? 0);
    const resCRC =  await fetch(
      `http://localhost:3000/surveys/getSurveyCompletionRateForCoaches`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const crc = await resCRC.json();
    setCRForCoaches(truncateToTwoDecimals(crc) ?? 0);
  };


  useEffect(() => {
    fetchCoach();
    fetchCustomer();
  }, []);

  const filteredCoches = coachList.filter((coach: any) =>
    coach.name.toLowerCase().startsWith(searchTermCoach.toLowerCase())
  );

  function truncateToTwoDecimals(num: number): number {
    return Math.trunc(num * 100) / 100;
  }

  return (
    <Box>
      <Grid templateColumns="repeat(4, 1fr)" maxHeight="30%" mt={{ base: 10 }}>
        <GridItem colSpan={{ base: 4, sm: 2, lg: 1 }}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            m={5}
            mt={0}
            height="100%"
            shadow="sm"
            _hover={{ cursor: "pointer", bg: "blue.100" }}
            onClick={() => handleClick("/customerList/ADMIN")}
          >
            <Flex flexDirection="column">
              <Flex
                p={5}
                pb={0}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={{ lg: "xl", sm: "" }}>Gesamte Nutzer</Text>
                <Icon>
                  <CgProfile />
                </Icon>
              </Flex>
              <Flex flexDirection={"column"}>
                <Text ml={5} fontSize={{ lg: "2xl", sm: "xl" }}>
                  {customerList?.length ?? 0}
                </Text>
                <Text ml={5} fontSize={"sm"} color={"grey"}>
                  {countAffiliate} Affiliates • {countCustomer} Kunden
                </Text>
              </Flex>
            </Flex>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 4, sm: 2, lg: 1 }}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            m={5}
            mt={0}
            height="100%"
            shadow="sm"
          >
            <Flex flexDirection="column">
              <Flex
                p={5}
                pb={0}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={{ lg: "xl", sm: "" }}>Gesamte Coaches</Text>
                <Icon>
                  <CgProfile />
                </Icon>
              </Flex>
              <Text ml={5} fontSize={{ lg: "2xl", sm: "xl" }}>
                {coachList?.length ?? 0}
              </Text>
            </Flex>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 4, sm: 2, lg: 1 }}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            m={5}
            mt={0}
            height="100%"
            shadow="sm"
            _hover={{ cursor: "pointer", bg: "blue.100" }}
            onClick={() => handleClick("/customerFlags?garanty=RISK")}
          >
            <Flex flexDirection="column">
              <Flex
                p={5}
                pb={0}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={{ lg: "xl", sm: "" }}>Garantie Gefährdet</Text>
                <Icon>
                  <CgDanger color="Orange" />
                </Icon>
              </Flex>
              <Flex flexDirection={"column"}>
                <Text ml={5} fontSize={{ lg: "2xl", sm: "xl" }}>
                  {atRisk}
                </Text>
                <Text ml={5} fontSize={"sm"} color={"grey"}>
                  {">5 rote Flaggen"}
                </Text>
              </Flex>
            </Flex>{" "}
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 4, sm: 2, lg: 1 }}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            m={5}
            mt={0}
            height="100%"
            shadow="sm"
            _hover={{ cursor: "pointer", bg: "blue.100" }}
            onClick={() => handleClick("/customerFlags?garanty=LOST")}
          >
            <Flex flexDirection="column">
              <Flex
                p={5}
                pb={0}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={{ lg: "xl", sm: "" }}>Garantie Verloren</Text>
                <Icon>
                  <CgDanger color="Red" />
                </Icon>
              </Flex>
              <Flex flexDirection={"column"}>
                <Text ml={5} fontSize={{ lg: "2xl", sm: "xl" }}>
                  {garantyLost}
                </Text>
                <Text ml={5} fontSize={"sm"} color={"grey"}>
                  {">10 rote Flaggen"}
                </Text>
              </Flex>
            </Flex>
          </Box>
        </GridItem>
        <GridItem colSpan={{ base: 4, sm: 2, lg: 2 }} m={5}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            height="100%"
            shadow="sm"
            _hover={{ cursor: "pointer", bg: "blue.100" }}
            onClick={() => handleClick("/survey/surveyAnswers")}
          >
            <Flex flexDirection="column">
              <Flex p={5} justifyContent="space-between" alignItems="center">
                <Text fontSize={{ lg: "xl", sm: "" }}>
                  Umfragen beantwortet
                </Text>
                <Icon>
                  <FcQuestions />
                </Icon>
              </Flex>
              <Flex flexDirection={"column"} ml={5} mb={5} mr={5}>
                <Progress.Root value={cRForCustomers} maxW="md">
                  <HStack>
                    <Progress.Label>Kunden</Progress.Label>
                    <Progress.Track flex="1">
                      <Progress.Range />
                    </Progress.Track>
                    <Progress.ValueText>{cRForCustomers}%</Progress.ValueText>
                  </HStack>
                </Progress.Root>
                <Progress.Root value={cRForCoaches} maxW="md">
                  <HStack>
                    <Progress.Label>Coaches</Progress.Label>
                    <Progress.Track flex="1">
                      <Progress.Range />
                    </Progress.Track>
                    <Progress.ValueText>{cRForCoaches}%</Progress.ValueText>
                  </HStack>
                </Progress.Root>
              </Flex>
            </Flex>
          </Box>
        </GridItem>
      </Grid>
      <hr
        style={{
          border: "none",
          borderTop: "1px solid #ccc",
          margin: "20px 0",
        }}
      />
      <Flex justifyContent={"space-between"}>
        <Input
          ml={5}
          placeholder="Nach namen Suchen"
          maxWidth={{ base: "20vh", sm: "40vh", lg: "60vh" }}
          type="text"
          onChange={(e) => setSearchTermCoach(e.target.value)}
        ></Input>
        <Button
          onClick={() => {
            navigate(`/createCoach`);
          }}
        >
          Coach anlegen
        </Button>
      </Flex>
      <Table.ScrollArea m={5} borderWidth="1px" rounded="md" height="100%">
        <Table.Root size="sm" stickyHeader interactive>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader>Coach</Table.ColumnHeader>
              <Table.ColumnHeader>Kunden</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredCoches.map((customer: any) => (
              <Table.Row
                _hover={{ cursor: "pointer", bg: "blue.100" }}
                key={customer.id}
                onClick={() =>
                  handleClick(`/dashboard/COACH?userId=${customer.id}`)
                }
              >
                <Table.Cell>
                  {customer.name} {customer.last_name}
                </Table.Cell>
                <Table.Cell>{customer.customerCount}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #ccc",
          margin: "20px 0",
        }}
      />
      <AdminCustomerList></AdminCustomerList>
    </Box>
  );
}
