if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET required');
}

// Configuration files and constants
export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
};
