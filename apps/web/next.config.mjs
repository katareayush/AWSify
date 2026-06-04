/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: "../../",
  transpilePackages: ["@awsify/deployment-schemas"]
};

export default nextConfig;
