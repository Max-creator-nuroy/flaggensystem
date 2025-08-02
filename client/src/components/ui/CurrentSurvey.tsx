import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  Textarea,
  Badge,
  Slider,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";

type SurveyQuestion = {
  id: string;
  answer: string;
  rating: number | null;
  question: {
    id: string;
    text: string;
    isRating?: boolean;
  };
};

type Survey = {
  id: string;
  questions: SurveyQuestion[];
};

export default function CurrentSurvey() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<{
    [key: string]: { answer?: string; rating?: any };
  }>({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:3000/surveys/getCurrentSurvey/${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setSurvey(data);
      console.log(survey);

      const initialAnswers: {
        [key: string]: { answer?: string; rating?: number | null };
      } = {};
      data?.questions?.forEach((q: SurveyQuestion) => {
        initialAnswers[q.id] = {
          answer: q.answer || "",
          rating: q.rating || 5, // default für Slider zentriert
        };
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("Fehler beim Laden der Umfrage", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], answer: value } }));
  };

  const handleRatingChange = (id: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], rating: value } }));
  };

  const handleSubmit = async () => {
    console.log(answers); 
    try {
      const res = await fetch(
        `http://localhost:3000/surveys/submitSurveyAnswers/${survey?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: Object.entries(answers).map(([id, entry]) => ({
              id,
              answer: entry.answer,
              rating: entry.rating,
            })),
          }),
        }
      );

      if (!res.ok) throw new Error("Fehler beim Absenden");

      fetchQuestions(); // Reload
    } catch (err) {
      console.error("Fehler beim Absenden", err);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <Box m={5}>
      {loading ? (
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="lg" />
        </Flex>
      ) : !survey ? (
        <Text color="gray.500">Keine aktuelle Umfrage verfügbar.</Text>
      ) : !Array.isArray(survey.questions) || survey.questions.length === 0 ? (
        <Text color="gray.500">Keine aktuelle Umfrage verfügbar.</Text>
      ) : (
        <Card.Root variant="outline" p={4} mb={6}>
          <CardBody>
            <Stack>
              {survey?.questions?.map((q: any) => (
                <Box key={q.id}>
                  <Text fontWeight="semibold" mb={2}>
                    {q.question?.text}
                  </Text>

                  {q.question?.isRating ? (
                    <Box px={2}>
                      <Slider.Root
                        min={1}
                        max={10}
                        step={1}
                        value={[answers[q.id]?.rating ?? 5]} // <- Als Array übergeben
                        onValueChange={(value) =>
                          handleRatingChange(q.id, value.value[0])
                        }
                        onValueChangeEnd={(value) => {
                          handleRatingChange(q.id, value.value[0]); // <- Zugriff auf Wert im Array
                        }}
                      >
                        <Slider.Control>
                          <Slider.Track>
                            <Slider.Range />
                          </Slider.Track>
                          <Slider.Thumb index={0}>
                            <Slider.DraggingIndicator
                              layerStyle="fill.solid"
                              top="6"
                              rounded="sm"
                              px="1.5"
                            >
                              <Slider.ValueText />
                            </Slider.DraggingIndicator>
                          </Slider.Thumb>
                        </Slider.Control>
                      </Slider.Root>

                      <Text fontSize="sm" mt={1} textAlign="right">
                        Bewertung: {answers[q.id]?.rating}
                      </Text>
                    </Box>
                  ) : (
                    <Textarea
                      value={answers[q.id]?.answer || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="Antwort eingeben..."
                      resize="vertical"
                    />
                  )}
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
