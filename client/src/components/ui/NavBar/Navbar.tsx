import {
  Button,
  Flex,
  Heading,
  Icon,
  Spacer,
  Text,
} from "@chakra-ui/react";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";
import getUserFromToken from "@/services/getTokenFromLokal";
import { useLayoutEffect, useRef } from "react";

export default function Navbar() {
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);
  const ref = useRef<HTMLDivElement | null>(null);

  // Update a CSS var with the navbar height so other layout pieces can consume it
  useLayoutEffect(() => {
    const updateVar = () => {
      const h = ref.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--navbar-height", `${h}px`);
    };
    updateVar();
    window.addEventListener("resize", updateVar);
    return () => window.removeEventListener("resize", updateVar);
  }, []);

  return (
    <Flex
      ref={ref}
      as="nav"
      p="10px"
      alignItems="center"
      gap="20px"
      bg="var(--color-surface)"
      boxShadow="10px 8px 12px 10px rgba(0, 0, 0, 0.05)"
      borderWidth={1}
      position={{ base: "static", md: "sticky" }}
      top={{ base: undefined, md: 0 }}
      zIndex={{ base: "auto", md: 1000 }}
    >
      <Heading as="h2">Flaggensystem</Heading>
      <Spacer />
      <Text>
        {user?.name} {user?.last_name}
      </Text>
      <Link to="/profilePage" style={{ textDecoration: "none" }}>
        <Button colorScheme="blue" bg="none">
          <Icon as={CgProfile}></Icon>
        </Button>
      </Link>
      {/* <ColorModeButton />  Irgendwann mal Implemetieren*/}
    </Flex>
  );
}
