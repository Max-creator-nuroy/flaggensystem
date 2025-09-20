import getUserFromToken from "@/services/getTokenFromLokal";
import { 
  Button, 
  Flex, 
  Text, 
  Box, 
  Card, 
  CardBody, 
  CardHeader, 
  Heading, 
  VStack, 
  HStack, 
  Icon,
  Badge,
  SimpleGrid
} from "@chakra-ui/react";
import { Link, Outlet, useLocation } from "react-router";
import { FiMessageSquare, FiEdit3, FiBarChart2, FiUsers } from "react-icons/fi";

export default function Survey() {
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const location = useLocation();

  const isCoach = coach.role === "COACH";

  const navigationItems = [
    ...(isCoach ? [{
      path: "/survey/currentSurvey",
      label: "Deine Umfrage",
      icon: FiMessageSquare,
      color: "blue.500",
      description: "Aktuelle Umfrage bearbeiten"
    }] : []),
    {
      path: "/survey/surveyAnswers",
      label: isCoach ? "Kunden Umfragen" : "Coach Umfragen",
      icon: FiBarChart2,
      color: "green.500",
      description: "Antworten und Auswertungen"
    },
    {
      path: "/survey/questions",
      label: "Fragen erstellen",
      icon: FiEdit3,
      color: "purple.500",
      description: "Neue Fragen hinzufügen"
    }
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Hero Section */}
      <Card.Root 
        mb={8}
        overflow="hidden"
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        position="relative"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bgGradient="linear(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))"
        />
        <CardBody p={{ base: 6, md: 8 }} position="relative">
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
            <VStack align="start" gap={2}>
              <Flex align="center" gap={3}>
                <Flex 
                  w={12} h={12} 
                  align="center" justify="center" 
                  rounded="full" 
                  bg="green.500"
                  color="white"
                  fontSize="lg"
                  fontWeight="bold"
                >
                  <Icon as={FiMessageSquare} boxSize={6} />
                </Flex>
                <VStack align="start" gap={0}>
                  <Heading size="lg" color="var(--color-text)">
                    Umfragen-Center
                  </Heading>
                  <Text color="var(--color-muted)" fontSize="sm">
                    Erstelle, verwalte und analysiere Umfragen
                  </Text>
                </VStack>
              </Flex>
              
              <Flex wrap="wrap" gap={2} mt={2}>
                <Badge colorScheme="green" variant="subtle">
                  Umfragen
                </Badge>
                <Badge colorScheme={isCoach ? "blue" : "purple"} variant="subtle">
                  {isCoach ? "Coach" : "Admin"}
                </Badge>
              </Flex>
            </VStack>
            
            <VStack align={{ base: "start", md: "end" }} gap={2}>
              <Text fontSize="sm" color="var(--color-muted)">
                Umfragen-Management
              </Text>
              <Text fontSize="xs" color="var(--color-muted)">
                {isCoach ? "Coach-Ansicht" : "Admin-Ansicht"}
              </Text>
            </VStack>
          </Flex>
        </CardBody>
      </Card.Root>

      {/* Navigation Cards */}
      <Card.Root mb={8}>
        <CardHeader>
          <Heading size="md">Navigation</Heading>
          <Text fontSize="sm" color="var(--color-muted)">
            Wähle einen Bereich aus
          </Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {navigationItems.map((item) => (
              <Link key={item.path} to={item.path} style={{ textDecoration: "none" }}>
                <Card.Root 
                  cursor="pointer"
                  _hover={{ bg: "rgba(255,255,255,0.04)", transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                  bg={isActivePath(item.path) ? "rgba(59, 130, 246, 0.1)" : "var(--color-surface)"}
                  borderWidth="1px"
                  borderColor={isActivePath(item.path) ? "blue.400" : "var(--color-border)"}
                  position="relative"
                >
                  {isActivePath(item.path) && (
                    <Box
                      position="absolute"
                      top={2}
                      right={2}
                      bg="blue.500"
                      color="white"
                      px={2}
                      py={1}
                      rounded="md"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      Aktiv
                    </Box>
                  )}
                  <CardBody p={5}>
                    <Flex align="center" gap={3} mb={2}>
                      <Flex 
                        w={10} h={10} 
                        align="center" justify="center" 
                        rounded="full" 
                        bg={item.color}
                        color="white"
                      >
                        <Icon as={item.icon} boxSize={5} />
                      </Flex>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="semibold" color="var(--color-text)">
                          {item.label}
                        </Text>
                        <Text fontSize="sm" color="var(--color-muted)">
                          {item.description}
                        </Text>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card.Root>
              </Link>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card.Root>

      {/* Content */}
      <Outlet />
    </Box>
  );
}
