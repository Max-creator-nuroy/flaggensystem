import { useState } from "react";
import { FiHome, FiMenu, FiX } from "react-icons/fi";
import { BsExclamation, BsFlag, BsPeople, BsPerson, BsQuestion } from "react-icons/bs";
import { LuLogOut } from "react-icons/lu";
import getUserFromToken from "@/services/getTokenFromLokal";
import NavItem, { logout } from "./NavItem";
import { Box, Flex, IconButton, Text, useDisclosure } from "@chakra-ui/react";

type Item = { label: string; to: string; icon: any; show?: boolean };

export default function SideBar() {
  const [collapsed, setCollapsed] = useState(false);
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
      // Coach 'Statistiken' removed
    ],
    CUSTOMER: [
      { label: 'Home', to: 'dashboard/CUSTOMER', icon: FiHome },
      { label: 'Fragen', to: 'survey', icon: BsQuestion },
      { label: 'Flaggen', to: 'flagList', icon: BsFlag },
      { label: 'Leads', to: 'leadList', icon: BsPerson, show: user?.isAffiliate },
    ]
  };

  const items = baseItems[user?.role] || [];

  const content = (
    <Flex direction="column" h="100%" py={4} gap={1}>
      <Flex align="center" justify={collapsed ? 'center' : 'space-between'} px={collapsed ? 2 : 4} mb={4}>
        {!collapsed && <Text fontWeight="bold" fontSize="lg">Menu</Text>}
        <IconButton size="sm" variant="ghost" aria-label="Toggle sidebar" onClick={() => setCollapsed(c => !c)}>
          <FiMenu />
        </IconButton>
      </Flex>
      <Flex direction="column" flex="1" overflowY="auto" px={collapsed ? 1 : 2}>
        {items.filter(i => i.show === undefined || i.show).map(i => (
          <NavItem key={i.to} collapsed={collapsed} icon={i.icon} label={i.label} to={i.to} />
        ))}
      </Flex>
      <Box h="1px" bg="gray.200" my={3} mx={collapsed ? 1 : 2} borderRadius="full" />
      <Box px={collapsed ? 1 : 2} pb={2}>
        <NavItem collapsed={collapsed} icon={LuLogOut} label="Logout" to="login" onClick={logout} />
      </Box>
    </Flex>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Box
        position="sticky"
        top={0}
        h="100vh"
        display={{ base: 'none', md: 'block' }}
        w={collapsed ? '72px' : '220px'}
        transition="width 0.25s"
        bg="white"
        borderRightWidth="1px"
        shadow="sm"
      >
        {content}
      </Box>

      {/* Mobile toggle button */}
      <IconButton
        position="fixed"
        top={3}
        left={3}
        size="sm"
        zIndex={1000}
        display={{ base: 'inline-flex', md: 'none' }}
        aria-label="Open menu"
        onClick={mobile.onOpen}
      >
        <FiMenu />
      </IconButton>

      {/* Mobile Overlay Panel */}
      {mobile.open && (
        <Box position="fixed" inset={0} zIndex={999} display={{ base: 'block', md: 'none' }}>
          <Box position="absolute" inset={0} bg="blackAlpha.400" onClick={mobile.onClose} />
          <Box position="relative" w='240px' h='100%' bg='white' shadow='lg' borderRightWidth="1px">
            <Flex position="absolute" top={2} right={2}>
              <IconButton size="sm" aria-label="Close menu" onClick={mobile.onClose}>
                <FiX />
              </IconButton>
            </Flex>
            {content}
          </Box>
        </Box>
      )}
    </>
  );
}
