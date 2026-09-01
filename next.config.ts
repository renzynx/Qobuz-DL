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
                    },
                    /*
                     * `credentialless`, not `require-corp`.
                     *
                     * Two hard constraints collide here:
                     *
                     *  - ffmpeg.wasm 0.9.7 (loaded from jsdelivr) allocates a
                     *    SharedArrayBuffer, and the download path throws
                     *    "SharedArrayBuffer is not defined" without
                     *    cross-origin isolation — which needs a COEP header.
                     *  - `require-corp` blocks every cross-origin no-cors
                     *    subresource that does not send CORP, which is all of
                     *    the Qobuz CDN artwork and the akamaized stream hosts.
                     *    With it, the player's <audio> and images never load
                     *    (ERR_BLOCKED_BY_RESPONSE...ByCoep).
                     *
                     * `credentialless` satisfies both: it grants isolation so
                     * SharedArrayBuffer exists, while letting cross-origin
                     * no-cors requests through without CORP. The cost is that
                     * those requests are sent without credentials, which the
                     * Qobuz assets tolerate — the stream URL is self-signed
                     * (uid/eid/fmt query params) and the CDN serves art
                     * anonymously.
                     */
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
