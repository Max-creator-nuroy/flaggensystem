import getUserFromToken from "@/services/getTokenFromLokal";
import { Button, Flex, Text } from "@chakra-ui/react";
import { Link, Outlet } from "react-router";

export default function Survey() {
  const token = localStorage.getItem("token");
  const coach = getUserFromToken(token);

  const isCoach = coach.role == "COACH";

  return (
    <Flex flexDirection={"column"}>
      <Flex flexDirection={"column"} alignItems={"center"} m={5}>
        <Flex flexWrap="wrap" spaceX={2}>
          {
            isCoach ?
            <Link to={"/survey/currentSurvey"} style={{ textDecoration: "none" }}>
            <Button>
              <Text>Deine Umfrage</Text>
            </Button>
          </Link>:""
          }
          <Link to={"/survey/surveyAnswers"} style={{ textDecoration: "none" }}>
            <Button>
              <Text>{isCoach ? "Kunden Umfragen" : "Coach Umfragen"}</Text>
            </Button>
          </Link>
          <Link to={"/survey/questions"} style={{ textDecoration: "none" }}>
            <Button>
              <Text>Fragen erstellen</Text>
            </Button>
          </Link>
        </Flex>
      </Flex>

      <Outlet></Outlet>
    </Flex>
  );
}
