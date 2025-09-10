import getUserFromToken from "@/services/getTokenFromLokal";
import { toaster } from "@/components/ui/toaster";
import {
  Box,
  Button,
  Checkbox,
  Field,
  FieldLabel,
  Flex,
  Grid,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
  Input,
  // Divider, // not available in current chakra build
  // Select, // use native select
  Badge,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { BsX } from "react-icons/bs";
import { CgCheck } from "react-icons/cg";

// Helper: humanize weekly cron like "m H * * d" into German day + HH:MM
const DOW_DE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
function formatCronHuman(cron: string) {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return { dayText: "Unbekannt", time: cron };
    const [min, hour, , , dowRaw] = parts;
    const time =
      /^\d+$/.test(hour) && /^\d+$/.test(min)
        ? `${hour.toString().padStart(2, "0")}:${min
            .toString()
            .padStart(2, "0")}`
        : `${hour}:${min}`;
    const mapNumToDay = (d: string) => {
      const n = parseInt(d, 10);
      if (isNaN(n)) return d;
      const idx = ((n % 7) + 7) % 7; // support 0 or 7 = Sonntag
      return DOW_DE[idx] ?? d;
    };
    let dayText = "";
    if (dowRaw === "*") dayText = "Täglich";
    else if (dowRaw.includes(","))
      dayText = dowRaw.split(",").map(mapNumToDay).join(", ");
    else if (dowRaw.includes("-")) {
      const [a, b] = dowRaw.split("-");
      dayText = `${mapNumToDay(a)}–${mapNumToDay(b)}`;
    } else dayText = mapNumToDay(dowRaw);
    return { dayText, time };
  } catch {
    return { dayText: "Unbekannt", time: cron };
  }
}

