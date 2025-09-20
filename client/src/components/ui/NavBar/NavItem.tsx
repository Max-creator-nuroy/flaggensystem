import { Button, Flex, Icon, Text } from "@chakra-ui/react";
import { Tooltip } from "@/components/ui/tooltip";
import { Link, useLocation } from "react-router-dom";
import { memo } from 'react';
import { logout as serviceLogout } from "@/services/getTokenFromLokal";

type NavItemProps = {
  collapsed: boolean;
  icon: any;
  label: string;
  to: string; // relative path without leading slash also ok
  onClick?: () => void;
};

export function logout() {
  serviceLogout();
}

function InnerNavItem({ collapsed, icon, label, to, onClick }: NavItemProps) {
  const location = useLocation();
  const path = to.startsWith('/') ? to : `/${to}`;
  const active = location.pathname === path || location.pathname.startsWith(path + '/');

  const content = (
    <Button
      variant={active ? 'solid' : 'ghost'}
      justifyContent={collapsed ? 'center' : 'flex-start'}
      w="100%"
      px={collapsed ? 0 : 3}
      py={collapsed ? 3 : 4}
      borderRadius="lg"
      gap={collapsed ? 0 : 3}
      bg={active ? 'blue.500' : 'transparent'}
      color={active ? 'white' : 'gray.600'}
      _hover={{ bg: active ? 'blue.600' : 'blue.50', color: active ? 'white' : 'gray.800' }}
      onClick={onClick}
    >
      <Icon as={icon} fontSize="lg" />
      {!collapsed && (
        <Text fontSize="sm" fontWeight={active ? 'semibold' : 'medium'}>{label}</Text>
      )}
    </Button>
  );

  return (
    <Flex w="100%" my={1} px={collapsed ? 1 : 2}>
      <Link to={path} style={{ width: '100%' }}>
        {collapsed ? (
          <Tooltip content={label} positioning={{ placement: 'right' }} showArrow>
            {content}
          </Tooltip>
        ) : content}
      </Link>
    </Flex>
  );
}

export default memo(InnerNavItem);
