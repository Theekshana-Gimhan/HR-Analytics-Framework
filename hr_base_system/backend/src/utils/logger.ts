import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// Ensure logs directory exists (skip in production/Cloud Run where we use stdout only)
if (!isProduction) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  return isProduction ? 'info' : 'debug';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Production format: structured JSON for Cloud Run logging
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// File format (JSON for parsing and analysis)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Daily rotation configuration
const rotationConfig = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
};

// Define transports based on environment
const transports: winston.transport[] = [
  // Console output — structured JSON in production, colorized in dev
  new winston.transports.Console({
    format: isProduction ? productionFormat : consoleFormat,
  }),
];

// File transports only in non-production (Cloud Run uses stdout)
if (!isProduction) {
  transports.push(
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      format: fileFormat,
    }),
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/combined-%DATE%.log',
      format: fileFormat,
    }),
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/http-%DATE%.log',
      level: 'http',
      format: fileFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// File-based exception/rejection handlers only in non-production
if (!isProduction) {
  logger.exceptions.handle(
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/exceptions-%DATE%.log',
      format: fileFormat,
    })
  );

  logger.rejections.handle(
    new DailyRotateFile({
      ...rotationConfig,
      filename: 'logs/rejections-%DATE%.log',
      format: fileFormat,
    })
  );
}

export default logger;
