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

interface UnreadAbsence {
  id: string;
  type: 'URLAUB' | 'KRANKHEIT' | 'ANDERES';
  createdAt: string;
  customer: { name: string; last_name: string };
}

export default function NotificationBell() {
  const [unreadSurveys, setUnreadSurveys] = useState<UnreadSurvey[]>([]);
  const [unreadAbsences, setUnreadAbsences] = useState<UnreadAbsence[]>([]);
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

  const fetchUnreadAbsences = async () => {
    // Only for coaches
    if (user.role !== 'COACH') return;
    
    try {
      const res = await fetch('http://localhost:3000/absence/request/coach', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        // Filter nur unbearbeitete Anträge
        const unprocessed = (data as any[]).filter((req: any) => !req.processed);
        setUnreadAbsences(unprocessed || []);
      }
    } catch (error) {
      console.error("Failed to fetch unread absences:", error);
    }
  };

  useEffect(() => {
    fetchUnreadSurveys();
    fetchUnreadAbsences();
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchUnreadSurveys();
      fetchUnreadAbsences();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSurveyClick = () => {
    setIsOpen(false);
    if (user.role === 'CUSTOMER') {
      navigate('/survey');
    } else {
      navigate('/survey/surveyAnswers');
    }
  };

  const handleAbsenceClick = () => {
    setIsOpen(false);
    navigate('/inbox/coach');
  };

  const unreadCount = unreadSurveys.length + unreadAbsences.length;

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
            if (!isOpen) {
              fetchUnreadSurveys();
              fetchUnreadAbsences();
            }
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
              ) : (unreadSurveys.length === 0 && unreadAbsences.length === 0) ? (
                <Box p={4} textAlign="center">
                  <Text color="var(--color-muted)" fontSize="sm">
                    Keine neuen Benachrichtigungen
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap={0}>
                  {/* Urlaubsanträge zuerst anzeigen */}
                  {unreadAbsences.map((absence) => (
                    <Card.Root
                      key={`absence-${absence.id}`}
                      p={3}
                      cursor="pointer"
                      _hover={{ bg: "rgba(255,255,255,0.04)" }}
                      onClick={() => handleAbsenceClick()}
                      borderRadius={0}
                      borderWidth={0}
                      borderBottomWidth="1px"
                      borderColor="var(--color-border)"
                    >
                      <Flex direction="column" gap={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          Neuer {absence.type === 'URLAUB' ? 'Urlaubsantrag' : absence.type === 'KRANKHEIT' ? 'Krankmeldung' : 'Antrag'}
                        </Text>
                        <Text fontSize="xs" color="var(--color-muted)">
                          von {absence.customer.name} {absence.customer.last_name}
                        </Text>
                        <Text fontSize="xs" color="var(--color-muted)">
                          {new Date(absence.createdAt).toLocaleDateString('de-DE')}
                        </Text>
                      </Flex>
                    </Card.Root>
                  ))}
                  
                  {/* Dann Umfragen */}
                  {unreadSurveys.map((survey) => (
                    <Card.Root
                      key={`survey-${survey.id}`}
                      p={3}
                      cursor="pointer"
                      _hover={{ bg: "rgba(255,255,255,0.04)" }}
                      onClick={() => handleSurveyClick()}
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
                  onClick={() => handleSurveyClick()}
                >
                  {user.role === 'CUSTOMER' ? 'Umfragen beantworten' : 'Alle Umfragen ansehen'} ({unreadSurveys.length})
                </Button>
              </Popover.Footer>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}