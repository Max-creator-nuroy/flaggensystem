import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Button,
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
import { LuActivity, LuTrash } from "react-icons/lu";
import { Form } from "react-router";

export default function CreateQuestions() {
  const [question, setQuestion] = useState("");
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);
  const [questionList, setQuestionList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    const url =
      coach.role == "COACH"
        ? `http://localhost:3000/question/getQuestionByCoach/${coach.id}`
        : `http://localhost:3000/question/getQuestionsByAdmin`;
    try {
      await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          setQuestionList(data || []); // <- Passe dies ggf. an deine API an;
          setLoading(false);
        });
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestion("");

    if (question != "") {
      const url =
        coach.role == "COACH"
          ? `http://localhost:3000/question/createQuestion/${coach.id}`
          : `http://localhost:3000/question/createAdminQuestion`;
      const token = localStorage.getItem("token");
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: question }),
        });

        fetchQuestions();
      } catch (error) {
        alert("Netzwerkfehler");
      }
    }
  };

  const deleteQuestion = async (qId: any) => {
    fetch(`http://localhost:3000/question/deleteQuestion/${qId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => fetchQuestions())
      .catch((err) => console.error(err));
  };

  const QuestionCard = ({ question }: { question: any }) => (
    <GridItem
      colSpan={{ base: 3, md: 1 }}
      p={4}
      w="100%"
      height="100%"
      borderRadius={1}
      borderWidth={1}
    >
      <Flex justifyContent={"end"}>
        <IconButton onClick={() => deleteQuestion(question.id)}>
          <Icon>{question.isDeleted ? <CgCheck /> : <BsX />}</Icon>
        </IconButton>
      </Flex>
      <Flex flexDir="column" alignItems="center">
        <Text>{question.text}</Text>
      </Flex>
    </GridItem>
  );

  return (
    <Box>
      <Flex flexDirection="column" m={5}>
        <Form onSubmit={handleSubmit}>
          <Flex flexDirection="column">
            <Field.Root mb={3}>
              <FieldLabel>Frage</FieldLabel>
              <Textarea
                maxWidth={{ lg: "50%" }}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </Field.Root>
            <Flex alignItems="end" flexDirection="column">
              <Button type="submit">Anlegen</Button>
            </Flex>
          </Flex>
        </Form>
        {loading ? (
          <Spinner />
        ) : (
          <Flex flexDirection={"column"}>
            <Grid templateColumns="repeat(3, 1fr)" mt={5}>
              {questionList
                .filter((question: any) => question.isDeleted == false)
                .map((question, idx) => (
                  <QuestionCard question={question} key={idx} />
                ))}
            </Grid>
            <Text mt={5} fontWeight={"medium"}>
              {" "}
              Inactive Fragen:
            </Text>
            <Grid templateColumns="repeat(3, 1fr)" mt={5}>
              {questionList
                .filter((question: any) => question.isDeleted == true)
                .map((question, idx) => (
                  <QuestionCard question={question} key={idx} />
                ))}
            </Grid>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
