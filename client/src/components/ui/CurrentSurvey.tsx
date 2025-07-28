import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  Textarea,
  Badge,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";

type SurveyQuestion = {
  id: string;
  answer: string;
  rating: number | null;
  question: {
    id: string;
    text: string;
  };
};

type Survey = {
  id: string;
  questions: SurveyQuestion[];
};

export default function CurrentSurvey() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [surveyList, setSurveyList] = useState<any>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const surveyResponse = await fetch(
        `http://localhost:3000/surveys/getCurrentSurvey/${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const surveyData = await surveyResponse.json();
      setSurvey(surveyData);

      // Initiale Antworten setzen
      const initialAnswers: { [key: string]: string } = {};
      surveyData?.questions?.forEach((q: SurveyQuestion) => {
        initialAnswers[q.id] = q.answer || "";
      });
      setAnswers(initialAnswers);

      // Vergangene Umfragen laden
      const historyResponse = await fetch(
        `http://localhost:3000/surveys/getSurveysByUser/${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const historyData = await historyResponse.json();
      setSurveyList(historyData.filter((s: any) => s.submittedAt != null));
    } catch (error) {
      console.error("Fehler beim Laden der Umfrage", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/surveys/submitSurveyAnswers/${survey?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: Object.entries(answers).map(([id, answer]) => ({
              id,
              answer,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Fehler beim Absenden");
      }

      fetchQuestions(); // Aktualisiere die Ansicht
    } catch (error) {}
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <Box m={5}>
      {/* Header */}
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg" textAlign="center" w="100%">
          Aktuelle Umfrage
        </Heading>
        {user?.role === "COACH" && (
          <Badge colorScheme="purple" ml={2}>
            Coach-Ansicht
          </Badge>
        )}
      </Flex>

      {loading ? (
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" />
        </Flex>
      ) : !survey ? (
        <Text color="gray.500">Keine aktuelle Umfrage verfügbar.</Text>
      ) : !Array.isArray(survey.questions) || survey.questions.length === 0 ? (
        <Text color="gray.500">Keine Fragen in der aktuellen Umfrage.</Text>
      ) : (
        <Card.Root variant="outline" p={4} mb={6}>
          <CardBody>
            <Stack >
              {survey.questions.map((q) => (
                <Box key={q.id}>
                  <Text fontWeight="semibold" mb={2}>
                    {q.question?.text}
                  </Text>
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                    placeholder="Antwort eingeben..."
                    resize="vertical"
                  />
                </Box>
              ))}
              <Button colorScheme="teal" onClick={handleSubmit}>
                Antworten absenden
              </Button>
            </Stack>
          </CardBody>
        </Card.Root>
      )}
    </Box>
  );
}
