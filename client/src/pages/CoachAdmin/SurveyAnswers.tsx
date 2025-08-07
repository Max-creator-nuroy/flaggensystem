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
  Accordion,
} from "@chakra-ui/react";
import { Portal } from "@chakra-ui/react";
import { BsStar } from "react-icons/bs";
import { CgCopy } from "react-icons/cg";
import getUserFromToken from "@/services/getTokenFromLokal";
import { useColorModeValue } from "@/components/ui/color-mode";

type TimeFilter = "THIS_WEEK" | "LAST_WEEK" | "CUSTOM";

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

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <Heading textAlign="center" mb={2}>
        Umfragen
      </Heading>
      <Text textAlign="center" color="gray.500">
        {coach.role === "COACH" ? "Coach-Ansicht" : "Admin-Ansicht"}
      </Text>

      {/* Filter */}
      <Stack mt={6}>
        <Select.Root
          collection={timeFilters}
          value={[timeFilter]}
          onValueChange={({ value: [val] }) => {
            setTimeFilter(val as TimeFilter);
            localStorage.setItem("timeFilter", val as string);
          }}
        >
          <Select.HiddenSelect name="timeFilter" />
          <Select.Label>Zeitraum wählen</Select.Label>
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
          <Flex gap={3} wrap="wrap">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                localStorage.setItem("timeFilterFrom", e.target.value);
              }}
            />
            <Input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                localStorage.setItem("timeFilterTo", e.target.value);
              }}
            />
          </Flex>
        )}

        <Input
          placeholder="Suche (Name, Frage, Antwort)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Stack>

      {/* Favoriten */}
      {favoriteQuestions.length > 0 && (
        <Card.Root mt={6}>
          <CardHeader>
            <Heading size="md">Favoriten</Heading>
          </CardHeader>
          <CardBody>
            <Stack>
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
          </CardBody>
        </Card.Root>
      )}

      {/* Hauptumfragen */}
      <Box mt={8}>
        {loading ? (
          <Flex justify="center">
            <Spinner />
          </Flex>
        ) : searchedSurveys.length === 0 ? (
          <Text>Keine Umfragen gefunden.</Text>
        ) : (
          <Accordion.Root collapsible>
            {searchedSurveys.map((s) => (
              <Accordion.Item key={s.id} value={s.id}>
                <Accordion.ItemTrigger>
                  <Flex justify="space-between" p={3}>
                    <Box>
                      <Text fontWeight="bold">
                        {s.user.name} {s.user.last_name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(s.submittedAt ?? s.createdAt).toLocaleString(
                          "de-DE"
                        )}
                      </Text>
                    </Box>
                    <Badge>{s.questions.length} Fragen</Badge>
                  </Flex>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent
                  style={{
                    border: `1px solid ${borderCol}`,
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    padding: "16px",
                    marginBottom: "12px",
                  }}
                >
                  <Stack>
                    {s.questions
                      .filter((q) => !q.question.isDeleted)
                      .map((q) => (
                        <QuestionItem
                          key={q.id}
                          q={q}
                          user={s.user}
                          borderCol={borderCol}
                          onToggle={() => toggleFavorite(q.id)}
                          onCopy={() => copy(q.answer)}
                          isFav={favorites.includes(q.id)}
                        />
                      ))}
                  </Stack>
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
      </Box>
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