import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;

if (!googleClientId) {
  console.warn("AUTH_GOOGLE_ID is not set. Google sign-in will fail until it is configured.");
}

if (!googleClientSecret) {
  console.warn(
    "AUTH_GOOGLE_SECRET is not set. Google sign-in will fail until it is configured.",
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
});
