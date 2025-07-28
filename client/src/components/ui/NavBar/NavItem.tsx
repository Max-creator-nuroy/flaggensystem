import { Button, Flex, Icon, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";

type NavItemProps = {
  navSize: any;
  icon: any;
  title: string;
  active?: any;
  target: any;
};

export function logout() {
  localStorage.removeItem("token"); // Token löschen
  localStorage.removeItem("user"); // Optional, falls du auch User speicherst
  window.location.href = "/login"; // Zurück zum Login
}

export default function NavItem({
  navSize,
  icon,
  title,
  active,
  target,
}: NavItemProps) {
  return (
    <Flex
      mt={{ base: navSize ? 1 : 0, md: 30 }}
      flexDir="column"
      w="100%"
      alignItems={navSize == "small" ? "center" : "flex-start"}
    >
      <Link to={"/" + target} style={{ textDecoration: "none" }}>
        <Button
          bg={active && "blue.400"}
          p={3}
          borderRadius={8}
          _hover={{ textDecor: "none", backgroundColor: "blue.400" }}
          w={navSize == "large" ? "100%" : undefined}
          onClick={target == "login" ? logout : undefined}
        >
          <Icon
            as={icon}
            fontSize="xl"
            color={active ? "blue.400" : "gray.400"}
          ></Icon>
          <Text ml={5} display={navSize == "small" ? "none" : "flex"}>
            {title}
          </Text>
        </Button>
      </Link>
    </Flex>
  );
}
