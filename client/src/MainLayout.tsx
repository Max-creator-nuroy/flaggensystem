import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Grid, GridItem, Box, Button, Icon, Flex } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import Navbar from "./components/ui/NavBar/Navbar";
import SideBar from "./components/ui/NavBar/SideBar";
import { Toaster } from "./components/ui/toaster";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackClick = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback: navigate to dashboard based on user role or login
      navigate('/dashboard/CUSTOMER');
    }
  };

  // Don't show back button on main dashboard pages (without userId) or login-related pages
  const hiddenPaths = ['/login', '/forgotPassword', '/resetPassword'];
  const isDashboardWithoutUserId = 
    (location.pathname === '/dashboard/CUSTOMER' || 
     location.pathname === '/dashboard/COACH' || 
     location.pathname === '/dashboard/ADMIN') && 
    !location.search.includes('userId=');
  
  const shouldShowBackButton = !hiddenPaths.includes(location.pathname) && !isDashboardWithoutUserId;

  return (
    <>
      <Navbar />
      <Grid templateColumns="repeat(10, 1fr)">
        <GridItem colSpan={{ base: 10, md: 1 }}>
          <SideBar />
        </GridItem>
        <GridItem colSpan={{ base: 10, md: 9 }}>
          <Box maxW="7xl" mx="auto" px={{ base: 3, md: 6 }} py={6} w="100%">
            {shouldShowBackButton && (
              <Flex mb={4}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackClick}
                  color="var(--color-muted)"
                  _hover={{ 
                    bg: "var(--color-surface)", 
                    color: "var(--color-text)",
                    transform: "translateX(-2px)" 
                  }}
                  transition="all 0.2s"
                >
                  <Icon as={FiArrowLeft} mr={2} />
                  Zurück
                </Button>
              </Flex>
            )}
            <Outlet /> {/* Hier kommt der aktuelle Page-Content */}
          </Box>
          <Toaster />
        </GridItem>
      </Grid>
    </>
  );
}
