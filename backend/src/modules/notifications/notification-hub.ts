import { ServerResponse } from 'http';

interface SSEConnection {
  raw: ServerResponse;
}

const connections = new Map<string, Set<SSEConnection>>();

function write(conn: SSEConnection, frame: string): void {
  try {
    if (!conn.raw.writableEnded) {
      conn.raw.write(frame);
    }
  } catch {
    // ignore write errors on closed sockets
  }
}

export const notificationHub = {
  subscribe(userId: string, raw: ServerResponse): SSEConnection {
    let set = connections.get(userId);
    if (!set) {
      set = new Set<SSEConnection>();
      connections.set(userId, set);
    }
    const conn = { raw };
    set.add(conn);
    return conn;
  },

  unsubscribe(userId: string, conn: SSEConnection): void {
    const set = connections.get(userId);
    if (!set) {
      return;
    }
    set.delete(conn);
    if (set.size === 0) {
      connections.delete(userId);
    }
  },

  publish(userId: string, payload: unknown): void {
    const set = connections.get(userId);
    if (!set || set.size === 0) {
      return;
    }
    const frame = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const conn of Array.from(set)) {
      write(conn, frame);
    }
  },

  connectionCount(): number {
    let total = 0;
    for (const set of connections.values()) {
      total += set.size;
    }
    return total;
  },
};