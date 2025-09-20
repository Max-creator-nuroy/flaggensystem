import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Spinner,
  Stack,
  Text,
  Textarea,
  Slider,
  Heading,
  VStack,
  HStack,
  Icon,
  Badge,
  Progress,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiMessageSquare, FiSend, FiCheckCircle, FiBarChart } from "react-icons/fi";
import { toaster } from "@/components/ui/toaster";

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

      toaster.create({
        title: "Umfrage abgeschickt!",
        description: "Deine Antworten wurden erfolgreich gespeichert",
        type: "success",
      });
      
      fetchQuestions(); // Reload
    } catch (err) {
      console.error("Fehler beim Absenden", err);
      toaster.create({
        title: "Fehler beim Absenden",
        description: "Bitte versuche es später noch einmal",
        type: "error",
      });
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const completedAnswers = survey?.questions?.filter(q => {
    const answer = answers[q.id];
    if (q.question?.isRating) {
      return answer?.rating !== undefined && answer?.rating !== null;
    }
    return answer?.answer && answer.answer.trim().length > 0;
  }).length || 0;

  const totalQuestions = survey?.questions?.length || 0;
  const progressPercentage = totalQuestions > 0 ? (completedAnswers / totalQuestions) * 100 : 0;

  return (
    <VStack gap={6} align="stretch">
      {loading ? (
        <Card.Root>
          <CardBody>
            <Flex justify="center" align="center" py={12}>
              <VStack gap={4}>
                <Spinner size="lg" color="blue.500" />
                <Text fontSize="sm" color="var(--color-muted)">
                  Lade aktuelle Umfrage...
                </Text>
              </VStack>
            </Flex>
          </CardBody>
        </Card.Root>
      ) : !survey || !Array.isArray(survey.questions) || survey.questions.length === 0 ? (
        <Card.Root>
          <CardBody>
            <Flex justify="center" align="center" py={12}>
              <VStack gap={4}>
                <Icon as={FiMessageSquare} boxSize={16} color="var(--color-muted)" />
                <Heading size="md" color="var(--color-muted)">
                  Keine aktuelle Umfrage
                </Heading>
                <Text fontSize="sm" color="var(--color-muted)" textAlign="center">
                  Momentan steht keine neue Umfrage zur Verfügung. 
                  Schau später noch einmal vorbei!
                </Text>
              </VStack>
            </Flex>
          </CardBody>
        </Card.Root>
      ) : (
        <>
          {/* Header Card */}
          <Card.Root>
            <CardHeader>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <Flex 
                    w={10} h={10} 
                    align="center" justify="center" 
                    rounded="full" 
                    bg="blue.500"
                    color="white"
                  >
                    <Icon as={FiMessageSquare} boxSize={5} />
                  </Flex>
                  <VStack align="start" gap={0}>
                    <Heading size="md">Aktuelle Umfrage</Heading>
                    <Text fontSize="sm" color="var(--color-muted)">
                      {totalQuestions} Fragen zu beantworten
                    </Text>
                  </VStack>
                </Flex>
                <Badge 
                  colorScheme={progressPercentage === 100 ? "green" : "blue"} 
                  variant="subtle"
                >
                  {completedAnswers}/{totalQuestions} Fragen
                </Badge>
              </Flex>
              
              {/* Progress Bar */}
              <Progress.Root 
                value={progressPercentage} 
                colorScheme="blue" 
                mt={4}
                size="sm"
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Text fontSize="xs" color="var(--color-muted)" mt={1}>
                {Math.round(progressPercentage)}% abgeschlossen
              </Text>
            </CardHeader>
          </Card.Root>

          {/* Questions */}
          <VStack gap={4} align="stretch">
            {survey.questions.map((q: any, index: number) => (
              <Card.Root 
                key={q.id}
                borderWidth="1px"
                borderColor={answers[q.id]?.answer || answers[q.id]?.rating ? "green.300" : "var(--color-border)"}
              >
                <CardBody>
                  <VStack gap={4} align="stretch">
                    <Flex align="start" gap={3}>
                      <Badge colorScheme="blue" variant="outline" size="sm">
                        {index + 1}
                      </Badge>
                      <VStack align="start" gap={2} flex={1}>
                        <Text fontWeight="semibold" lineHeight="1.4">
                          {q.question?.text}
                        </Text>
                        
                        <Badge 
                          colorScheme={q.question?.isRating ? "purple" : "green"} 
                          variant="subtle" 
                          size="sm"
                        >
                          {q.question?.isRating ? "Rating 1-10" : "Text-Antwort"}
                        </Badge>
                      </VStack>
                    </Flex>

                    {q.question?.isRating ? (
                      <Box>
                        <Slider.Root
                          min={1}
                          max={10}
                          step={1}
                          value={[answers[q.id]?.rating ?? 5]}
                          onValueChange={(value) =>
                            handleRatingChange(q.id, value.value[0])
                          }
                          onValueChangeEnd={(value) => {
                            handleRatingChange(q.id, value.value[0]);
                          }}
                          colorScheme="purple"
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

                        <HStack justify="space-between" mt={2}>
                          <Text fontSize="xs" color="var(--color-muted)">Sehr schlecht</Text>
                          <Text fontSize="sm" fontWeight="medium" color="purple.600">
                            Bewertung: {answers[q.id]?.rating}/10
                          </Text>
                          <Text fontSize="xs" color="var(--color-muted)">Ausgezeichnet</Text>
                        </HStack>
                      </Box>
                    ) : (
                      <Textarea
                        value={answers[q.id]?.answer || ""}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="Schreibe hier deine Antwort..."
                        resize="vertical"
                        bg="var(--color-surface)"
                        borderColor="var(--color-border)"
                        _focus={{ borderColor: "green.400" }}
                        rows={4}
                      />
                    )}
                  </VStack>
                </CardBody>
              </Card.Root>
            ))}
          </VStack>

          {/* Submit Button */}
          <Card.Root>
            <CardBody>
              <Flex justify="space-between" align="center">
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium">Bereit zum Absenden?</Text>
                  <Text fontSize="sm" color="var(--color-muted)">
                    {completedAnswers === totalQuestions 
                      ? "Alle Fragen beantwortet!" 
                      : `Noch ${totalQuestions - completedAnswers} Frage${totalQuestions - completedAnswers !== 1 ? 'n' : ''} offen`
                    }
                  </Text>
                </VStack>
                
                <Button 
                  colorScheme="blue" 
                  onClick={handleSubmit}
                  size="lg"
                  disabled={completedAnswers === 0}
                >
                  <Icon as={FiSend} mr={2} />
                  Antworten absenden
                </Button>
              </Flex>
            </CardBody>
          </Card.Root>
        </>
      )}
    </VStack>
  );
}
