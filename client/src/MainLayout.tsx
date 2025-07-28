import { Outlet } from "react-router-dom";
import { Grid, GridItem } from "@chakra-ui/react";
import Navbar from "./components/ui/NavBar/Navbar";
import SideBar from "./components/ui/NavBar/SideBar";

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <Grid templateColumns="repeat(10, 1fr)">
        <GridItem colSpan={{ base: 10, md: 1 }}>
          <SideBar />
        </GridItem>
        <GridItem colSpan={{ base: 10, md: 9 }}>
          <Outlet /> {/* Hier kommt der aktuelle Page-Content */}
        </GridItem>
      </Grid>
    </>
  );
}
