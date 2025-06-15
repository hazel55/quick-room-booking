import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  Link,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';

const Header = ({ isAuthenticated, user, onLogout }) => {
  return (
    <Box>
      <Flex
        bg={useColorModeValue('white', 'gray.800')}
        color={useColorModeValue('gray.600', 'white')}
        minH={'60px'}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={'solid'}
        borderColor={useColorModeValue('gray.200', 'gray.900')}
        align={'center'}>
        <Flex
          flex={{ base: 1 }}
          justify={{ base: 'center', md: 'start' }}>
          <Text
            textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
            fontFamily={'heading'}
            color={useColorModeValue('gray.800', 'white')}
            fontWeight="bold"
            fontSize="xl">
            <Link as={RouterLink} to="/">
              회원관리 시스템
            </Link>
          </Text>
        </Flex>

        <Stack
          flex={{ base: 1, md: 0 }}
          justify={'flex-end'}
          direction={'row'}
          spacing={6}>
          {isAuthenticated ? (
            <>
              <Text alignSelf="center">
                {user?.name}님 환영합니다
              </Text>
              <Button
                as={RouterLink}
                to="/dashboard"
                fontSize={'sm'}
                fontWeight={600}
                color={'white'}
                bg={'blue.400'}
                _hover={{
                  bg: 'blue.300',
                }}>
                대시보드
              </Button>
              <Button
                onClick={onLogout}
                fontSize={'sm'}
                fontWeight={600}
                color={'white'}
                bg={'red.400'}
                _hover={{
                  bg: 'red.300',
                }}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Button
                as={RouterLink}
                to="/login"
                fontSize={'sm'}
                fontWeight={600}
                color={'white'}
                bg={'blue.400'}
                _hover={{
                  bg: 'blue.300',
                }}>
                로그인
              </Button>
              <Button
                as={RouterLink}
                to="/register"
                fontSize={'sm'}
                fontWeight={600}
                color={'white'}
                bg={'green.400'}
                _hover={{
                  bg: 'green.300',
                }}>
                회원가입
              </Button>
            </>
          )}
        </Stack>
      </Flex>
    </Box>
  );
};

export default Header; 