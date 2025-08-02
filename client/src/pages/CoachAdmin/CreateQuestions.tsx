import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
  Checkbox,
  Field,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsX } from "react-icons/bs";
import { CgCheck } from "react-icons/cg";

export default function CreateQuestions() {
  const [question, setQuestion] = useState("");
  const [isRating, setIsRating] = useState(false);
  const [questionList, setQuestionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/question/getQuestionByCoach/${coach.id}`
        : `http://localhost:3000/question/getQuestionsByAdmin`;

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setQuestionList(data || []);
    } catch (err) {
      console.error("Fehler beim Laden der Fragen", err);
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async () => {
    if (!question.trim()) return;

    const url =
      coach.role === "COACH"
        ? `http://localhost:3000/question/createQuestion/${coach.id}`
        : `http://localhost:3000/question/createAdminQuestion`;

    try {
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
    } catch (err) {
      console.error("Fehler beim Erstellen der Frage", err);
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
    } catch (err) {
      console.error("Fehler beim Löschen", err);
    }
  };

  const QuestionCard = ({ question }: { question: any }) => (
    <GridItem
      colSpan={{ base: 3, md: 1 }}
      p={4}
      borderRadius="md"
      borderWidth={1}
      bg={question.isRating ? "blue.50" : "gray.50"}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontWeight="medium">
          {question.isRating ? "🔢 Rating" : "✏️ Text"}
        </Text>
        <IconButton
          size="sm"
          aria-label="Löschen"
          onClick={() => deleteQuestion(question.id)}
        >
          <Icon as={question.isDeleted ? CgCheck : BsX} />
        </IconButton>
      </Flex>
      <Text mt={3}>{question.text}</Text>
    </GridItem>
  );

  return (
    <Box p={5}>
      <Field.Root mb={4}>
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
      <Flex justifyContent="flex-end" mb={6}>
        <Button onClick={submitQuestion} colorScheme="teal">
          Frage anlegen
        </Button>
      </Flex>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <Text fontSize="lg" fontWeight="semibold" mb={2}>
            Aktive Fragen
          </Text>
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4}>
            {questionList
              .filter((q: any) => !q.isDeleted)
              .map((q: any) => (
                <QuestionCard key={q.id} question={q} />
              ))}
          </Grid>

          <Text mt={6} fontSize="lg" fontWeight="semibold">
            Inaktive Fragen
          </Text>
          <Grid
            templateColumns="repeat(auto-fill, minmax(280px, 1fr))"
            gap={4}
            mt={2}
          >
            {questionList
              .filter((q: any) => q.isDeleted)
              .map((q: any) => (
                <QuestionCard key={q.id} question={q} />
              ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
