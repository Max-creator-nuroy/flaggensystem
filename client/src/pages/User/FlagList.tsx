import { useEffect, useMemo, useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Button,
  ButtonGroup,
  Input,
  Stack,
  Spinner,
  Dialog,
  Card,
  Portal,
} from "@chakra-ui/react";
import getUserFromToken from "@/services/getTokenFromLokal";

/**
 * Professionelle, responsive Flaggen-Ansicht für Kunden.
 * - KPI-Header (Total / Red / Yellow / Green)
 * - Filter (Farbe), Suche, Sortierung (neueste zuerst)
 * - Mobile Card-View + Desktop Table-View
 * - Detailbereich mit verknüpften Flaggen
 */

export default function FlagList() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<any[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [colorFilter, setColorFilter] = useState<
    "ALL" | "RED" | "YELLOW" | "GREEN"
  >("ALL");
  const [search, setSearch] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const user = token ? getUserFromToken(token) : null;

  useEffect(() => {
    if (!token || !user) return;

    fetch(`http://localhost:3000/users/getUser/${user.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((req) => req.json())
      .then((data) => {
        setFlags(
          (data.flags || []).sort(
            (a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)
          )
        );
      })
      .finally(() => setLoading(false));
  }, [token, user?.id]);


  useMemo(() => {
    if (!selectedFlag) return [];
    return flags.filter((f: any) => {
      if (f.id === selectedFlag.id) return false;
      return (
        f.escalatedFrom?.some(
          (link: any) => link.fromFlagId === selectedFlag.id
        ) ||
        f.escalatedTo?.some((link: any) => link.toFlagId === selectedFlag.id) ||
        selectedFlag.escalatedFrom?.some(
          (link: any) => link.fromFlagId === f.id
        ) ||
        selectedFlag.escalatedTo?.some((link: any) => link.toFlagId === f.id)
      );
    });
  }, [selectedFlag, flags]);

  const filteredFlags = useMemo(() => {
    return flags
      .filter((f) => (colorFilter === "ALL" ? true : f.color === colorFilter))
      .filter((f) =>
        search.trim()
          ? f.requirement?.title?.toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [flags, colorFilter, search]);

  const counts = useMemo(() => {
    const unlinked = flags.filter(
      (f) => !f.escalatedTo || f.escalatedTo.length === 0
    );

    return {
      total: unlinked.length,
      red: unlinked.filter((f) => f.color === "RED").length,
      yellow: unlinked.filter((f) => f.color === "YELLOW").length,
      green: unlinked.filter((f) => f.color === "GREEN").length,
    };
  }, [flags]);

  if (loading) {
    return (
      <Flex h="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Stack p={{ base: 4, md: 6 }}>
      {/* Titel */}
      <Heading size="lg" textAlign="center" color="teal.600">
        Deine Flaggen
      </Heading>

      {/* Filter + Search */}
      <Flex
        direction={{ base: "column", md: "row" }}
        gap={3}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
      >
        <ButtonGroup variant="outline" size="sm">
          <Button
            onClick={() => setColorFilter("ALL")}
            colorScheme={colorFilter === "ALL" ? "teal" : undefined}
          >
            Alle ({counts.total})
          </Button>
          <Button
            onClick={() => setColorFilter("RED")}
            colorScheme={colorFilter === "RED" ? "red" : undefined}
          >
            🔴 {counts.red}
          </Button>
          <Button
            onClick={() => setColorFilter("YELLOW")}
            colorScheme={colorFilter === "YELLOW" ? "yellow" : undefined}
          >
            🟡 {counts.yellow}
          </Button>
        </ButtonGroup>

        <Input
          placeholder="Nach Kriterium suchen…"
          maxW={{ base: "100%", md: "320px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="sm"
        />
      </Flex>

      <SimpleGrid columns={[1, 2]}>
        {filteredFlags
          .filter((f) => f.color !== "GREEN" && f.escalatedTo.length == 0)
          .map((flag) => (
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Card.Root
                  key={flag.id}
                  p={3}
                  m={1}
                  bg={getFlagColor(flag.color)}
                  cursor="pointer"
                  onClick={() => {
                    setSelectedFlag(flag); // Nur speichern
                  }}
                >
                  <Text>{flag.color == "YELLOW" ? "Gelb" : "Rot"}</Text>
                  <Text fontSize="sm">
                    {moment(flag.createdAt).format("DD.MM.YYYY")}
                  </Text>
                </Card.Root>
              </Dialog.Trigger>

              <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                  <Dialog.Content>
                    <Dialog.Header>
                      <Dialog.Title>Flagge</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body>
                      {selectedFlag && (
                        <>
                          {selectedFlag.escalatedFrom.length == 0 ? (
                            <Text>{selectedFlag.comment}</Text>
                          ) : (
                            collectRequirements(selectedFlag).map((req, i) => (
                              <Flex key={i} align="center" mb={3}>
                                <Flex direction="column">
                                  <Text fontWeight="medium">{req.title}</Text>
                                  <Text fontSize="sm" color="gray.500">
                                    {moment(req.date).format("DD.MM.YYYY")}
                                  </Text>
                                </Flex>
                              </Flex>
                            ))
                          )}
                        </>
                      )}
                    </Dialog.Body>
                    <Dialog.Footer>
                      <Dialog.CloseTrigger asChild>
                        <Button>Schließen</Button>
                      </Dialog.CloseTrigger>
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Positioner>
              </Portal>
            </Dialog.Root>
          ))}
      </SimpleGrid>
    </Stack>
  );
}

/* ---------- Kleine KPI Cards oben ---------- */

import { SimpleGrid } from "@chakra-ui/react";
import moment from "moment";         

function collectRequirements(
  flag: any,
  depth = 0
): { title: string; date: string }[] {
  if (!flag) return [];

  // Wenn keine weiteren Eskalationen, gib das Kriterium + Datum zurück
  if (!flag.escalatedFrom || flag.escalatedFrom.length === 0) {
    return flag.requirement?.title
      ? [{ title: flag.requirement.title, date: flag.createdAt }]
      : [];
  }

  // Sonst: rekursiv durch die Eltern-Flaggen gehen
  return flag.escalatedFrom.flatMap((link: any) =>
    collectRequirements(link.fromFlag, depth + 1)
  );
}

const getFlagColor = (color: string) => {
  switch (color) {
    case "RED":
      return "red.100";
    case "YELLOW":
      return "yellow.100";
    default:
      return "gray.100";
  }
};
