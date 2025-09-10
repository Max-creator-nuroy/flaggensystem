import { useState } from "react";
import { FiHome, FiMenu, FiX } from "react-icons/fi";
import { BsExclamation, BsFlag, BsPeople, BsPerson, BsQuestion } from "react-icons/bs";
import { LuLogOut } from "react-icons/lu";
import getUserFromToken from "@/services/getTokenFromLokal";
import NavItem, { logout } from "./NavItem";
import { Box, Flex, IconButton, Text, useDisclosure } from "@chakra-ui/react";

type Item = { label: string; to: string; icon: any; show?: boolean };

export default function SideBar() {
  const [collapsed, setCollapsed] = useState(true);
  const token = localStorage.getItem('token');
  const user = getUserFromToken(token);
  const mobile = useDisclosure();

  const baseItems: Record<string, Item[]> = {
    ADMIN: [
      { label: 'Home', to: 'dashboard/ADMIN', icon: FiHome },
      { label: 'Fragen', to: 'survey/surveyAnswers', icon: BsQuestion },
      { label: 'Kunden', to: 'customerList/ADMIN', icon: BsPeople },
      { label: 'Statistiken', to: 'statistic', icon: BsFlag },
    ],
    COACH: [
      { label: 'Home', to: 'dashboard/COACH', icon: FiHome },
      { label: 'Fragen', to: 'survey/surveyAnswers', icon: BsQuestion },
      { label: 'Kriterien', to: 'requirement', icon: BsExclamation },
      { label: 'Kunden', to: 'customerList', icon: BsPeople },
  { label: 'Nachrichten', to: 'inbox/coach', icon: BsFlag },
      // Coach 'Statistiken' removed
    ],
    CUSTOMER: [
      { label: 'Home', to: 'dashboard/CUSTOMER', icon: FiHome },
      { label: 'Fragen', to: 'survey', icon: BsQuestion, show: user?.isCustomer },
      { label: 'Flaggen', to: 'flagList', icon: BsFlag, show: user?.isCustomer},
      { label: 'Leads', to: 'leadList', icon: BsPerson, show: user?.isAffiliate },
    ]
  };

  const items = baseItems[user?.role] || [];

  const renderContent = (isCollapsed: boolean, showToggle = true) => (
    <Flex direction="column" h="100%" minH={0} py={4} gap={1}>
      <Flex align="center" justify={isCollapsed ? 'center' : 'space-between'} px={isCollapsed ? 2 : 4} mb={4}>
        {!isCollapsed && <Text fontWeight="bold" fontSize="lg">Menu</Text>}
        {showToggle && (
          <IconButton size="sm" variant="ghost" aria-label="Toggle sidebar" onClick={() => setCollapsed(c => !c)}>
            <FiMenu />
          </IconButton>
        )}
      </Flex>
      <Flex direction="column" flex="1 1 auto" minH={0} overflowY="auto" px={isCollapsed ? 1 : 2}>
        {items.filter(i => i.show === undefined || i.show).map(i => (
          <NavItem key={i.to} collapsed={isCollapsed} icon={i.icon} label={i.label} to={i.to} />
        ))}
      </Flex>
      <Box h="1px" bg="var(--color-border)" my={3} mx={isCollapsed ? 1 : 2} borderRadius="full" />
      <Box px={isCollapsed ? 1 : 2} pb={2}>
        <NavItem collapsed={isCollapsed} icon={LuLogOut} label="Logout" to="login" onClick={logout} />
      </Box>
    </Flex>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Box
        position={{ base: 'static', md: 'sticky' }}
        top={{ base: undefined, md: 'var(--navbar-height, 0px)' }}
        h={{ base: 'auto', md: 'calc(100vh - var(--navbar-height, 0px))' }}
        display={{ base: 'none', md: 'block' }}
        w={collapsed ? '72px' : '220px'}
        transition="width 0.25s"
        bg="var(--color-surface)"
        borderRightWidth="1px"
        shadow="sm"
        overflow="hidden"
      >
        {renderContent(collapsed, true)}
      </Box>

      {/* Mobile toggle button under Navbar */}
      <Box display={{ base: 'block', md: 'none' }} w="100%" px={3} py={2}>
        <IconButton
          size="sm"
          w="auto"
          aria-label="Open menu"
          onClick={mobile.onOpen}
        >
          <FiMenu />
        </IconButton>
      </Box>

      {/* Mobile Top Panel */}
      {mobile.open && (
        <Box position="fixed" inset={0} zIndex={999} display={{ base: 'block', md: 'none' }}>
          <Box position="absolute" inset={0} bg="blackAlpha.400" onClick={mobile.onClose} />
          <Box position="relative" w='100vw' maxH='80vh' bg='var(--color-surface)' shadow='lg' borderBottomWidth="1px" borderColor="var(--color-border)">
            <Flex justify="flex-end" p={2}>
              <IconButton size="sm" aria-label="Close menu" onClick={mobile.onClose}>
                <FiX />
              </IconButton>
            </Flex>
            <Box px={2} pb={3} overflowY="auto">
              {renderContent(false, false)}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}
