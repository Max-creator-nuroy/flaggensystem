import getUserFromToken from "@/services/getTokenFromLokal";
import {
  Box,
  Stack,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Input,
  Flex,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useSearchParams } from "react-router";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);
  const [userData, setUserData] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [dailyCheckList, setDailCheckList] = useState<any[]>([]);
  const [coach, setCoach] = useState<any>(null);
  const [requirementList, setRequirementList] = useState<any[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");

  useEffect(() => {
    const uid = userIdParam == null ? user.id : userIdParam;

    fetch(`http://localhost:3000/users/getUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((req) => req.json())
      .then((data) => {
        setUserData(data);
        setFlags(data.flags || []);
        setDailCheckList(data.dailyChecks || []);
      });

    fetch(`http://localhost:3000/users/getCoachByUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((coachData) => {
        setCoach(coachData);

        return fetch(
          `http://localhost:3000/requirement/getRequirementByCoach/${coachData.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      })
      .then((response) => response.json())
      .then((reqData) => {
        setRequirementList(reqData.requirement || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (!videoFile) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("video", videoFile);

      const res = await fetch(
        `http://localhost:3000/dailyCheck/createDailyCheck/${user.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Fehler beim Erstellen des DailyChecks");

      const result = await res.json();
      console.log("Antwort vom Server:", result);

      // Optional: Daten nachladen
      refreshDailyChecks();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDailyChecks = async () => {
    const uid = userIdParam == null ? user.id : userIdParam;
    const res = await fetch(`http://localhost:3000/users/getUser/${uid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setDailCheckList(data.dailyChecks || []);
    setFlags(data.flags || []);
  };

  if (loading) {
    return (
      <Flex w="100%" h="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  const flagCount = flags.length;
  const guarantee = getGuaranteeStatus(flagCount);
  const isAffiliate = !!userData?.isAffiliate;
  const leads = userData?.leads ?? [];

  const passedIn7Days = dailyCheckList.slice(0, 7).reduce((acc, dc) => {
    const total = dc.entries.length;
    const passed = dc.entries.filter((e: any) => e.fulfilled).length;
    return acc + (total > 0 && passed === total ? 1 : 0);
  }, 0);

  return (
    <Stack>
      <Heading
        mt={5}
        size="lg"
        fontWeight="700"
        mb={4}
        textAlign="center"
        fontFamily="'Georgia', serif"
        letterSpacing="wider"
        color="#2C7A7B"
      >
        {userIdParam == null ? "Willkommen zurück,":"Profil von " }{userData?.name}
      </Heading>

      {/* Profil, Garantie, Coach */}
      <SimpleGrid columns={{ base: 1, md: 3 }}>
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Profil</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              <b>Name:</b> {userData?.name} {userData?.last_name}
            </Text>
            <Text>
              <b>E-Mail:</b> {userData?.email}
            </Text>
            {userData?.mobileNumber && (
              <Text>
                <b>Telefon:</b> {userData?.mobileNumber}
              </Text>
            )}
          </CardBody>
        </Card.Root>

        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Garantie</Heading>
          </CardHeader>
          <CardBody>
            <Badge colorScheme={guarantee.color} fontSize="lg">
              {guarantee.text}
            </Badge>
            <Text mt={2}>{flagCount} Flaggen</Text>
          </CardBody>
        </Card.Root>

        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Coach</Heading>
          </CardHeader>
          <CardBody>
            {coach ? (
              <>
                <Text>
                  {coach.name} {coach.last_name}
                </Text>
                <Text>{coach.email}</Text>
              </>
            ) : (
              <Text>Kein Coach zugewiesen</Text>
            )}
          </CardBody>
        </Card.Root>
      </SimpleGrid>
      {/* Video Upload + Kriterien */}
      {userIdParam == null ? (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Video hochladen</Heading>
          </CardHeader>
          <CardBody>
            <Stack spaceX={4}>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              <Button colorScheme="blue" onClick={handleSubmit}>
                Absenden
              </Button>

              <Heading size="sm">Zu beachten</Heading>
              <VStack align="start">
                {requirementList.length === 0 ? (
                  <Text>Keine Kriterien vorhanden.</Text>
                ) : (
                  requirementList
                    .filter((re: any) => re.isDeleted != true)
                    .map((req) => (
                      <Flex key={req.id} align="center">
                        <FiCheckCircle color="green.500" />
                        <Text>{req.title}</Text>
                      </Flex>
                    ))
                )}
              </VStack>
            </Stack>
          </CardBody>
        </Card.Root>
      ) : (
        ""
      )}

      {/* Daily Checks */}
      <Card.Root shadow={"sm"}>
        <CardHeader>
          <Heading size="md">Daily Checks (letzte 7)</Heading>
        </CardHeader>
        <CardBody>
          {dailyCheckList.length === 0 ? (
            <Text>Keine Daily Checks vorhanden.</Text>
          ) : (
            <>
              <Text mb={3}>
                Vollständig bestanden: <b>{passedIn7Days}</b> /{" "}
                {Math.min(7, dailyCheckList.length)}
              </Text>
              <VStack align="start" spaceX={2}>
                {dailyCheckList.slice(0, 7).map((dc) => (
                  <Flex key={dc.id} justify="space-between" w="100%">
                    <Text>{new Date(dc.date).toLocaleDateString("de-DE")}</Text>
                    <Text>
                      {dc.entries.filter((e: any) => e.fulfilled).length} /{" "}
                      {dc.entries.length}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </>
          )}
        </CardBody>
      </Card.Root>

      {/* Flags */}
      {flags.length > 0 && (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Deine Flaggen</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="start" spaceX={2}>
              {flags.slice(0, 5).map((f) => (
                <Flex key={f.id} justify="space-between" w="100%">
                  <Text>{f.requirement?.title ?? "—"}</Text>
                  <Badge colorScheme={f.color.toLowerCase()}>{f.color}</Badge>
                </Flex>
              ))}
              {flags.length > 5 && (
                <Text fontSize="sm" color="gray.500">
                  … und {flags.length - 5} weitere
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card.Root>
      )}

      {/* Affiliate */}
      {isAffiliate && (
        <Card.Root shadow={"sm"}>
          <CardHeader>
            <Heading size="md">Affiliate – Leads</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              <b>Gesamt:</b> {leads.length}
            </Text>
            {leads.length === 0 ? (
              <Text>Keine Leads vorhanden.</Text>
            ) : (
              <VStack align="start" spaceX={2}>
                {leads.map((l: any) => (
                  <Flex key={l.id} justify="space-between" w="100%">
                    <Text>{l.name}</Text>
                    <Badge colorScheme={l.closed ? "green" : "yellow"}>
                      {l.closed ? "Closed" : l.stage?.name ?? "—"}
                    </Badge>
                  </Flex>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card.Root>
      )}

      
    </Stack>
  );
}

function getGuaranteeStatus(flagCount: number) {
  if (flagCount >= 10) return { text: "❌ Garantie verloren", color: "red" };
  if (flagCount >= 5) return { text: "⚠️ Garantie gefährdet", color: "orange" };
  return { text: "✅ Garantie aktiv", color: "green" };
}
