import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // 👇 JANGAN SAMPAI ADA "/api/:path*" DI SINI
  // Hanya kunci halaman frontend saja
  matcher: [
    "/",
    "/transactions/:path*",
    "/ocr/:path*"
  ],
};