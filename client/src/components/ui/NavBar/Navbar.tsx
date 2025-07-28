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

export default function Navbar() {
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  return (
    <Flex
      as="nav"
      p="10px"
      alignItems="center"
      gap="20px"
      bg="#2C7A7B" 
      boxShadow="10px 8px 12px 10px rgba(0, 0, 0, 0.05)"
      borderWidth={1}
    >
      <Heading as="h2">Flaggensystem</Heading>
      <Spacer />
      <Text>
        {user.name} {user.last_name}
      </Text>
      <Link to="/profile" style={{ textDecoration: "none" }}>
        <Button colorScheme="blue" bg="none">
          <Icon as={CgProfile}></Icon>
        </Button>
      </Link>
      {/* <ColorModeButton />  Irgendwann mal Implemetieren*/}
    </Flex>
  );
}
