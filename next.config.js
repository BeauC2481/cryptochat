/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['decentratwitter.infura-ipfs.io'],
  }
}

module.exports = nextConfig
