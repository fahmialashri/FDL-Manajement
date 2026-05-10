import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: AuthOptions = {
  // 👇 1. NYALAKAN DEBUG (Biar error aslinya muncul di terminal VS Code)
  debug: true,

  providers: [
    CredentialsProvider({
      name: "Login Admin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const validUser = process.env.ADMIN_USER;
        const validPass = process.env.ADMIN_PASSWORD;

        if (
          credentials?.username === validUser &&
          credentials?.password === validPass
        ) {
          return { id: "1", name: "Admin ", email: "admin@company.com" };
        }
        return null;
      }
    })
  ],

  // 👇 2. PAKSA BACA DARI ENV (Kadang auto-read gagal)
  secret: process.env.NEXTAUTH_SECRET,
  
  // 👇 3. CONFIG URL MANUAL (Penting buat Localhost)
  // Kalau error ini hilang setelah ini, berarti masalahnya di URL
  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl;
    }
  },

  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };