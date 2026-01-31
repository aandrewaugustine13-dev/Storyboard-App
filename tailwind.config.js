/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ink: {
                    700: '#2a2a35',
                    800: '#1e1e26',
                    900: '#16161c',
                    950: '#0e0e12',
                },
                ember: {
                    400: '#ff8a4c',
                    500: '#ff6b35',
                },
                steel: {
                    100: '#f0f0f5',
                    200: '#d8d8e0',
                    300: '#b8b8c5',
                    400: '#9898a8',
                    500: '#78788c',
                    600: '#585868',
                    700: '#404050',
                },
            },
            fontFamily: {
                display: ['Georgia', 'serif'],
                mono: ['Consolas', 'monospace'],
            },
        },
    },
    plugins: [],
}
