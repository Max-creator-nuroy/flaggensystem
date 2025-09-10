import { Outlet } from "react-router-dom";
import { Grid, GridItem, Box } from "@chakra-ui/react";
import Navbar from "./components/ui/NavBar/Navbar";
import SideBar from "./components/ui/NavBar/SideBar";
import { Toaster } from "./components/ui/toaster";

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <Grid templateColumns="repeat(10, 1fr)">
        <GridItem colSpan={{ base: 10, md: 1 }}>
          <SideBar />
        </GridItem>
        <GridItem colSpan={{ base: 10, md: 9 }}>
          <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6} w="100%">
            <Outlet /> {/* Hier kommt der aktuelle Page-Content */}
          </Box>
          <Toaster />
        </GridItem>
      </Grid>
    </>
  );
}
