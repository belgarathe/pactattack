import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) {
        return false;
      }
      const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
      if (isAdminRoute) {
        return token.role === 'ADMIN';
      }
      return true;
    },
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/collection/:path*', '/purchase/:path*'],
};




