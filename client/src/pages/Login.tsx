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
} from "@chakra-ui/react";
import { Form, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import getUserFromToken from "@/services/getTokenFromLokal";

export default function Login() {
  const navigate = useNavigate();
  const [email, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      const user = getUserFromToken(data.token);
      navigate(`/dashboard/${user.role}`)
    } else {
      const data = await res.json();
      setError(data.message || "Login fehlgeschlagen");
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
        <Heading as="h1" display="flex">
          Log in
        </Heading>
        <Form onSubmit={handleSubmit}>
          <Field.Root mb={3}>
            <FieldLabel>E-Mail Adresse</FieldLabel>
            <Input
              type="text"
              value={email}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field.Root>

          <Field.Root>
            <FieldLabel>Passwort</FieldLabel>
            <PasswordInput
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field.Root>
          <Container as="div" display="flex" justifyContent="center">
            <Button mt={5} type="submit">
              Anmelden
            </Button>
          </Container>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </Form>

        <Stack justify="center" color="gray.600" borderSpacing="3">
          <Text as="div" textAlign="center">
            <Link to="forgotPassword">
              <span>Passwort vergessen?</span>
            </Link>
          </Text>
        </Stack>
      </Stack>
    </Flex>
  );
}
