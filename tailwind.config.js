/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#00a884',
                secondary: '#f0f2f5',
                accent: '#25d366',
            },
        },
    },
    plugins: [],
}
