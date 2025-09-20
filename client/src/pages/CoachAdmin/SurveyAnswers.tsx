// pages/SurveyAnswers.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  IconButton,
  Select,
  createListCollection,
  Button,
  Dialog,
  VStack,
  Icon,
  SimpleGrid,
} from "@chakra-ui/react";
import { Portal } from "@chakra-ui/react";
import { BsStar, BsStarFill } from "react-icons/bs";
import { CgCopy } from "react-icons/cg";
import { FiBarChart2, FiFilter, FiStar, FiCalendar, FiUser, FiMessageSquare } from "react-icons/fi";
import getUserFromToken from "@/services/getTokenFromLokal";
import { useColorModeValue } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";

type TimeFilter = "THIS_WEEK" | "LAST_WEEK" | "CUSTOM";
type GroupMode = "BY_USER" | "BY_DATE" | "FLAT_SURVEYS";

type SurveyQuestion = {
  id: string;
  rating: number | null;
  answer: string;
  question: {
    id: string;
    text: string;
    isRating: boolean;
    isDeleted: boolean;
  };
};

type Survey = {
  id: string;
  createdAt: string;
  submittedAt?: string | null;
  user: { id: string; name: string; last_name: string };
  questions: SurveyQuestion[];
};

export default function SurveyAnswers() {
  const [surveyList, setSurveyList] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(
    JSON.parse(localStorage.getItem("faqFavorites") || "[]")
  );
  const [groupMode, setGroupMode] = useState<GroupMode>(
    (localStorage.getItem("surveyGroupMode") as GroupMode) || "BY_USER"
  );

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    (localStorage.getItem("timeFilter") as TimeFilter) || "THIS_WEEK"
  );
  const [customFrom, setCustomFrom] = useState(
    localStorage.getItem("timeFilterFrom") || ""
  );
  const [customTo, setCustomTo] = useState(
    localStorage.getItem("timeFilterTo") || ""
  );
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  const borderCol = useColorModeValue("gray.200", "gray.600");

  const timeFilters = createListCollection({
    items: [
      { label: "Diese Woche", value: "THIS_WEEK" },
      { label: "Letzte Woche", value: "LAST_WEEK" },
      { label: "Benutzerdefiniert", value: "CUSTOM" },
    ],
  });

  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSurveys = async () => {
    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/surveys/getCustomerSurveyByCoach/${coach.id}`
        : `http://localhost:3000/surveys/getSurveyByAdmin`;

    try {
      setLoading(true);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      const filtered = Array.isArray(data)
        ? data.filter(
            (s: Survey) =>
              s.submittedAt && s.questions.some((q) => !q.question.isDeleted)
          )
        : [];

      setSurveyList(filtered);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // Time utils
  const getRange = () => {
    const now = new Date();
    if (timeFilter === "THIS_WEEK") {
      const start = new Date(now);
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start, to: end };
    }
    if (timeFilter === "LAST_WEEK") {
      const start = new Date();
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start, to: end };
    }

    const from = customFrom ? new Date(customFrom) : new Date(0);
    const to = customTo ? new Date(customTo) : new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  };

  const filteredSurveys = useMemo(() => {
    const { from, to } = getRange();
    return surveyList.filter((s) => {
      const date = new Date(s.submittedAt ?? s.createdAt);
      return date >= from && date <= to;
    });
  }, [surveyList, timeFilter, customFrom, customTo]);

  const searchedSurveys = useMemo(() => {
    if (!search.trim()) return filteredSurveys;
    const term = search.toLowerCase();
    return filteredSurveys
      .map((s) => {
        const matchUser = `${s.user.name} ${s.user.last_name}`
          .toLowerCase()
          .includes(term);
        const matchedQuestions = s.questions.filter(
          (q) =>
            !q.question.isDeleted &&
            !q.question.isRating &&
            ((q.answer?.toLowerCase().includes(term) ||
              q.question.text.toLowerCase().includes(term)))
        );
        if (matchUser || matchedQuestions.length) {
          return {
            ...s,
            questions: matchUser ? s.questions : matchedQuestions,
          };
        }
        return null;
      })
      .filter(Boolean) as Survey[];
  }, [filteredSurveys, search]);

  const allVisibleQuestions = useMemo(() => {
    const arr: { surveyId: string; user: Survey["user"]; q: SurveyQuestion }[] =
      [];
    searchedSurveys.forEach((s) =>
      s.questions.forEach((q) => {
        if (!q.question.isDeleted)
          arr.push({ surveyId: s.id, user: s.user, q });
      })
    );
    return arr;
  }, [searchedSurveys]);

  const favoriteQuestions = useMemo(
    () => allVisibleQuestions.filter((x) => favorites.includes(x.q.id)),
    [allVisibleQuestions, favorites]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      localStorage.setItem("faqFavorites", JSON.stringify(updated));
      return updated;
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toaster.create({
      title: "Kopiert!",
      description: "Antwort wurde in die Zwischenablage kopiert",
      type: "success",
    });
  };

  // Gruppierungen vorbereiten
  const groupedByUser = useMemo(() => {
    if (groupMode !== "BY_USER") return [] as { user: Survey["user"]; surveys: Survey[] }[];
    const map = new Map<string, { user: Survey["user"]; surveys: Survey[] }>();
    searchedSurveys.forEach((s) => {
      if (!map.has(s.user.id)) map.set(s.user.id, { user: s.user, surveys: [] });
      map.get(s.user.id)!.surveys.push(s);
    });
    return Array.from(map.values()).sort((a,b)=> a.user.name.localeCompare(b.user.name));
  }, [searchedSurveys, groupMode]);

  const groupedByDate = useMemo(() => {
    if (groupMode !== "BY_DATE") return [] as { date: string; surveys: Survey[] }[];
    const map = new Map<string, Survey[]>();
    searchedSurveys.forEach((s) => {
      const d = new Date(s.submittedAt ?? s.createdAt);
      const key = d.toLocaleDateString("de-DE");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries())
      .map(([date, surveys]) => ({ date, surveys: surveys.sort((a,b)=> new Date(b.submittedAt ?? b.createdAt).getTime()- new Date(a.submittedAt ?? a.createdAt).getTime()) }))
      .sort((a,b)=> new Date(b.date.split('.').reverse().join('-')).getTime() - new Date(a.date.split('.').reverse().join('-')).getTime());
  }, [searchedSurveys, groupMode]);

  const flatSurveys = useMemo(() => {
    if (groupMode !== "FLAT_SURVEYS") return [] as Survey[];
    return [...searchedSurveys].sort((a,b)=> new Date(b.submittedAt ?? b.createdAt).getTime() - new Date(a.submittedAt ?? a.createdAt).getTime());
  }, [searchedSurveys, groupMode]);

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6}>
      {/* Header */}
      <Card.Root mb={6}>
        <CardHeader>
          <Flex align="center" gap={3}>
            <Flex 
              w={12} h={12} 
              align="center" justify="center" 
              rounded="full" 
              bg="green.500"
              color="white"
            >
              <Icon as={FiBarChart2} boxSize={6} />
            </Flex>
            <VStack align="start" gap={0}>
              <Heading size="lg">Umfragen-Auswertung</Heading>
              <Text color="var(--color-muted)" fontSize="sm">
                {coach.role === "COACH" ? "Antworten deiner Kunden" : "Alle Coach-Umfragen"}
              </Text>
            </VStack>
          </Flex>
        </CardHeader>
      </Card.Root>

      <Flex gap={6} direction={{ base: "column", lg: "row" }} align="flex-start">
        {/* Sidebar */}
        <Card.Root w={{ base: "100%", lg: "320px" }} flexShrink={0} position="sticky" top={6}>
          <CardHeader>
            <Flex align="center" gap={2}>
              <Icon as={FiFilter} color="green.500" />
              <Heading size="md">Filter & Suche</Heading>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack gap={6} align="stretch">
              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiCalendar} color="blue.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Zeitraum</Text>
                </Flex>
                <Select.Root
                  collection={timeFilters}
                  value={[timeFilter]}
                  onValueChange={({ value: [val] }) => {
                    setTimeFilter(val as TimeFilter);
                    localStorage.setItem("timeFilter", val as string);
                  }}
                >
                  <Select.HiddenSelect name="timeFilter" />
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {timeFilters.items.map((item) => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
                {timeFilter === "CUSTOM" && (
                  <VStack gap={2} mt={2}>
                    <Input
                      size="sm"
                      type="date"
                      value={customFrom}
                      onChange={(e) => {
                        setCustomFrom(e.target.value);
                        localStorage.setItem("timeFilterFrom", e.target.value);
                      }}
                      placeholder="Von"
                    />
                    <Input
                      size="sm"
                      type="date"
                      value={customTo}
                      onChange={(e) => {
                        setCustomTo(e.target.value);
                        localStorage.setItem("timeFilterTo", e.target.value);
                      }}
                      placeholder="Bis"
                    />
                  </VStack>
                )}
              </VStack>

              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiUser} color="purple.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Gruppierung</Text>
                </Flex>
                <Select.Root
                  collection={createListCollection({
                    items: [
                      { label: "Nach Nutzer", value: "BY_USER" },
                      { label: "Nach Datum", value: "BY_DATE" },
                      { label: "Alle Surveys", value: "FLAT_SURVEYS" },
                    ],
                  })}
                  value={[groupMode]}
                  onValueChange={({ value: [val] }) => {
                    setGroupMode(val as GroupMode);
                    localStorage.setItem("surveyGroupMode", val as string);
                  }}
                >
                  <Select.HiddenSelect name="groupMode" />
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        <Select.Item item={{ label: "Nach Nutzer", value: "BY_USER" }}>Nach Nutzer<Select.ItemIndicator/></Select.Item>
                        <Select.Item item={{ label: "Nach Datum", value: "BY_DATE" }}>Nach Datum<Select.ItemIndicator/></Select.Item>
                        <Select.Item item={{ label: "Alle Surveys", value: "FLAT_SURVEYS" }}>Alle Surveys<Select.ItemIndicator/></Select.Item>
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </VStack>

              <VStack gap={1} align="stretch">
                <Flex align="center" gap={2}>
                  <Icon as={FiMessageSquare} color="orange.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold">Suche</Text>
                </Flex>
                <Input
                  placeholder="Name / Frage / Antwort"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  bg="var(--color-surface)"
                  borderColor="var(--color-border)"
                />
              </VStack>

              <Card.Root bg="rgba(255, 215, 0, 0.1)" borderColor="yellow.300">
                <CardBody p={3}>
                  <Flex align="center" justify="space-between" mb={2}>
                    <Flex align="center" gap={2}>
                      <Icon as={FiStar} color="yellow.500" boxSize={4} />
                      <Text fontSize="sm" fontWeight="semibold">Favoriten</Text>
                    </Flex>
                    <Badge colorScheme="yellow" variant="subtle">
                      {favoriteQuestions.length}
                    </Badge>
                  </Flex>
                  <Button
                    size="sm"
                    variant="outline"
                    w="100%"
                    onClick={() => setFavoritesOpen(true)}
                    colorScheme="yellow"
                  >
                    Favoriten ansehen
                  </Button>
                </CardBody>
              </Card.Root>
            </VStack>
          </CardBody>
        </Card.Root>

        {/* Main Content */}
        <Box flex="1">
          {loading ? (
            <Card.Root>
              <CardBody>
                <Flex justify="center" align="center" py={12}>
                  <VStack gap={4}>
                    <Spinner size="lg" color="green.500" />
                    <Text fontSize="sm" color="var(--color-muted)">
                      Lade Umfragen...
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>
          ) : searchedSurveys.length === 0 ? (
            <Card.Root>
              <CardBody>
                <Flex justify="center" align="center" py={12}>
                  <VStack gap={4}>
                    <Icon as={FiBarChart2} boxSize={16} color="var(--color-muted)" />
                    <Heading size="md" color="var(--color-muted)">
                      Keine Umfragen gefunden
                    </Heading>
                    <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                      Keine Umfragen entsprechen den aktuellen Filterkriterien.
                      Passe deine Filter an oder erstelle neue Umfragen.
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card.Root>
          ) : groupMode === "BY_USER" ? (
            <VStack gap={6} align="stretch">
              {groupedByUser.map(({ user, surveys }) => (
                <Card.Root key={user.id}>
                  <CardHeader>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={3}>
                        <Flex 
                          w={8} h={8} 
                          align="center" justify="center" 
                          rounded="full" 
                          bg="blue.500"
                          color="white"
                          fontSize="sm"
                          fontWeight="bold"
                        >
                          {user.name.charAt(0)}{user.last_name.charAt(0)}
                        </Flex>
                        <VStack align="start" gap={0}>
                          <Heading size="sm">{user.name} {user.last_name}</Heading>
                          <Text fontSize="xs" color="var(--color-muted)">
                            {surveys.length} Umfrage{surveys.length !== 1 ? 'n' : ''}
                          </Text>
                        </VStack>
                      </Flex>
                      <Badge colorScheme="blue" variant="subtle">
                        {surveys.length}
                      </Badge>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                      {surveys.map((s) => (
                        <SurveyCard
                          key={s.id}
                          survey={s}
                          borderCol={borderCol}
                          favorites={favorites}
                          toggleFavorite={toggleFavorite}
                          copy={copy}
                        />
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card.Root>
              ))}
            </VStack>
          ) : groupMode === "BY_DATE" ? (
            <VStack gap={6} align="stretch">
              {groupedByDate.map(({ date, surveys }) => (
                <Card.Root key={date}>
                  <CardHeader>
                    <Flex align="center" justify="space-between">
                      <Flex align="center" gap={3}>
                        <Flex 
                          w={8} h={8} 
                          align="center" justify="center" 
                          rounded="full" 
                          bg="purple.500"
                          color="white"
                        >
                          <Icon as={FiCalendar} boxSize={4} />
                        </Flex>
                        <VStack align="start" gap={0}>
                          <Heading size="sm">{date}</Heading>
                          <Text fontSize="xs" color="var(--color-muted)">
                            {surveys.length} Umfrage{surveys.length !== 1 ? 'n' : ''}
                          </Text>
                        </VStack>
                      </Flex>
                      <Badge colorScheme="purple" variant="subtle">
                        {surveys.length}
                      </Badge>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                      {surveys.map((s) => (
                        <SurveyCard
                          key={s.id}
                          survey={s}
                          borderCol={borderCol}
                          favorites={favorites}
                          toggleFavorite={toggleFavorite}
                          copy={copy}
                        />
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card.Root>
              ))}
            </VStack>
          ) : (
            <Card.Root>
              <CardHeader>
                <Flex align="center" gap={3}>
                  <Icon as={FiBarChart2} color="green.500" />
                  <Heading size="sm">Alle Umfragen</Heading>
                  <Badge colorScheme="green" variant="subtle">
                    {flatSurveys.length}
                  </Badge>
                </Flex>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
                  {flatSurveys.map((s) => (
                    <SurveyCard
                      key={s.id}
                      survey={s}
                      borderCol={borderCol}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      copy={copy}
                    />
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card.Root>
          )}
        </Box>
      </Flex>

      {/* Favorites Dialog */}
      <Dialog.Root open={favoritesOpen} onOpenChange={(e) => setFavoritesOpen(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content 
            bg="var(--color-surface)" 
            borderWidth="1px" 
            borderColor="var(--color-border)" 
            zIndex={1400} 
            w="2xl" 
            maxW="90vw"
            borderRadius="lg"
          >
            <Dialog.Header>
              <Flex align="center" gap={3}>
                <Flex 
                  w={8} h={8} 
                  align="center" justify="center" 
                  rounded="full" 
                  bg="yellow.500"
                  color="white"
                >
                  <Icon as={FiStar} boxSize={4} />
                </Flex>
                <VStack align="start" gap={0}>
                  <Dialog.Title>Favoriten</Dialog.Title>
                  <Text fontSize="sm" color="var(--color-muted)">
                    {favoriteQuestions.length} markierte Fragen
                  </Text>
                </VStack>
              </Flex>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body maxH="70vh" overflowY="auto">
              {favoriteQuestions.length === 0 ? (
                <Flex justify="center" align="center" py={8}>
                  <VStack gap={3}>
                    <Icon as={FiStar} boxSize={12} color="var(--color-muted)" />
                    <Text color="var(--color-muted)" fontWeight="medium">
                      Keine Favoriten vorhanden
                    </Text>
                    <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                      Markiere Fragen mit dem Stern-Icon, um sie hier zu sammeln
                    </Text>
                  </VStack>
                </Flex>
              ) : (
                <VStack gap={3} align="stretch">
                  {favoriteQuestions.map(({ q, user }) => (
                    <QuestionItem
                      key={q.id}
                      q={q}
                      user={user}
                      borderCol={borderCol}
                      onToggle={() => toggleFavorite(q.id)}
                      onCopy={() => copy(q.answer)}
                      isFav={true}
                    />
                  ))}
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}

function QuestionItem({
  q,
  user,
  onToggle,
  onCopy,
  isFav,
  borderCol,
}: {
  q: SurveyQuestion;
  user: { id: string; name: string; last_name: string };
  onToggle: () => void;
  onCopy: () => void;
  isFav: boolean;
  borderCol: string;
}) {
  const isRatingQuestion = !!q.question.isRating;
  let displayRating: number | null = null;
  if (isRatingQuestion) {
    if (typeof q.rating === "number") displayRating = q.rating;
    else {
      const n = Number(q.answer);
      displayRating = Number.isFinite(n) ? n : null;
    }
  }

  const answerCol = useColorModeValue("gray.700", "gray.200");

  return (
    <Box py={4} borderBottom="1px solid" borderColor={borderCol}>
      <Flex justify="space-between" align="start" gap={3}>
        <Box flex="1">
          <Text fontWeight="bold">{q.question.text}</Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {user.name} {user.last_name}
          </Text>
          {isRatingQuestion ? (
            <Text mt={2} color={answerCol}>{displayRating !== null ? displayRating : "—"}</Text>
          ) : (
            <Text mt={2} color={answerCol} whiteSpace="pre-wrap">{q.answer || "—"}</Text>
          )}
        </Box>
        <Flex direction="column" gap={2}>
          {!isRatingQuestion && q.answer && (
            <IconButton size="sm" aria-label="Kopieren" onClick={onCopy}>
              <CgCopy />
            </IconButton>
          )}
          <IconButton
            size="sm"
            aria-label="Favorit"
            variant="outline"
            onClick={onToggle}
          >
            {isFav ? <BsStarFill color="gold" /> : <BsStar />}
          </IconButton>
        </Flex>
      </Flex>
    </Box>
  );
}

// Einzelne Survey als Card mit ihren Fragen
function SurveyCard({
  survey,
  borderCol,
  favorites,
  toggleFavorite,
  copy,
}: {
  survey: Survey;
  borderCol: string;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  copy: (text: string) => void;
}) {
  return (
    <Card.Root
      w="360px"
      flexShrink={0}
      bg="var(--color-surface)"
      borderWidth="1px"
      borderColor="var(--color-border)"
      borderRadius="md"
    >
      <CardHeader pb={2}>
        <Heading size="xs">
          {survey.user.name} {survey.user.last_name}
        </Heading>
        <Text fontSize="xs" color="gray.500">
          {new Date(survey.submittedAt ?? survey.createdAt).toLocaleString("de-DE")}
        </Text>
      </CardHeader>
      <CardBody pt={0}>
        <Stack gap={4}>
          {survey.questions
            .filter((q) => !q.question.isDeleted)
            .map((q) => (
              <QuestionItem
                key={q.id}
                q={q}
                user={survey.user}
                borderCol={borderCol}
                onToggle={() => toggleFavorite(q.id)}
                onCopy={() => copy(q.answer)}
                isFav={favorites.includes(q.id)}
              />
            ))}
        </Stack>
      </CardBody>
    </Card.Root>
  );
}