export default function CreateQuestions() {
  const [question, setQuestion] = useState("");
  const [isRating, setIsRating] = useState(false);
  const [questionList, setQuestionList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastQuestions, setBroadcastQuestions] = useState<
    { text: string; isRating: boolean }[]
  >([]);
  const [newBroadcastQuestion, setNewBroadcastQuestion] = useState("");
  const [newBroadcastIsRating, setNewBroadcastIsRating] = useState(false);
  const [targetRole, setTargetRole] = useState("COACH");
  const [broadcastComment, setBroadcastComment] = useState("");

  // Schedule UI state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedType, setSchedType] = useState("ADMIN_TO_COACHES");
  // Replace raw cron with user-friendly day/time controls
  const [schedDow, setSchedDow] = useState("3"); // 0=So, 1=Mo, ... 3=Mi (Default)
  const [schedHour, setSchedHour] = useState("14"); // 0-23
  const [schedMinute, setSchedMinute] = useState("10"); // 0-59
  const [schedTz, setSchedTz] = useState("Europe/Berlin");
  const [schedActive, setSchedActive] = useState(true);
  const [schedComment, setSchedComment] = useState("Wöchentliche Umfrage");

  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  useEffect(() => {
    fetchQuestions();
    fetchSchedules();
  }, []);

  const fetchQuestions = async () => {
    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/question/getQuestionByCoach/${coach.id}`
        : `http://localhost:3000/question/getQuestionsByAdmin`;

    try {
      toaster.create({ title: "Lade Fragen…", type: "loading" });
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setQuestionList(data || []);
      toaster.create({ title: "Fragen geladen", type: "success" });
    } catch (err) {
      console.error("Fehler beim Laden der Fragen", err);
      toaster.create({ title: "Fehler beim Laden", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch("http://localhost:3000/surveys/schedules", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) setSchedules(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const submitQuestion = async () => {
    if (!question.trim()) return;

    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/question/createQuestion/${coach.id}`
        : `http://localhost:3000/question/createAdminQuestion`;

    try {
      toaster.create({ title: "Erstelle Frage…", type: "loading" });
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: question, isRating }),
      });

      setQuestion("");
      setIsRating(false);
      fetchQuestions();
      toaster.create({
        title: "Frage erstellt",
        description: question,
        type: "success",
      });
    } catch (err) {
      console.error("Fehler beim Erstellen der Frage", err);
      toaster.create({ title: "Fehler beim Erstellen", type: "error" });
    }
  };

  const deleteQuestion = async (qId: string) => {
    try {
      await fetch(`http://localhost:3000/question/deleteQuestion/${qId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      fetchQuestions();
      toaster.create({ title: "Frage Status geändert", type: "success" });
    } catch (err) {
      console.error("Fehler beim Löschen", err);
      toaster.create({ title: "Fehler beim Ändern", type: "error" });
    }
  };

  const createSchedule = async () => {
    try {
      const cronExpression = `${schedMinute} ${schedHour} * * ${schedDow}`; // m H * * dow
      const body = {
        type: schedType,
        cronExpression,
        timezone: schedTz,
        active: schedActive,
        comment: schedComment,
      };
      const res = await fetch("http://localhost:3000/surveys/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toaster.create({ title: "Schedule erstellt", type: "success" });
        await fetchSchedules();
      } else {
        toaster.create({
          title: "Fehler beim Erstellen des Schedules",
          type: "error",
        });
      }
    } catch (e) {
      toaster.create({
        title: "Fehler beim Erstellen des Schedules",
        type: "error",
      });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/surveys/schedules/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toaster.create({ title: "Schedule gelöscht", type: "success" });
        await fetchSchedules();
      } else {
        toaster.create({
          title: "Fehler beim Löschen des Schedules",
          type: "error",
        });
      }
    } catch (e) {
      toaster.create({
        title: "Fehler beim Löschen des Schedules",
        type: "error",
      });
    }
  };

  const surveyLikeList = useMemo(
    () => questionList.filter((q) => !q.isDeleted),
    [questionList]
  );

  return (
    <Box p={5}>
      {/* Header */}
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Fragen Verwaltung
      </Text>

      {/* Create question form */}
      <Box
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        borderRadius="md"
        p={4}
        mb={6}
      >
        <Field.Root mb={3}>
          <FieldLabel>Neue Frage</FieldLabel>
          <Textarea
            placeholder="Frage eingeben..."
            maxW="600px"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Field.Root>
        <Checkbox.Root
          mt={3}
          checked={isRating}
          onChange={(e: any) => setIsRating(e.target.checked)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>Mit Rating beantworten (1–10)</Checkbox.Label>
        </Checkbox.Root>
        <Flex justifyContent="flex-end" mt={4}>
          <Button onClick={submitQuestion} colorScheme="teal">
            Frage anlegen
          </Button>
        </Flex>
      </Box>

      {/* Survey-like card with all active questions */}
      <Box
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        borderRadius="md"
        p={4}
        mb={6}
      >
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          Vorschau: Umfrage mit aktuellen Fragen
        </Text>
        {loading ? (
          <Spinner />
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4}>
            {surveyLikeList.map((q: any) => (
              <Box
                key={q.id}
                p={4}
                borderWidth="1px"
                borderColor="var(--color-border)"
                borderRadius="md"
                bg="var(--color-surface)"
              >
                <Flex justifyContent="space-between" alignItems="center" mb={2}>
                  <Text fontWeight="medium">
                    {q.isRating ? "🔢 Rating" : "✏️ Text"}
                  </Text>
                  <IconButton
                    size="sm"
                    aria-label="Löschen"
                    onClick={() => deleteQuestion(q.id)}
                  >
                    <Icon as={q.isDeleted ? CgCheck : BsX} />
                  </IconButton>
                </Flex>
                <Text>{q.text}</Text>
              </Box>
            ))}
          </Grid>
        )}
      </Box>

      {/* Schedule configuration for Admin */}
      {coach.role === "ADMIN" && (
        
        <Box
          bg="var(--color-surface)"
          borderWidth="1px"
          borderColor="var(--color-border)"
          borderRadius="md"
          p={4}
          mb={6}
        >
          <Text fontWeight="semibold" mb={3}>
            Automatische Umfragen planen
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3}>
            <Box>
              <Text mb={1} fontWeight="semibold">
                Ziel
              </Text>
              <select
                value={schedType}
                onChange={(e) =>
                  setSchedType((e.target as HTMLSelectElement).value)
                }
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  width: "100%",
                }}
              >
                <option value="ADMIN_TO_COACHES">Admin → Coaches</option>
                <option value="COACH_TO_CUSTOMERS">Coach → Kunden</option>
              </select>
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">
                Tag
              </Text>
              <select
                value={schedDow}
                onChange={(e) =>
                  setSchedDow((e.target as HTMLSelectElement).value)
                }
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  width: "100%",
                }}
              >
                <option value="1">Montag</option>
                <option value="2">Dienstag</option>
                <option value="3">Mittwoch</option>
                <option value="4">Donnerstag</option>
                <option value="5">Freitag</option>
                <option value="6">Samstag</option>
                <option value="0">Sonntag</option>
              </select>
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">
                Stunde
              </Text>
              <select
                value={schedHour}
                onChange={(e) =>
                  setSchedHour((e.target as HTMLSelectElement).value)
                }
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  width: "100%",
                }}
              >
                {Array.from({ length: 24 }, (_, h) =>
                  h.toString().padStart(2, "0")
                ).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">
                Minute
              </Text>
              <select
                value={schedMinute}
                onChange={(e) =>
                  setSchedMinute((e.target as HTMLSelectElement).value)
                }
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  width: "100%",
                }}
              >
                {Array.from({ length: 60 }, (_, m) =>
                  m.toString().padStart(2, "0")
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Box>
          </Grid>
          <Checkbox.Root
            mt={3}
            checked={schedActive}
            onChange={(e: any) => setSchedActive(e.target.checked)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Aktiv</Checkbox.Label>
          </Checkbox.Root>
          <Field.Root mt={3}>
            <FieldLabel>Zeitzone</FieldLabel>
            <Input
              value={schedTz}
              onChange={(e) => setSchedTz(e.target.value)}
              placeholder="Europe/Berlin"
            />
          </Field.Root>
          <Field.Root mt={3}>
            <FieldLabel>Kommentar</FieldLabel>
            <Input
              value={schedComment}
              onChange={(e) => setSchedComment(e.target.value)}
              placeholder="Beschreibung"
            />
          </Field.Root>
          <Text mt={2} fontSize="sm" color="var(--color-muted)">
            Vorschau Cron: {`${schedMinute} ${schedHour} * * ${schedDow}`}
          </Text>
          <Flex justifyContent="flex-end" mt={4}>
            <Button onClick={createSchedule} colorScheme="purple">
              Schedule hinzufügen
            </Button>
          </Flex>
          <Box h="1px" bg="var(--color-border)" my={4} />
          <Text fontWeight="semibold" mb={2}>
            Bestehende Schedules
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3}>
            {schedules.map((s) => (
              <Box
                key={s.id}
                p={3}
                borderWidth="1px"
                borderColor="var(--color-border)"
                borderRadius="md"
                bg="var(--color-surface)"
              >
                <Flex justifyContent="space-between" alignItems="center" mb={1}>
                  <Text fontWeight="medium">{s.type}</Text>
                  <Badge colorScheme={s.active ? "green" : "red"}>
                    {s.active ? "aktiv" : "inaktiv"}
                  </Badge>
                </Flex>
                <Text fontSize="sm" color="var(--color-muted)">
                  {(() => {
                    const h = formatCronHuman(s.cronExpression);
                    return `Geplant: ${h.dayText} ${h.time} · TZ: ${s.timezone || "system"}`;
                  })()}
                </Text>
                {s.comment && (
                  <Text fontSize="sm" mt={1}>
                    {s.comment}
                  </Text>
                )}
                <Flex justifyContent="flex-end" mt={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => deleteSchedule(s.id)}
                  >
                    Löschen
                  </Button>
                </Flex>
              </Box>
            ))}
          </Grid>
        </Box>
      )}

      {/* Existing broadcast modal retained, but trigger button removed from header */}
      {broadcastOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          justifyContent="center"
          alignItems="flex-start"
          pt={20}
          px={4}
        >
          <Box
            bg="var(--color-surface)"
            borderRadius="md"
            p={6}
            w="100%"
            maxW="720px"
            boxShadow="xl"
            borderWidth="1px"
            borderColor="var(--color-border)"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="lg" fontWeight="bold">
                Broadcast Umfrage erstellen
              </Text>
              <IconButton
                aria-label="Schließen"
                size="sm"
                onClick={() => setBroadcastOpen(false)}
              >
                <Icon as={BsX} />
              </IconButton>
            </Flex>
            <Box mb={4}>
              <Text mb={1} fontWeight="semibold">
                Zielgruppe
              </Text>
              <select
                value={targetRole}
                onChange={(e) =>
                  setTargetRole((e.target as HTMLSelectElement).value)
                }
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  width: "200px",
                }}
              >
                <option value="COACH">Coaches</option>
                <option value="CUSTOMER">Customers</option>
              </select>
            </Box>
            <Field.Root mb={3}>
              <FieldLabel>Interner Kommentar (optional)</FieldLabel>
              <Textarea
                value={broadcastComment}
                onChange={(e) => setBroadcastComment(e.target.value)}
                placeholder="Kommentar für diese Umfrage"
              />
            </Field.Root>
            <Box h="1px" bg="var(--color-border)" my={4} />
            <Text fontWeight="semibold" mb={2}>
              Fragen dieser Umfrage
            </Text>
            {broadcastQuestions.length === 0 && (
              <Text fontSize="sm" color="gray.500" mb={3}>
                Noch keine Fragen hinzugefügt.
              </Text>
            )}
            <Grid
              templateColumns="repeat(auto-fill,minmax(260px,1fr))"
              gap={3}
              mb={4}
            >
              {broadcastQuestions.map((q, idx) => (
                <Box
                  key={idx}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={q.isRating ? "blue.50" : "gray.50"}
                  position="relative"
                >
                  <Flex justifyContent="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="medium">
                      {q.isRating ? "Rating" : "Text"}
                    </Text>
                    <IconButton
                      size="xs"
                      aria-label="Entfernen"
                      onClick={() =>
                        setBroadcastQuestions(
                          broadcastQuestions.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <Icon as={BsX} />
                    </IconButton>
                  </Flex>
                  <Text fontSize="sm">{q.text}</Text>
                </Box>
              ))}
            </Grid>
            <Box p={3} borderWidth={1} borderRadius="md" mb={4}>
              <Field.Root mb={2}>
                <FieldLabel>Neue Frage</FieldLabel>
                <Input
                  value={newBroadcastQuestion}
                  onChange={(e) => setNewBroadcastQuestion(e.target.value)}
                  placeholder="Fragetext"
                />
              </Field.Root>
              <Checkbox.Root
                checked={newBroadcastIsRating}
                onChange={(e: any) => setNewBroadcastIsRating(e.target.checked)}
                mb={3}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>Rating Frage (1-10)</Checkbox.Label>
              </Checkbox.Root>
              <Button
                size="sm"
                onClick={() => {
                  if (!newBroadcastQuestion.trim()) return;
                  setBroadcastQuestions([
                    ...broadcastQuestions,
                    {
                      text: newBroadcastQuestion.trim(),
                      isRating: newBroadcastIsRating,
                    },
                  ]);
                  setNewBroadcastQuestion("");
                  setNewBroadcastIsRating(false);
                }}
              >
                Frage hinzufügen
              </Button>
            </Box>
            <Flex justifyContent="space-between">
              <Button variant="ghost" onClick={() => setBroadcastOpen(false)}>
                Abbrechen
              </Button>
              <Button
                colorScheme="purple"
                onClick={async () => {
                  if (broadcastQuestions.length === 0) return;
                  try {
                    toaster.create({
                      title: "Sende Umfrage…",
                      type: "loading",
                    });
                    await fetch(
                      "http://localhost:3000/surveys/broadcastCustomSurvey",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          targetRole,
                          questions: broadcastQuestions,
                          comment: broadcastComment || undefined,
                        }),
                      }
                    );
                    setBroadcastQuestions([]);
                    setBroadcastComment("");
                    setBroadcastOpen(false);
                    toaster.create({
                      title: "Umfrage gesendet",
                      description: `${broadcastQuestions.length} Fragen an ${targetRole}`,
                      type: "success",
                    });
                  } catch (err) {
                    console.error("Fehler beim Broadcast", err);
                    toaster.create({
                      title: "Fehler beim Senden",
                      type: "error",
                    });
                  }
                }}
              >
                Umfrage erstellen & senden
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
