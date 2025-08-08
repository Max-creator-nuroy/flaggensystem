import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  Icon,
  Input,
  Spinner,
  Badge,
  Progress,
  HStack,
  Table,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { CgDanger, CgProfile } from "react-icons/cg";
import { FcQuestions } from "react-icons/fc";
import { useNavigate, useSearchParams } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";



export default function DashboardCoach() {
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [countAffiliate, setCountAffiliate] = useState<number>(0);
  const [countCustomer, setCountCustomer] = useState<number>(0);
  const [cRForCustomers, setCRForCustomers] = useState<number>(0);
  const [atRisk, setAtRisk] = useState<number>(0);
  const [garantyLost, setGarantyLost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const navigate = useNavigate();

  const borderCol = useColorModeValue("gray.200", "gray.600");
  const cardBg = useColorModeValue("white", "gray.700");

  const handleClick = (destination: string) => navigate(destination);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/users/getCustomersByCoach/${
          userId == null ? coach.id : userId
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data: any[] = await res.json();

      setCustomerList(data);
      setCountCustomer(data.filter((c) => !c.isAffiliate).length);
      setCountAffiliate(data.filter((c) => c.isAffiliate).length);

      let risk = 0;
      let lost = 0;
      data.forEach((customer) => {
        const redFlags = customer.flags.filter((f:any) => f.color === "RED").length;
        if (redFlags >= 10) lost += 1;
        else if (redFlags >= 5) risk += 1;
      });
      setAtRisk(risk);
      setGarantyLost(lost);
      setLoading(false);

      // Survey Completion
      const resCR = await fetch(
        `http://localhost:3000/surveys/getSurveyCompletionRateForCustomersByCoach/${
          userId == null ? coach.id : userId
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const cr = await resCR.json();
      setCRForCustomers(truncateToTwoDecimals(cr )?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Extra KPIs ----
  const extraStats = useMemo(() => {
    if (customerList.length === 0) {
      return {
        avgRedFlags: 0,
        zeroFlagPct: 0,
      };
    }
    const totalRed = customerList.reduce(
      (acc, c) => acc + c.flags.filter((f:any) => f.color === "RED").length,
      0
    );
    const zeroFlagCustomers = customerList.filter(
      (c) => c.flags.length === 0
    ).length;
    return {
      avgRedFlags: +(totalRed / customerList.length).toFixed(2),
      zeroFlagPct: +((zeroFlagCustomers / customerList.length) * 100).toFixed(
        1
      ),
    };
  }, [customerList]);

  // Suche
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerList;
    const term = searchTerm.toLowerCase();
    return customerList.filter((c) =>
      `${c.name} ${c.last_name}`.toLowerCase().includes(term)
    );
  }, [customerList, searchTerm]);

  // --- Helper ---
  const countColor = (customer: any, color: "RED" | "YELLOW" | "GREEN") =>
    customer.flags.filter((f:any) => f.color === color && f.escalatedTo.length == 0).length;

  function truncateToTwoDecimals(num: number): number {
    return Math.trunc(num * 100) / 100;
  }

  return (
    <Box>
      {/* KPI Grid */}
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(4, 1fr)",
        }}
        mt={{ base: 4, md: 6 }}
      >
        {/* Gesamte Nutzer */}
        <GridItem colSpan={1}>
          <CardRoot
            onClick={() => handleClick("/customerList")}
            title="Gesamte Nutzer"
            icon={<CgProfile />}
            value={customerList.length}
            subtitle={`${countAffiliate} Affiliates • ${countCustomer} Kunden`}
            bgColor="teal.500"
          />
        </GridItem>

        {/* Garantie gefährdet */}
        <GridItem colSpan={1}>
          <CardRoot
            onClick={() => handleClick("/customerFlags?garanty=RISK")}
            title="Garantie gefährdet"
            icon={<CgDanger color="orange" />}
            value={atRisk}
            subtitle="≥ 5 rote Flaggen"
            bgColor="orange.400"
          />
        </GridItem>

        {/* Garantie verloren */}
        <GridItem colSpan={1}>
          <CardRoot
            onClick={() => handleClick("/customerFlags?garanty=LOST")}
            title="Garantie verloren"
            icon={<CgDanger color="red" />}
            value={garantyLost}
            subtitle="≥ 10 rote Flaggen"
            bgColor="red.500"
          />
        </GridItem>

        {/* Survey Completion */}
        <GridItem colSpan={{ base: 1, md: 2, xl: 1 }}>
          <Box
            borderRadius="lg"
            borderWidth={1}
            m={5}
            mt={0}
            height="100%"
            bg={cardBg}
            borderColor={borderCol}
            _hover={{
              cursor: "pointer",
              bg: useColorModeValue("blue.50", "gray.600"),
            }}
            onClick={() => handleClick("/survey/surveyAnswers")}
          >
            <Flex flexDirection="column">
              <Flex
                p={5}
                pb={0}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text fontSize={{ lg: "xl", sm: "md" }}>
                  Umfragen beantwortet
                </Text>
                <Icon as={FcQuestions} />
              </Flex>
              <Flex flexDirection={"column"} m={5} mt={3}>
                <Progress.Root value={cRForCustomers ?? 0}>
                  <HStack>
                    <Progress.Label>Kunden</Progress.Label>
                    <Progress.Track flex="1">
                      <Progress.Range />
                    </Progress.Track>
                    <Progress.ValueText>
                      {cRForCustomers ?? 0}%
                    </Progress.ValueText>
                  </HStack>
                </Progress.Root>
              </Flex>
            </Flex>
          </Box>
        </GridItem>
      </Grid>

      {/* Extra Stats Row */}
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          xl: "repeat(3, 1fr)",
        }}
        mt={5}
      >
        <GridItem>
          <MiniStatCard
            label="Ø rote Flags pro Kunde"
            value={extraStats.avgRedFlags}
            color="red.500"
          />
        </GridItem>
        <GridItem>
          <MiniStatCard
            label="% Kunden ohne Flags"
            value={`${extraStats.zeroFlagPct}%`}
            color="green.500"
          />
        </GridItem>
        <GridItem>
          <MiniStatCard
            label="Aktive Kunden"
            value={customerList.length - garantyLost}
            color="teal.500"
          />
        </GridItem>
      </Grid>

      {/* Kundenliste */}
      <Box
        p={5}
        mx="auto"
        borderRadius="lg"
        m={5}
        bg={cardBg}
        borderWidth={1}
        borderColor={borderCol}
      >
        <Text fontSize="2xl" fontWeight="bold">
          Meine Kunden
        </Text>
        <Text fontSize="sm" color="gray.500">
          Detailansicht aller zugewiesenen Kunden
        </Text>

        {loading ? (
          <Spinner mt={4} />
        ) : (
          <Flex flexDirection={"column"}>
            <Input
              placeholder="Nach Namen suchen…"
              maxWidth={{ base: "100%", sm: "60%", lg: "40%" }}
              type="text"
              mt={3}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Desktop Tabelle */}
            <Box display={{ base: "none", md: "block" }} mt={3}>
              <Table.ScrollArea borderWidth="1px" rounded="md" height="60vh">
                <Table.Root size="sm" stickyHeader interactive>
                  <Table.Header>
                    <Table.Row bg="bg.subtle">
                      <Table.ColumnHeader>Name</Table.ColumnHeader>
                      <Table.ColumnHeader>Handynummer</Table.ColumnHeader>
                      <Table.ColumnHeader>Rolle</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="end">
                        Flags (G/Y/R)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredCustomers.map((customer) => (
                      <Table.Row
                        key={customer.id}
                        _hover={{ cursor: "pointer", bg: "blue.50" }}
                        onClick={() =>
                          handleClick(
                            `/dashboard/CUSTOMER?userId=${customer.id}`
                          )
                        }
                      >
                        <Table.Cell>
                          {customer.name} {customer.last_name}
                        </Table.Cell>
                        <Table.Cell>{customer.mobileNumber || "—"}</Table.Cell>
                        <Table.Cell>
                          <Badge
                            colorScheme={
                              customer.isAffiliate ? "purple" : "blue"
                            }
                          >
                            {customer.isAffiliate ? "Affiliate" : "Kunde"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex justifyContent="end">
                            <Text color="yellow.500" ml={2}>
                              {countColor(customer, "YELLOW")}
                            </Text>
                            <Text color="red.500" ml={2}>
                              {countColor(customer, "RED")}
                            </Text>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Box>

            {/* Mobile Cards */}
            <Box display={{ base: "block", md: "none" }} mt={3}>
              {filteredCustomers.map((c) => (
                <Box
                  key={c.id}
                  borderWidth={1}
                  borderColor={borderCol}
                  bg={cardBg}
                  borderRadius="md"
                  p={4}
                  mb={2}
                  onClick={() => handleClick(`/dashboard/CUSTOMER?userId=${c.id}`)}
                  _hover={{
                    cursor: "pointer",
                    bg: useColorModeValue("blue.50", "gray.600"),
                  }}
                >
                  <Flex justify="space-between">
                    <Box>
                      <Text fontWeight="bold">
                        {c.name} {c.last_name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {c.mobileNumber || "—"}
                      </Text>
                      <Badge
                        mt={1}
                        colorScheme={c.isAffiliate ? "purple" : "blue"}
                      >
                        {c.isAffiliate ? "Affiliate" : "Kunde"}
                      </Badge>
                    </Box>
                    <Flex align="center">
                      <Text color="yellow.500" ml={2}>
                        {countColor(c, "YELLOW")}
                      </Text>
                      <Text color="red.500" ml={2}>
                        {countColor(c, "RED")}
                      </Text>
                    </Flex>
                  </Flex>
                </Box>
              ))}
            </Box>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

/* ---------- Reusable UI Bits ---------- */

function CardRoot({
  title,
  value,
  subtitle,
  icon,
  onClick,
  bgColor,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  bgColor?: string;
}) {
  const bg = useColorModeValue("white", "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.600");

  return (
    <Box
      borderRadius="lg"
      borderWidth={1}
      m={5}
      mt={0}
      height="100%"
      bg={bg}
      borderColor={borderCol}
      _hover={{
        cursor: onClick ? "pointer" : "default",
        bg: useColorModeValue("blue.50", "gray.600"),
      }}
      onClick={onClick}
    >
      <Flex flexDirection="column">
        <Flex p={5} pb={0} justifyContent="space-between" alignItems="center">
          <Text fontSize={{ lg: "xl", sm: "md" }}>{title}</Text>
          {icon && <Icon>{icon}</Icon>}
        </Flex>
        <Flex flexDirection={"column"}>
          <Text
            ml={5}
            fontSize={{ lg: "2xl", sm: "xl" }}
            color={bgColor || "inherit"}
          >
            {value}
          </Text>
          {subtitle && (
            <Text ml={5} fontSize={"sm"} color={"gray.500"}>
              {subtitle}
            </Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

function MiniStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const bg = useColorModeValue("white", "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.600");
  return (
    <Box
      borderRadius="lg"
      borderWidth={1}
      m={5}
      mt={0}
      bg={bg}
      borderColor={borderCol}
    >
      <Flex flexDirection="column" p={4}>
        <Text fontSize="sm" color="gray.500">
          {label}
        </Text>
        <Text fontSize="2xl" fontWeight="bold" color={color || "inherit"}>
          {value}
        </Text>
      </Flex>
    </Box>
  );
}
