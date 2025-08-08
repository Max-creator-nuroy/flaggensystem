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
  GridItem,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
  Input,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsX } from "react-icons/bs";
import { CgCheck } from "react-icons/cg";

export default function CreateQuestions() {
  const [question, setQuestion] = useState("");
  const [isRating, setIsRating] = useState(false);
  const [questionList, setQuestionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastQuestions, setBroadcastQuestions] = useState<
    { text: string; isRating: boolean }[]
  >([]);
  const [newBroadcastQuestion, setNewBroadcastQuestion] = useState("");
  const [newBroadcastIsRating, setNewBroadcastIsRating] = useState(false);
  const [targetRole, setTargetRole] = useState("COACH");
  const [broadcastComment, setBroadcastComment] = useState("");
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
      toaster.create({ title: "Frage erstellt", description: question, type: "success" });
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
      <Flex justifyContent="space-between" alignItems="center" mb={6} gap={4} flexWrap="wrap">
        <Text fontSize="xl" fontWeight="bold">Fragen Verwaltung</Text>
        <Button colorScheme="purple" onClick={() => setBroadcastOpen(true)}>
          Jetzt eine Umfrage erstellen
        </Button>
      </Flex>
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
      {broadcastOpen && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={1000} display="flex" justifyContent="center" alignItems="flex-start" pt={20} px={4}>
          <Box bg="white" borderRadius="md" p={6} w="100%" maxW="720px" boxShadow="xl">
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="lg" fontWeight="bold">Broadcast Umfrage erstellen</Text>
              <IconButton aria-label="Schließen" size="sm" onClick={()=> setBroadcastOpen(false)}>
                <Icon as={BsX}/>
              </IconButton>
            </Flex>
            <Box mb={4}>
              <Text mb={1} fontWeight="semibold">Zielgruppe</Text>
              <select value={targetRole} onChange={(e)=> setTargetRole(e.target.value)} style={{padding:"8px", borderRadius: "6px", border: "1px solid #ccc", width: '200px'}}>
                <option value="COACH">Coaches</option>
                <option value="CUSTOMER">Customers</option>
              </select>
            </Box>
            <Field.Root mb={3}>
              <FieldLabel>Interner Kommentar (optional)</FieldLabel>
              <Textarea value={broadcastComment} onChange={(e)=> setBroadcastComment(e.target.value)} placeholder="Kommentar für diese Umfrage"/>
            </Field.Root>
            <Box h="1px" bg="gray.200" my={4} />
            <Text fontWeight="semibold" mb={2}>Fragen dieser Umfrage</Text>
            {broadcastQuestions.length === 0 && (
              <Text fontSize="sm" color="gray.500" mb={3}>Noch keine Fragen hinzugefügt.</Text>
            )}
            <Grid templateColumns="repeat(auto-fill,minmax(260px,1fr))" gap={3} mb={4}>
              {broadcastQuestions.map((q,idx)=> (
                <Box key={idx} p={3} borderWidth={1} borderRadius="md" bg={q.isRating?"blue.50":"gray.50"} position="relative">
                  <Flex justifyContent="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="medium">{q.isRating?"Rating":"Text"}</Text>
                    <IconButton size="xs" aria-label="Entfernen" onClick={()=> setBroadcastQuestions(broadcastQuestions.filter((_,i)=> i!==idx))}>
                      <Icon as={BsX}/>
                    </IconButton>
                  </Flex>
                  <Text fontSize="sm">{q.text}</Text>
                </Box>
              ))}
            </Grid>
            <Box p={3} borderWidth={1} borderRadius="md" mb={4}>
              <Field.Root mb={2}>
                <FieldLabel>Neue Frage</FieldLabel>
                <Input value={newBroadcastQuestion} onChange={(e)=> setNewBroadcastQuestion(e.target.value)} placeholder="Fragetext"/>
              </Field.Root>
              <Checkbox.Root checked={newBroadcastIsRating} onChange={(e:any)=> setNewBroadcastIsRating(e.target.checked)} mb={3}>
                <Checkbox.HiddenInput/>
                <Checkbox.Control/>
                <Checkbox.Label>Rating Frage (1-10)</Checkbox.Label>
              </Checkbox.Root>
              <Button size="sm" onClick={()=> {
                if(!newBroadcastQuestion.trim()) return;
                setBroadcastQuestions([...broadcastQuestions,{text:newBroadcastQuestion.trim(), isRating:newBroadcastIsRating}]);
                setNewBroadcastQuestion("");
                setNewBroadcastIsRating(false);
              }}>Frage hinzufügen</Button>
            </Box>
            <Flex justifyContent="space-between">
              <Button variant="ghost" onClick={()=> setBroadcastOpen(false)}>Abbrechen</Button>
        <Button colorScheme="purple" onClick={async ()=> {
                if(broadcastQuestions.length===0) return;
                try {
                  toaster.create({ title: "Sende Umfrage…", type: "loading" });
          await fetch("http://localhost:3000/surveys/broadcastCustomSurvey", {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}`},
                    body: JSON.stringify({ targetRole, questions: broadcastQuestions, comment: broadcastComment || undefined })
                  });
                  setBroadcastQuestions([]);
                  setBroadcastComment("");
                  setBroadcastOpen(false);
          toaster.create({ title: "Umfrage gesendet", description: `${broadcastQuestions.length} Fragen an ${targetRole}`, type: "success" });
                } catch(err){
                  console.error('Fehler beim Broadcast', err);
          toaster.create({ title: "Fehler beim Senden", type: "error" });
                }
              }}>Umfrage erstellen & senden</Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
