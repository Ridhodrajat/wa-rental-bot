import pino from 'pino';
import { config } from '../config/env';

/**
 * Logger terpusat menggunakan Pino.
 * Hindari logging kredensial, token, session key, atau data sensitif.
 */

const level = config.logLevel as any;

const logger = pino(
  {
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: !config.isProduction,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        destination: 2,
      },
    },
  }
);

export default logger;
