import React, { useEffect, useMemo, useState } from "react";
import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Flex,
  Grid,
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
  Accordion,
} from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { toaster } from "@/components/ui/toaster";
import { Portal } from "@chakra-ui/react";
import { createListCollection } from "@ark-ui/react";
import { BsStar } from "react-icons/bs";
import { CgCopy } from "react-icons/cg";
import { useColorModeValue } from "@/components/ui/color-mode";

type TimeFilter = "THIS_WEEK" | "LAST_WEEK" | "CUSTOM";

type SurveyQuestion = {
  id: string;
  rating: number | null;
  answer: string;
  question: { id: string; text: string };
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

  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    (localStorage.getItem("timeFilter") as TimeFilter) || "THIS_WEEK"
  );
  const [customFrom, setCustomFrom] = useState<string>(
    localStorage.getItem("timeFilterFrom") || ""
  );
  const [customTo, setCustomTo] = useState<string>(
    localStorage.getItem("timeFilterTo") || ""
  );
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(
    JSON.parse(localStorage.getItem("faqFavorites") || "[]")
  );

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  const subtleBg = useColorModeValue("gray.50", "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.600");

  /* ---------- Select Collection ---------- */
  const timeFilters = createListCollection({
    items: [
      { label: "Diese Woche", value: "THIS_WEEK" },
      { label: "Letzte Woche", value: "LAST_WEEK" },
      { label: "Benutzerdefiniert", value: "CUSTOM" },
    ],
  });

  /* ---------- Fetch ---------- */
  const fetchSurvey = async () => {
    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/surveys/getCustomerSurveyByCoach/${coach.id}`
        : `http://localhost:3000/surveys/getSurveyByAdmin`;

    try {
      setLoading(true);
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSurveyList(Array.isArray(data) ? data : []);
    } catch (error) {
      toaster.create({
        type: "error",
        description: "Fehler beim Laden der Umfragen.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Helpers ---------- */
  const startOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // Mo = 0
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const endOfWeek = (d: Date) => {
    const start = startOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(-1);
    return end;
  };
  const inRange = (dt: Date, from: Date, to: Date) => dt >= from && dt <= to;

  const getRange = (): { from: Date; to: Date } => {
    const now = new Date();
    if (timeFilter === "THIS_WEEK")
      return { from: startOfWeek(now), to: endOfWeek(now) };
    if (timeFilter === "LAST_WEEK") {
      const lastWeekEnd = startOfWeek(now);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd2 = new Date(lastWeekEnd);
      lastWeekEnd2.setMilliseconds(-1);
      return { from: lastWeekStart, to: lastWeekEnd2 };
    }
    const from = customFrom ? new Date(customFrom) : new Date(0);
    const to = customTo ? new Date(customTo) : new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  };

  /* ---------- Filter + Suche ---------- */
  const timeFilteredSurveys = useMemo(() => {
    const { from, to } = getRange();
    return surveyList.filter((s) => {
      const submitted = s.submittedAt
        ? new Date(s.submittedAt)
        : new Date(s.createdAt);
      return inRange(submitted, from, to);
    });
  }, [surveyList, timeFilter, customFrom, customTo]);

  const visibleSurveys = useMemo(() => {
    if (!search.trim()) return timeFilteredSurveys;
    const term = search.toLowerCase();
    return timeFilteredSurveys
      .map((s) => {
        const matchUser = `${s.user.name} ${s.user.last_name}`
          .toLowerCase()
          .includes(term);
        const qs = s.questions.filter(
          (q) =>
            q.question.text.toLowerCase().includes(term) ||
            (q.answer ?? "").toLowerCase().includes(term)
        );
        if (matchUser || qs.length)
          return { ...s, questions: matchUser ? s.questions : qs };
        return null;
      })
      .filter(Boolean) as Survey[];
  }, [timeFilteredSurveys, search]);

  /* ---------- Favoriten ---------- */
  const allVisibleQuestions = useMemo(() => {
    const arr: { surveyId: string; user: Survey["user"]; q: SurveyQuestion }[] =
      [];
    visibleSurveys.forEach((s) =>
      s.questions.forEach((q) => arr.push({ surveyId: s.id, user: s.user, q }))
    );
    return arr;
  }, [visibleSurveys]);

  const favoriteQuestions = useMemo(
    () => allVisibleQuestions.filter((x) => favorites.includes(x.q.id)),
    [allVisibleQuestions, favorites]
  );

  const toggleFavorite = (questionId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(questionId);
      const next = exists
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId];
      localStorage.setItem("faqFavorites", JSON.stringify(next));
      return next;
    });
  };

  const copyAnswer = (answer: string) => {
    navigator.clipboard.writeText(answer || "");
    toaster.create({ type: "info", description: "Antwort kopiert." });
  };

  /* ---------- Persist Filter ---------- */
  const handleFilterChange = (val: TimeFilter) => {
    setTimeFilter(val);
    localStorage.setItem("timeFilter", val);
  };
  const handleCustomFrom = (v: string) => {
    setCustomFrom(v);
    localStorage.setItem("timeFilterFrom", v);
  };
  const handleCustomTo = (v: string) => {
    setCustomTo(v);
    localStorage.setItem("timeFilterTo", v);
  };

  return (
    <Box maxW="1200px" mx="auto" p={{ base: 4, md: 6 }}>
      <Heading size="lg" textAlign="center" color="teal.600">
        Umfragen
      </Heading>
      <Text textAlign="center" color="gray.500">
        {coach.role === "COACH" ? "Coach-Ansicht" : "Admin-Ansicht"}
      </Text>

      {/* Filter */}
      <Stack mt={6}>
        <Select.Root
          collection={timeFilters}
          size="sm"
          width="320px"
          value={[timeFilter]}
          onValueChange={({ value: [val] }) =>
            handleFilterChange(val as TimeFilter)
          }
        >
          <Select.HiddenSelect name="timeFilter" />
          <Select.Label>Zeitraum wählen</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Zeitraum wählen" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
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
          <Flex gap={2} wrap="wrap">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomFrom(e.target.value)}
            />
            <Input
              type="date"
              value={customTo}
              onChange={(e) => handleCustomTo(e.target.value)}
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
        <Card.Root variant="outline" mt={6}>
          <CardHeader>
            <Heading size="md">Favoriten</Heading>
            <Text fontSize="sm" color="gray.500">
              Von dir markierte Antworten
            </Text>
          </CardHeader>
          <CardBody>
            <Stack>
              {favoriteQuestions.map(({ q, user }) => (
                <FavRow
                  key={q.id}
                  q={q}
                  user={user}
                  onCopy={() => copyAnswer(q.answer)}
                  onToggle={() => toggleFavorite(q.id)}
                />
              ))}
            </Stack>
          </CardBody>
        </Card.Root>
      )}

      {/* Surveys */}
      <Box mt={8}>
        {loading ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="lg" />
          </Flex>
        ) : visibleSurveys.length === 0 ? (
          <Text color="gray.500">Keine Umfragen im gewählten Zeitraum.</Text>
        ) : (
          <Accordion.Root  collapsible>
            {visibleSurveys.map((survey) => (
              <Accordion.Item key={survey.id} value={String(survey.id)}>
                <Accordion.ItemTrigger>
                  <Flex w="100%" justify="space-between" p={3}>
                    <Box>
                      <Text fontWeight="bold">
                        {survey.user.name} {survey.user.last_name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(
                          survey.submittedAt ?? survey.createdAt
                        ).toLocaleString("de-DE")}
                      </Text>
                    </Box>
                    <Badge colorScheme="teal">
                      {survey.questions.length} Fragen
                    </Badge>
                  </Flex>
                </Accordion.ItemTrigger>

                <Accordion.ItemContent
                  as="div"
                  style={{
                    borderLeft: `1px solid ${borderCol}`,
                    borderRight: `1px solid ${borderCol}`,
                    borderBottom: `1px solid ${borderCol}`,
                    borderRadius: "0 0 8px 8px",
                    padding: "12px 16px",
                    marginBottom: "12px",
                  }}
                >
                  <Stack>
                    {survey.questions.map((q) => {
                      const isFav = favorites.includes(q.id);
                      return (
                        <Box
                          key={q.id}
                          borderColor={borderCol}
                        >
                          <Flex
                            justify="space-between"
                            align={{ base: "flex-start", md: "center" }}
                            gap={2}
                          >
                            <Box flex="1">
                              <Text fontWeight="semibold">
                                {q.question.text}
                              </Text>
                              <Text mt={1} whiteSpace="pre-wrap">
                                {q.answer || "—"}
                              </Text>
                              {typeof q.rating === "number" && (
                                <Badge mt={1} colorScheme="purple">
                                  Rating: {q.rating}
                                </Badge>
                              )}
                            </Box>

                            <Flex gap={2} align="center">
                              <Tooltip
                                content={
                                  isFav
                                    ? "Aus Favoriten entfernen"
                                    : "Zu Favoriten hinzufügen"
                                }
                              >
                                <IconButton
                                  aria-label="FAQ markieren"
                                  variant={isFav ? "solid" : "outline"}
                                  colorScheme={isFav ? "blackAlpha" : "gray"}
                                  color={isFav ? "black" : undefined}
                                  onClick={() => toggleFavorite(q.id)}
                                  size="sm"
                                >
                                  <BsStar />
                                </IconButton>
                              </Tooltip>

                              <Tooltip content="Antwort kopieren">
                                <IconButton
                                  aria-label="Antwort kopieren"
                                  variant="outline"
                                  onClick={() => copyAnswer(q.answer)}
                                  size="sm"
                                >
                                  <CgCopy />
                                </IconButton>
                              </Tooltip>
                            </Flex>
                          </Flex>
                        </Box>
                      );
                    })}
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

/* ---------------- UI-Snippets ---------------- */

function FavRow({
  q,
  user,
  onCopy,
  onToggle,
}: {
  q: SurveyQuestion;
  user: { id: string; name: string; last_name: string };
  onCopy: () => void;
  onToggle: () => void;
}) {
  const borderCol = useColorModeValue("gray.200", "gray.600");
  return (
    <Box borderBottom="1px solid" borderColor={borderCol} pb={3}>
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        gap={2}
      >
        <Box flex="1">
          <Text fontWeight="bold">
            {user.name} {user.last_name}
          </Text>
          <Text fontWeight="semibold" mt={1}>
            {q.question.text}
          </Text>
          <Text mt={1} whiteSpace="pre-wrap">
            {q.answer || "—"}
          </Text>
          {typeof q.rating === "number" && (
            <Badge mt={1} colorScheme="purple">
              Rating: {q.rating}
            </Badge>
          )}
        </Box>
        <Flex gap={2}>
          <Tooltip content="Aus Favoriten entfernen">
            <IconButton
              aria-label="FAQ markieren"
              variant="solid"
              colorScheme="blackAlpha"
              color="black"
              onClick={onToggle}
              size="sm"
            >
              <BsStar />
            </IconButton>
          </Tooltip>
          <Tooltip content="Antwort kopieren">
            <IconButton
              aria-label="Antwort kopieren"
              variant="outline"
              onClick={onCopy}
              size="sm"
            >
              <CgCopy />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
    </Box>
  );
}
