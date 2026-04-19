const winston = require('winston');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL || process.env.NOW_REGION;

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message }) => `[${level}]: ${message}`)
    )
  })
];

// Only add file transports when NOT on Vercel (filesystem is read-only)
if (!isVercel) {
  try {
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    transports.push(new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }));
    transports.push(new winston.transports.File({ filename: path.join(logsDir, 'app.log') }));
  } catch {}
}

module.exports = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
});
