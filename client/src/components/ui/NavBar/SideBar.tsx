import { Flex, IconButton } from "@chakra-ui/react";
import { useState } from "react";
import { FiHome, FiMenu } from "react-icons/fi";
import NavItem from "./NavItem";
import {
  BsExclamation,
  BsFlag,
  BsPeople,
  BsPerson,
  BsQuestion,
} from "react-icons/bs";
import getUserFromToken from "@/services/getTokenFromLokal";
import { LuLogOut } from "react-icons/lu";
import { FcStatistics } from "react-icons/fc";
// import jwtDecode from "jwt-decode";

export default function SideBar() {
  const [navSize, changeNavSize] = useState("small");
  const token = localStorage.getItem("token");
  const user = getUserFromToken(token);

  const CoachSideBar = () => {
    return (
      <Flex
        pl="5%"
        flexDir={{ base: navSize == "small" ? "" : "column", md: "column" }}
        alignItems={navSize == "small" ? "center" : "flex-start"}
        as="nav"
      >
        <IconButton
          mt={{ base: "1", md: "5" }}
          onClick={() => {
            if (navSize == "small") changeNavSize("large");
            else changeNavSize("small");
          }}
        >
          <FiMenu />
        </IconButton>
        <NavItem
          navSize={navSize}
          icon={FiHome}
          title="Home"
          target="dashboard/COACH"
        />
        {/* <NavItem
          navSize={navSize}
          icon={FcStatistics}
          title="Statistik"
          target="statistic"
        /> */}
        <NavItem
          navSize={navSize}
          icon={BsQuestion}
          title="Fragen"
          target="survey/surveyAnswers"
        />

        <NavItem
          navSize={navSize}
          icon={BsExclamation}
          title="Kriterien"
          target="requirement"
        />
        <NavItem
          navSize={navSize}
          icon={BsPeople}
          title="Kunden"
          target="customerList"
        />
        <NavItem
          navSize={navSize}
          icon={LuLogOut}
          title="Logout"
          target="login"
        />
      </Flex>
    );
  };

  const AdminSideBar = () => {
    return (
      <Flex
        pl="5%"
        flexDir={{ base: navSize == "small" ? "" : "column", md: "column" }}
        alignItems={navSize == "small" ? "center" : "flex-start"}
        as="nav"
      >
        <IconButton
          mt={{ base: "1", md: "5" }}
          onClick={() => {
            if (navSize == "small") changeNavSize("large");
            else changeNavSize("small");
          }}
        >
          <FiMenu />
        </IconButton>
        <NavItem
          navSize={navSize}
          icon={FiHome}
          title="Home"
          target="dashboard/ADMIN"
        />
        {/* <NavItem
          navSize={navSize}
          icon={FcStatistics}
          title="Statistik"
          target="statistic"
        /> */}
        <NavItem
          navSize={navSize}
          icon={BsQuestion}
          title="Fragen"
          target="survey/surveyAnswers"
        />
        <NavItem
          navSize={navSize}
          icon={BsPeople}
          title="Kunden"
          target="customerList/ADMIN"
        />
        <NavItem
          navSize={navSize}
          icon={LuLogOut}
          title="Logout"
          target="login"
        />
      </Flex>
    );
  };

  const CustomerSideBar = () => {
    return (
      <Flex
        pl="5%"
        flexDir={{ base: navSize == "small" ? "" : "column", md: "column" }}
        alignItems={navSize == "small" ? "center" : "flex-start"}
        as="nav"
      >
        <IconButton
          mt={{ base: "1", md: "5" }}
          boxShadow="10px 8px 12px 10px rgba(0, 0, 0, 0.05)"
          onClick={() => {
            if (navSize == "small") changeNavSize("large");
            else changeNavSize("small");
          }}
        >
          <FiMenu />
        </IconButton>
        <NavItem
          navSize={navSize}
          icon={FiHome}
          title="Home"
          target="dashboard/CUSTOMER"
        />
        <NavItem
          navSize={navSize}
          icon={BsQuestion}
          title="Fragen"
          target="survey"
        />
        <NavItem
          navSize={navSize}
          icon={BsFlag}
          title="Flaggen"
          target="flagList"
        />
        {user.isAffiliate ? (
          <NavItem
            navSize={navSize}
            icon={BsPerson}
            title="Leads"
            target="leadList"
          />
        ) : (
          ""
        )}
        <NavItem
          navSize={navSize}
          icon={LuLogOut}
          title="Logout"
          target="login"
        />
      </Flex>
    );
  };

  return (
    <Flex
      pos="sticky"
      left="5"
      h={{ md: "100%" }}
      w={{ md: navSize == "small" ? "75px" : "200px" }}
      flexDir="column"
      justifyContent="space-between"
    >
      {user?.role === "COACH" && <CoachSideBar />}
      {user?.role === "ADMIN" && <AdminSideBar />}
      {user?.role === "CUSTOMER" && <CustomerSideBar />}
    </Flex>
  );
}
