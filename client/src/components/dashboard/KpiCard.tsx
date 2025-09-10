import { Box, Flex, Text, chakra } from '@chakra-ui/react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KpiCard({ title, value, subtitle, icon, onClick }: KpiCardProps) {

  return (
  <Box
      position='relative'
      p={5}
      rounded='xl'
      overflow='hidden'
      borderWidth="1px"
      borderColor="var(--color-border)"
      role='group'
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      transition='0.25s'
    >
      <Box position='absolute' inset={0} opacity={0.18} />
      <Flex justify='space-between' align='start' mb={2}>
        <Text fontSize='sm' fontWeight='semibold' letterSpacing='wide'>
          {title.toUpperCase()}
        </Text>
        {icon && <Box fontSize='2xl' opacity={0.75}>{icon}</Box>}
      </Flex>
      <Text fontSize='3xl' fontWeight='bold'>{value}</Text>
      {subtitle && (
        <Text mt={1} fontSize='xs' letterSpacing='wider' opacity={0.8}>
          {subtitle}
        </Text>
      )}
      <chakra.span
        position='absolute'
        bottom={2}
        right={3}
        fontSize='xs'
        fontWeight='medium'
        opacity={0}
        _groupHover={{ opacity: 0.8 }}
      >Details →</chakra.span>
  </Box>
  );
}
