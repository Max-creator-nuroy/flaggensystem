import {
  Text,
  Stack,
  Heading,
  Field,
  FieldLabel,
  Input,
  Button,
  Container,
  Flex,
  Box,
} from "@chakra-ui/react";
import { Form, Link } from "react-router-dom";
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Eine E-Mail mit einem Reset-Link wurde an Ihre E-Mail-Adresse gesendet.");
      } else {
        setError(data.message || "Fehler beim Senden der E-Mail");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      h="100vh"
      bg="gray.200"
      align="center"
      justify="center"
      flexDirection="column"
    >
      <Stack boxShadow="md" bg="blue.300" p="20" rounded="sm" display="flex">
        <Heading as="h1" display="flex" mb={4}>
          Passwort vergessen
        </Heading>
        
        <Text mb={4} color="gray.600">
          Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
        </Text>

        <Form onSubmit={handleSubmit}>
          <Field.Root mb={4}>
            <FieldLabel>E-Mail Adresse</FieldLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ihre.email@example.com"
            />
          </Field.Root>

          <Container as="div" display="flex" justifyContent="center" mb={4}>
            <Button 
              type="submit" 
              loading={isLoading}
              disabled={!email.trim()}
            >
              {isLoading ? "Wird gesendet..." : "Reset-Link senden"}
            </Button>
          </Container>

          {message && (
            <Box bg="green.100" p={3} rounded="md" mb={4} border="1px solid" borderColor="green.300">
              <Text color="green.700">{message}</Text>
            </Box>
          )}

          {error && (
            <Box bg="red.100" p={3} rounded="md" mb={4} border="1px solid" borderColor="red.300">
              <Text color="red.700">{error}</Text>
            </Box>
          )}
        </Form>

        <Stack justify="center" color="gray.600" borderSpacing="3">
          <Text as="div" textAlign="center">
            <Link to="/login">
              <span>Zurück zum Login</span>
            </Link>
          </Text>
        </Stack>
      </Stack>
    </Flex>
  );
}
