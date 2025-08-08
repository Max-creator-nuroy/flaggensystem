import {
  Text,
  Stack,
  Heading,
  Field,
  FieldLabel,
  Button,
  Container,
  Flex,
  Box,
} from "@chakra-ui/react";
import { Form, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  useEffect(() => {
    // Überprüfe ob Token und userId vorhanden sind
    if (!token || !userId) {
      setError("Ungültiger oder fehlender Reset-Link. Bitte fordern Sie einen neuen an.");
      return;
    }
    setIsValidToken(true);
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          userId, 
          newPassword: password 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Ihr Passwort wurde erfolgreich zurückgesetzt. Sie werden zum Login weitergeleitet...");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(data.message || "Fehler beim Zurücksetzen des Passworts");
      }
    } catch (err) {
      setError("Netzwerkfehler. Bitte versuchen Sie es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
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
            Ungültiger Link
          </Heading>
          
          <Box bg="red.100" p={3} rounded="md" mb={4} border="1px solid" borderColor="red.300">
            <Text color="red.700">{error}</Text>
          </Box>

          <Stack justify="center" color="gray.600" borderSpacing="3">
            <Text as="div" textAlign="center">
              <Link to="/login">
                <span>Zurück zum Login</span>
              </Link>
            </Text>
            <Text as="div" textAlign="center">
              <Link to="/forgotPassword">
                <span>Neuen Reset-Link anfordern</span>
              </Link>
            </Text>
          </Stack>
        </Stack>
      </Flex>
    );
  }

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
          Neues Passwort festlegen
        </Heading>
        
        <Text mb={4} color="gray.600">
          Geben Sie Ihr neues Passwort ein.
        </Text>

        <Form onSubmit={handleSubmit}>
          <Field.Root mb={3}>
            <FieldLabel>Neues Passwort</FieldLabel>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mindestens 6 Zeichen"
            />
          </Field.Root>

          <Field.Root mb={4}>
            <FieldLabel>Passwort bestätigen</FieldLabel>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Passwort wiederholen"
            />
          </Field.Root>

          <Container as="div" display="flex" justifyContent="center" mb={4}>
            <Button 
              type="submit" 
              loading={isLoading}
              disabled={!password.trim() || !confirmPassword.trim()}
            >
              {isLoading ? "Wird gespeichert..." : "Passwort ändern"}
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
