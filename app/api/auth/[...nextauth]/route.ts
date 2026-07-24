import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = (NextAuth as unknown as (options: typeof authOptions) => any)(authOptions);

export { handler as GET, handler as POST };
