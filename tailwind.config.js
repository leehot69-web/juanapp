/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#00ff00',
                secondary: '#0b141a',
                accent: '#00ffff',
                'neon-pink': '#ff00ff',
            },
        },
    },
    plugins: [],
}
