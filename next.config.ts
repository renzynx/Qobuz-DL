import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'static.qobuz.com',
                port: '',
                pathname: '**',
                search: ''
            }
        ]
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    }
                    /*
                     * No Cross-Origin-Embedder-Policy: require-corp blocked the
                     * Qobuz CDN artwork and the akamaized stream hosts (neither
                     * sends CORP), so the player's <audio> and album art could
                     * never load in a real browser. ffmpeg.wasm 0.9.7 is
                     * single-threaded and needs no cross-origin isolation.
                     */
                ]
            }
        ];
    }
};

export default nextConfig;
