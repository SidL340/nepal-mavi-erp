const { execSync } = require('child_process');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://nepal_mavi_db_user:kaRpJ9iUEbtw6n5kTvCaACfhIDzMo4FD@dpg-dab91h2d0e5s73do56s0-a.singapore-postgres.render.com/nepal_mavi_db?sslmode=require';

try {
  console.log('Generating Prisma Client...');
  execSync('npx --package=prisma prisma generate', { stdio: 'inherit', env: process.env });
  console.log('Prisma Client generated successfully.');
} catch (err) {
  console.error('Error generating Prisma client:', err.message);
  process.exit(1);
}
