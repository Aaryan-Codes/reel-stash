export function isAuthBypassed() {
  return process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
}
