import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
    // import.meta.dirname is available after Node.js v20.11.0
    baseDirectory: import.meta.dirname
});

const eslintConfig = [
    ...compat.config({
        extends: ['next/core-web-vitals', 'next/typescript'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@next/next/no-img-element': 'off',
            '@next/next/no-sync-scripts': 'off',
            'react-hooks/exhaustive-deps': 'off',
            'react/display-name': 'off'
        }
    }),
    {
        ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**']
    }
];

export default eslintConfig;
