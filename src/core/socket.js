import { io } from 'socket.io-client'
import { SOCKET_PATH, SOCKET_URL } from '../config/endpoints.js'

// 로그인 후에 연결한다 (useRealtimeConnection 이 auth.token 을 넣고 connect)
export const socket = io(SOCKET_URL, {
  path: SOCKET_PATH,
  autoConnect: false,
  reconnection: true,
})
