// Valid argon2id hash for constant-time comparison when user/email not found.
// Generated via: node -e "require('argon2').hash('__timing_dummy__').then(console.log)"
// Shared across all auth flows to ensure a single source of truth.
export const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$UigvnMDnMJ1JIFf1khfXEg$J6yE2LcMkE3u3YjzsJ0xR/30VIftDqQ9YVTJoXeaFzI';
