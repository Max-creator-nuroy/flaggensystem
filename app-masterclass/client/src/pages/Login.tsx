import { Center, Box, Text } from "@chakra-ui/react";

export default function Login() {
  return (
    <Center h="100vh" bg="gray.50">
      <Box p={8} bg="white" boxShadow="md" borderRadius="md">
        <Text fontSize="xl" fontWeight="bold">
          Login Page
        </Text>
      </Box>
    </Center>
  );
}
