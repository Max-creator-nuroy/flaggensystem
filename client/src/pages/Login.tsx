import {
  Text,
  Stack,
  Heading,
  Field,
  Input,
  Button,
  Flex
} from "@chakra-ui/react";
import { Form, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import getUserFromToken from "@/services/getTokenFromLokal";
import { toaster } from "@/components/ui/toaster";

export default function Login() {
  const navigate = useNavigate();
  const [email, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    let toastId: any;
    try {
      toastId = toaster.create({ title: "Login…", type: "loading" });
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        const user = getUserFromToken(data.token);
        toaster.create({
          title: "Login erfolgreich",
          description: `Willkommen ${user.name || ""}`,
          type: "success",
        });
        navigate(`/dashboard/${user.role}`);
      } else {
        const data = await res.json();
        const msg = data.message || "Login fehlgeschlagen";
        setError(msg);
        toaster.create({ title: "Login fehlgeschlagen", description: msg, type: "error" });
      }
    } catch (err: any) {
      const msg = "Netzwerkfehler";
      setError(msg);
      toaster.create({ title: "Fehler", description: msg, type: "error" });
    } finally {
      if (toastId) toaster.dismiss(toastId);
      setSubmitting(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      bgGradient="linear(to-br, #0b1220, #0a0f18)"
      align="center"
      justify="center"
      px={4}
    >
      <Stack
        as="section"
        maxW="md"
        w="full"
        
        p={{ base: 6, md: 8 }}
        rounded="xl"
        bg="var(--color-surface)"
        borderWidth="1px"
        borderColor="var(--color-border)"
        boxShadow="xl"
      >
        <Stack  textAlign="center">
          <Heading as="h1" size="lg">Log in</Heading>
          <Text color="var(--color-muted)">Melde dich mit deinen Zugangsdaten an.</Text>
        </Stack>

        <Form onSubmit={handleSubmit}>
          <Field.Root mb={3}>
            <Field.Label>E-Mail Adresse</Field.Label>
            <Input
              type="email"
              placeholder="email@example.de"
              value={email}
              onChange={(e) => setUsername(e.target.value)}
              bg="var(--color-surface)"
              borderColor="var(--color-border)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Passwort</Field.Label>
            <PasswordInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field.Root>

          {error && (
            <Text mt={3} color="red.400" textAlign="center">{error}</Text>
          )}

          <Button mt={5} type="submit" w="full" colorScheme="teal" loading={submitting}>
            Anmelden
          </Button>
        </Form>

        <Stack justify="center" color="gray.400">
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
