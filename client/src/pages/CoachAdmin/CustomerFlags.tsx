import getUserFromToken from "@/services/getTokenFromLokal";
import { Accordion, Box, Flex, Icon, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { CgDanger } from "react-icons/cg";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function CustomerFlags() {
  const [customerList, setCustomerList] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [searchParams] = useSearchParams();
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const navigate = useNavigate();
  const garanty = searchParams.get("garanty");

  const handleClick = (destination: any) => {
    navigate(`/customerFlags?garanty=${destination}`); // Ziel-Route
  };

  const fetchSurvey = async () => {
    const url =
      coach.role == "COACH"
        ? `http://localhost:3000/users/getCustomersByCoach/${coach.id}`
        : `http://localhost:3000/users/getAllCustomer`;
    try {
      await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          for (const customer of data) {
            if (customer.flags) {
              const redFlags = customer.flags.filter(
                (flag: any) => flag.color == "RED"
              ).lenght;
              if (redFlags >= 10) {
                setGarantyLost(garantyLost + 1);
              } else if (redFlags >= 5) {
                setAtRisk(atRisk + 1);
              }
            }
          }
          if (garanty == "RISK") {
            setCustomerList(
              data.filter((customer: any) => {
                const redFlags =
                  customer.flag?.filter((f: any) => f.color === "RED") ?? [];
                return redFlags.length > 5;
              })
            );
          } else if (garanty == "LOST") {
            setCustomerList(
              data.filter((customer: any) => {
                const redFlags =
                  customer.flag?.filter((f: any) => f.color === "RED") ?? [];
                return redFlags.length > 10;
              })
            );
          } else {
            setCustomerList(data.filter((user: any) => user.flags.length != 0));
          }
          setLoading(false);
        });
    } catch (error) {
      console.error("Fehler beim Laden der Umfragen:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurvey();
  }, [garanty]);

  return (
    <Box p={5} mx="auto" m={5}>
      <Flex justifyContent={"center"}>
        <Box
          borderRadius="lg"
          borderWidth={1}
          m={5}
          mt={0}
          height="100%"
          shadow="sm"
          _hover={{ cursor: "pointer", bg: "blue.100" }}
          onClick={() => handleClick("RISK")}
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
        <Box
          borderRadius="lg"
          borderWidth={1}
          m={5}
          mt={0}
          height="100%"
          shadow="sm"
          _hover={{ cursor: "pointer", bg: "blue.100" }}
          onClick={() => handleClick("LOST")}
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
      </Flex>
      {loading ? (
        <Spinner />
      ) : (
        <Flex flexDirection={"column"}>
          <Flex flexDirection={"column"}>
            <Text fontSize="2xl" fontWeight="bold" mb={2}>
              Flaggen
            </Text>
            <Text fontSize="sm" mb={4}>
              Alle Flaggen deiner Kunden
            </Text>
          </Flex>
          <Accordion.Root variant={"subtle"}>
            {customerList.map((user: any, idx: any) => (
              <Accordion.Item key={idx} value={user.id}>
                <Accordion.ItemTrigger justifyContent={"space-between"}>
                  <Text>
                    {user.name} {user.last_name}
                  </Text>
                  <Flex>
                    <Text color="green.500">
                      {" "}
                      {user.flags.length == 0
                        ? 0
                        : user.flags.filter((flag: any) => {
                            flag.color == "GREEN";
                          }).length}
                    </Text>
                    <Text color="yellow.500" ml={1}>
                      {" "}
                      {user.flags.length == 0
                        ? 0
                        : user.flags.filter((flag: any) => {
                            flag.color == "YELLOW";
                          }).length}
                    </Text>
                    <Text color="red.500" ml={1}>
                      {" "}
                      {user.flags.length == 0
                        ? 0
                        : user.flags.filter((flag: any) => {
                            flag.color == "RED";
                          }).length}
                    </Text>
                  </Flex>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  {user.flags
                    .filter((flag: any) => flag.escalatedFrom.length === 0)
                    .map((flag: any, index: number) => (
                      <Flex justifyContent={"space-around"}>
                        <Text>{flag.requirement.title}</Text>
                        <Text>{flag.createdAt}</Text>
                      </Flex>
                    ))}
                </Accordion.ItemContent>
                <Box borderBottom="1px solid" borderColor="gray.300" />
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </Flex>
      )}
    </Box>
  );
}
