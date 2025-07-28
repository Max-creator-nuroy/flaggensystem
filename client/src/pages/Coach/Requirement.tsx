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
import { FiDelete } from "react-icons/fi";
import { LuTrash } from "react-icons/lu";
import { Form } from "react-router";

export default function Requirement() {
  const [title, setrequirementTitle] = useState("");
  const [description, setRequirementDescription] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");
  const coachId = getUserFromToken(token);
  const [requirementList, setRequirementList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/requirement/getRequirementByCoach/${coachId.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data.requirement);
          setRequirementList(data.requirement || []); // <- Passe dies ggf. an deine API an;
          setLoading(false);
        });
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (title != "" && description != "") {
      const requirement = {
        title,
        description,
      };
      try {
        const res = await fetch(
          `http://localhost:3000/requirement/createRequirement/${coachId.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requirement),
          }
        ).then((data) => {
          setRequirementDescription("");
          setrequirementTitle("");
        });
      } catch (error) {
        alert("Speichern fehlgeschlagen");
      }
    }
  };

  const deleteRequirement = async (rId: any) => {
    fetch(`http://localhost:3000/requirement/deleteRequirement/${rId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => fetchRequirements())
      .catch((err) => console.error(err));
  };

  const RequirementCard = ({ requirement }: { requirement: any }) => (
    <GridItem
      colSpan={{ base: 2, md: 1 }}
      p={4}
      w="100%"
      height="100%"
      borderRadius={1}
      borderWidth={1}
    >
      <Flex justifyContent={"end"}>
        <IconButton onClick={() => deleteRequirement(requirement.id)}>
          <Icon>
            <Icon>{requirement.isDeleted ? <CgCheck /> : <BsX />}</Icon>
          </Icon>
        </IconButton>
      </Flex>
      <Flex flexDir="column" alignItems="center">
        <Text fontWeight="bold">{requirement.title}</Text>
        <Text>{requirement.description}</Text>
      </Flex>
    </GridItem>
  );

  return (
    <Box>
      <Flex flexDirection="column" m={5}>
        <Form onSubmit={handleSubmit}>
          <Flex flexDirection="column">
            <Field.Root mb={3}>
              <FieldLabel>Title</FieldLabel>
              <Textarea
                maxWidth={{ lg: "50%" }}
                value={title}
                onChange={(e) => setrequirementTitle(e.target.value)}
              />
            </Field.Root>
            <Field.Root mb={3}>
              <FieldLabel>Ausführliche Beschreibung </FieldLabel>
              <Textarea
                minWidth="100%"
                minHeight="20vh"
                value={description}
                onChange={(e) => setRequirementDescription(e.target.value)}
              />
            </Field.Root>
            <Flex alignItems="end" flexDirection="column">
              <Button type="submit" onClick={fetchRequirements}>
                Anlegen
              </Button>
            </Flex>
          </Flex>
        </Form>
        <Flex></Flex>
        {loading ? (
          <Spinner />
        ) : (
          <Flex direction={"column"}>
            <Grid templateColumns="repeat(2, 1fr)" mt={5}>
              {requirementList.filter((requirement:any )=> requirement.isDeleted == false).map((requirement, idx) => (
                <RequirementCard requirement={requirement} key={idx} />
              ))}
            </Grid>
            <Text mt={5} fontWeight={"medium"}> Inactive Kriterien:</Text>
            <Grid templateColumns="repeat(2, 1fr)" mt={5}>
              {requirementList.filter((requirement:any )=> requirement.isDeleted == true).map((requirement, idx) => (
                <RequirementCard requirement={requirement} key={idx} />
              ))}
            </Grid>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
