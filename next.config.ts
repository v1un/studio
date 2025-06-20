import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // External packages that should not be bundled by Next.js
  serverExternalPackages: ['@genkit-ai/ai', '@genkit-ai/core', '@genkit-ai/googleai'],
  // Experimental features
  experimental: {
    // Remove Turbopack configuration for now to avoid conflicts
  },
  // Apply webpack config for both development and production
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallbacks for Node.js modules in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        http2: false,
        dns: false,
        child_process: false,
        worker_threads: false,
        perf_hooks: false,
        async_hooks: false,
        'fs/promises': false,
        'node:fs': false,
        'node:net': false,
        'node:perf_hooks': false,
        'node:async_hooks': false,
        'node:buffer': false,
        'node:crypto': false,
        'node:events': false,
        'node:http': false,
        'node:https': false,
        'node:os': false,
        'node:path': false,
        'node:process': false,
        'node:stream': false,
        'node:url': false,
        'node:util': false,
        'node:zlib': false,
      };

      // Add external modules that should not be bundled on the client
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          '@genkit-ai/ai': 'commonjs @genkit-ai/ai',
          '@genkit-ai/core': 'commonjs @genkit-ai/core',
          '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
          'genkit': 'commonjs genkit',
          'handlebars': 'commonjs handlebars',
        });
      }
    }

    // Handle require.extensions compatibility issue with handlebars
    config.resolve.alias = {
      ...config.resolve.alias,
      'handlebars': isServer ? 'handlebars' : false,
    };

    // Ignore specific modules that cause issues in both server and client
    const baseExternals = {
      '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
    };

    if (isServer) {
      // On server side, externalize genkit packages to prevent bundling issues
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push(baseExternals);
      }
    }

    return config;
  },
};

export default nextConfig;
