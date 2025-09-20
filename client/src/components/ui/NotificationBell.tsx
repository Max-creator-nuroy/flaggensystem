import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Icon,
  Portal,
  Popover,
  Text,
  VStack,
  Card,
  Badge,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { FiBell } from "react-icons/fi";
import getUserFromToken from "@/services/getTokenFromLokal";
import { useNavigate } from "react-router-dom";

interface UnreadSurvey {
  id: string;
  title?: string;
  createdAt: string;
  questionCount: number;
}

export default function NotificationBell() {
  const [unreadSurveys, setUnreadSurveys] = useState<UnreadSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  // Only show for customers and coaches
  if (!user || (user.role !== 'CUSTOMER' && user.role !== 'COACH')) {
    return null;
  }

  const fetchUnreadSurveys = async () => {
    try {
      setLoading(true);
      const endpoint = user.role === 'CUSTOMER' 
        ? `http://localhost:3000/surveys/user/unread`
        : `http://localhost:3000/surveys/coach/unread`;
        
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUnreadSurveys(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch unread surveys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadSurveys();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUnreadSurveys, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSurveyClick = (survey: UnreadSurvey) => {
    setIsOpen(false);
    if (user.role === 'CUSTOMER') {
      navigate('/survey');
    } else {
      navigate('/survey/surveyAnswers');
    }
  };

  const unreadCount = unreadSurveys.length;

  return (
    <Popover.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          position="relative"
          border="none"
          _hover={{ bg: "transparent" }}
          _active={{ bg: "transparent" }}
          _focus={{ boxShadow: "none" }}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchUnreadSurveys();
          }}
        >
          <Icon as={FiBell} boxSize={5} />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-1"
              right="-1"
              bg="red.500"
              color="white"
              borderRadius="full"
              fontSize="xs"
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </Popover.Trigger>
      
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="320px"
            bg="var(--color-surface)"
            borderWidth="1px"
            borderColor="var(--color-border)"
            shadow="lg"
          >
            <Popover.Header>
              <Text fontWeight="semibold">Neuigkeiten</Text>
            </Popover.Header>
            <Popover.Body maxH="400px" overflowY="auto" p={0}>
              {loading ? (
                <Flex align="center" justify="center" py={6}>
                  <Spinner size="sm" />
                </Flex>
              ) : unreadSurveys.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Text color="var(--color-muted)" fontSize="sm">
                    Keine neuen Umfragen
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap={0}>
                  {unreadSurveys.map((survey) => (
                    <Card.Root
                      key={survey.id}
                      p={3}
                      cursor="pointer"
                      _hover={{ bg: "rgba(255,255,255,0.04)" }}
                      onClick={() => handleSurveyClick(survey)}
                      borderRadius={0}
                      borderWidth={0}
                      borderBottomWidth="1px"
                      borderColor="var(--color-border)"
                    >
                      <Flex direction="column" gap={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          Neue Umfrage verfügbar
                        </Text>
                        <Text fontSize="xs" color="var(--color-muted)">
                          {survey.questionCount} Frage{survey.questionCount !== 1 ? 'n' : ''}
                        </Text>
                        <Text fontSize="xs" color="var(--color-muted)">
                          {new Date(survey.createdAt).toLocaleDateString('de-DE')}
                        </Text>
                      </Flex>
                    </Card.Root>
                  ))}
                </VStack>
              )}
            </Popover.Body>
            {unreadSurveys.length > 0 && (
              <Popover.Footer>
                <Button
                  size="sm"
                  w="full"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    if (user.role === 'CUSTOMER') {
                      navigate('/survey');
                    } else {
                      navigate('/survey/surveyAnswers');
                    }
                  }}
                >
                  Alle Umfragen ansehen
                </Button>
              </Popover.Footer>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}