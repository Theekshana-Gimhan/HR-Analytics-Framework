/**
 * Environment Variable Validation Script (CommonJS)
 * Runs during build to ensure required VITE_ variables are set
 */

const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_AUTH_STORAGE_KEY',
  'VITE_AUTH_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ FATAL: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📋 Required environment variables:');
  requiredEnvVars.forEach(varName => {
    console.error(`   - ${varName} (${process.env[varName] ? '✓ set' : '✗ missing'})`);
  });
  console.error('\n💡 Please set these in your .env.local or CI/CD environment');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log('   - VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL);
console.log('   - VITE_AUTH_STORAGE_KEY:', process.env.VITE_AUTH_STORAGE_KEY);
console.log('   - VITE_AUTH_ROLE_KEY:', process.env.VITE_AUTH_ROLE_KEY);
