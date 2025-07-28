import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Input,
  Icon,
  Stack,
  Table,
  VStack,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import {
  useColorModeValue,
} from "@/components/ui/color-mode"
import { BsFlag } from "react-icons/bs";
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
  const [userData, setUserData] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [colorFilter, setColorFilter] = useState<"ALL" | "RED" | "YELLOW" | "GREEN">("ALL");
  const [search, setSearch] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
        setUserData(data);
        setFlags((data.flags || []).sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      })
      .finally(() => setLoading(false));
  }, [token, user?.id]);

  const hasConnections = (flag: any) =>
    (flag.escalatedFrom && flag.escalatedFrom.length > 0) ||
    (flag.escalatedTo && flag.escalatedTo.length > 0);

  const relatedFlags = useMemo(() => {
    if (!selectedFlag) return [];
    return flags.filter((f: any) => {
      if (f.id === selectedFlag.id) return false;
      return (
        f.escalatedFrom?.some((link: any) => link.fromFlagId === selectedFlag.id) ||
        f.escalatedTo?.some((link: any) => link.toFlagId === selectedFlag.id) ||
        selectedFlag.escalatedFrom?.some((link: any) => link.fromFlagId === f.id) ||
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

  const counts = useMemo(
    () => ({
      total: flags.length,
      red: flags.filter((f) => f.color === "RED").length,
      yellow: flags.filter((f) => f.color === "YELLOW").length,
      green: flags.filter((f) => f.color === "GREEN").length,
    }),
    [flags]
  );

  const badgeColor = (color: string) =>
    color === "RED" ? "red" : color === "YELLOW" ? "yellow" : "green";

  const cardBg = useColorModeValue("white", "gray.700");
  const subtleBg = useColorModeValue("gray.50", "gray.800");
  const borderCol = useColorModeValue("gray.200", "gray.600");

  if (loading) {
    return (
      <Flex h="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Stack spaceX={6} p={{ base: 4, md: 6 }}>
      {/* Titel */}
      <Heading size="lg" textAlign="center" color="teal.600">
        Deine Flaggen
      </Heading>

      {/* KPI Cards */}
      <SimpleKPICards counts={counts} />

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
          <Button
            onClick={() => setColorFilter("GREEN")}
            colorScheme={colorFilter === "GREEN" ? "green" : undefined}
          >
            🟢 {counts.green}
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

      {/* Desktop Table */}
      <Box
        display={{ base: "none", md: "block" }}
        borderWidth="1px"
        borderColor={borderCol}
        rounded="md"
        overflow="hidden"
      >
        <Table.Root size="sm" stickyHeader interactive>
          <Table.Header bg={subtleBg}>
            <Table.Row>
              <Table.ColumnHeader w="40%">Kriterium</Table.ColumnHeader>
              <Table.ColumnHeader w="15%">Farbe</Table.ColumnHeader>
              <Table.ColumnHeader w="15%">Verknüpft</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" w="30%">
                Datum
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredFlags.map((flag: any) => {
              const clickable = hasConnections(flag);
              return (
                <Table.Row
                  key={flag.id}
                  onClick={() => (clickable ? setSelectedFlag(flag) : undefined)}
                  cursor={clickable ? "pointer" : "default"}
                  _hover={clickable ? { bg: subtleBg } : undefined}
                >
                  <Table.Cell>{flag.requirement?.title ?? "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge colorScheme={badgeColor(flag.color)}>{flag.color}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {clickable ? (
                      <Badge colorScheme="blue">Ja</Badge>
                    ) : (
                      <Badge colorScheme="gray">Nein</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {new Date(flag.createdAt).toLocaleDateString("de-DE")}
                  </Table.Cell>
                </Table.Row>
              );
            })}

            {filteredFlags.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={4}>
                  <Text py={4} textAlign="center" color="gray.500">
                    Keine Flaggen gefunden.
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Mobile Cards */}
      <VStack spaceX={3} display={{ base: "flex", md: "none" }}>
        {filteredFlags.length === 0 && (
          <Text py={4} textAlign="center" color="gray.500" w="100%">
            Keine Flaggen gefunden.
          </Text>
        )}

        {filteredFlags.map((flag: any) => {
          const clickable = hasConnections(flag);
          return (
            <Box
              key={flag.id}
              w="100%"
              p={4}
              bg={cardBg}
              borderWidth="1px"
              borderColor={borderCol}
              rounded="md"
              onClick={() => (clickable ? setSelectedFlag(flag) : undefined)}
              cursor={clickable ? "pointer" : "default"}
            >
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon as={BsFlag} color={`${badgeColor(flag.color)}.400`} />
                  <Badge colorScheme={badgeColor(flag.color)}>{flag.color}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {new Date(flag.createdAt).toLocaleDateString("de-DE")}
                </Text>
              </HStack>
              <Text fontWeight="semibold">
                {flag.requirement?.title ?? "—"}
              </Text>
              {clickable && (
                <Text mt={1} fontSize="xs" color="blue.500">
                  Verknüpfungen anzeigen
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>

      {/* Detailansicht verknüpfter Flaggen */}
      {selectedFlag && (
        <Box mt={10}>
          <Flex justify="space-between" align="center" mb={2}>
          <Heading size="md">
              Verknüpfte Flaggen zu: {selectedFlag.requirement?.title ?? "—"}
            </Heading>
            <Button size="sm" variant="ghost" onClick={() => setSelectedFlag(null)}>
              Schließen
            </Button>
          </Flex>

          {relatedFlags.length === 0 ? (
            <Text color="gray.500">Keine Verknüpfungen gefunden.</Text>
          ) : (
            <Box
              borderWidth="1px"
              borderColor={borderCol}
              rounded="md"
              overflow="hidden"
            >
              <Table.Root size="sm">
                <Table.Header bg={subtleBg}>
                  <Table.Row>
                    <Table.ColumnHeader>Kriterium</Table.ColumnHeader>
                    <Table.ColumnHeader>Farbe</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Datum</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {relatedFlags.map((flag: any) => (
                    <Table.Row key={flag.id}>
                      <Table.Cell>{flag.requirement?.title ?? "—"}</Table.Cell>
                      <Table.Cell>
                        <Badge colorScheme={badgeColor(flag.color)}>
                          {flag.color}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {new Date(flag.createdAt).toLocaleDateString("de-DE")}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>
      )}
    </Stack>
  );
}

/* ---------- Kleine KPI Cards oben ---------- */

import { SimpleGrid } from "@chakra-ui/react";

function SimpleKPICards({
  counts,
}: {
  counts: { total: number; red: number; yellow: number; green: number };
}) {
  const cardBg = useColorModeValue("white", "gray.700");
  const borderCol = useColorModeValue("gray.200", "gray.600");

  const items = [
    { label: "Gesamt", value: counts.total, color: "teal.500" },
    { label: "Rot", value: counts.red, color: "red.500" },
    { label: "Gelb", value: counts.yellow, color: "yellow.500" },
    { label: "Grün", value: counts.green, color: "green.500" },
  ];

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      {items.map((it) => (
        <Box
          key={it.label}
          p={4}
          bg={cardBg}
          borderWidth="1px"
          borderColor={borderCol}
          rounded="md"
        >
          <Text fontSize="sm" color="gray.500">
            {it.label}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color={it.color}>
            {it.value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

