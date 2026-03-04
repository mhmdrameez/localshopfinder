import type { NextConfig } from "next";
import custom_pwa from "@ducanh2912/next-pwa";

const withPWA = custom_pwa({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
