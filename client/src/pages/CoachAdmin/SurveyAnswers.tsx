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
} from "@chakra-ui/react";
import { Portal } from "@chakra-ui/react";
import { BsStar } from "react-icons/bs";
import { CgCopy } from "react-icons/cg";
import getUserFromToken from "@/services/getTokenFromLokal";
import { useColorModeValue } from "@/components/ui/color-mode";

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
            (q.answer?.toLowerCase().includes(term) ||
              q.question.text.toLowerCase().includes(term))
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
    <Flex alignItems="flex-start" p={0} gap={0} minH="calc(100vh - 80px)">
      {/* Sidebar */}
      <Box w={{ base: "100%", md: "280px" }} borderRight={{ md: "1px solid" }} borderColor={borderCol} p={6} position="sticky" top={0} maxH="100vh" overflowY="auto" bg="gray.50">
        <Heading size="md" mb={1}>Umfragen</Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>{coach.role === "COACH" ? "Coach-Ansicht" : "Admin-Ansicht"}</Text>
        <Stack gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>Zeitraum</Text>
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
              <Stack mt={2} gap={2}>
                <Input
                  size="sm"
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    localStorage.setItem("timeFilterFrom", e.target.value);
                  }}
                />
                <Input
                  size="sm"
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    localStorage.setItem("timeFilterTo", e.target.value);
                  }}
                />
              </Stack>
            )}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>Gruppierung</Text>
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
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>Suche</Text>
            <Input
              size="sm"
              placeholder="Name / Frage / Antwort"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          {favoriteQuestions.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>Favoriten ({favoriteQuestions.length})</Text>
              <Stack maxH="200px" overflowY="auto" pr={1} gap={3}>
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
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Main Content */}
      <Box flex="1" p={6} overflowX="hidden">
        {loading ? (
          <Flex justify="center" mt={20}><Spinner /></Flex>
        ) : searchedSurveys.length === 0 ? (
          <Text mt={10}>Keine Umfragen gefunden.</Text>
        ) : groupMode === "BY_USER" ? (
          <Stack gap={8}>
            {groupedByUser.map(({ user, surveys }) => (
              <Box key={user.id}>
                <Heading size="sm" mb={3}>{user.name} {user.last_name} <Badge ml={2}>{surveys.length}</Badge></Heading>
                <Flex gap={4} wrap="wrap">
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
                </Flex>
              </Box>
            ))}
          </Stack>
        ) : groupMode === "BY_DATE" ? (
          <Stack gap={10}>
            {groupedByDate.map(({ date, surveys }) => (
              <Box key={date}>
                <Heading size="sm" mb={3}>{date} <Badge ml={2}>{surveys.length}</Badge></Heading>
                <Flex gap={4} wrap="wrap">
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
                </Flex>
              </Box>
            ))}
          </Stack>
        ) : (
          <Flex gap={4} wrap="wrap">
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
          </Flex>
        )}
      </Box>
    </Flex>
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
  return (
    <Box borderBottom="1px solid" borderColor={borderCol} pb={3}>
      <Flex justify="space-between" gap={3}>
        <Box flex="1">
          <Text fontWeight="bold">
            {user.name} {user.last_name}
          </Text>
          <Text fontWeight="semibold">{q.question.text}</Text>
          {q.question.isRating ? (
            <Badge mt={1} colorScheme="purple">
              Rating: {q.rating ?? "–"}
            </Badge>
          ) : (
            <>
              <Text mt={1} whiteSpace="pre-wrap">
                {q.answer || "—"}
              </Text>
              {typeof q.rating === "number" && (
                <Badge mt={1} colorScheme="purple">
                  Rating: {q.rating}
                </Badge>
              )}
            </>
          )}
        </Box>
        <Flex direction="column" gap={2}>
          {!q.question.isRating && (
            <IconButton size="sm" aria-label="Kopieren" onClick={onCopy}>
              <CgCopy />
            </IconButton>
          )}
          <IconButton
            size="sm"
            aria-label="Favorit"
            variant={isFav ? "solid" : "outline"}
            onClick={onToggle}
          >
            <BsStar />
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
    <Card.Root w="360px" flexShrink={0}>
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