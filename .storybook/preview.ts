import type { Preview } from "@storybook/nextjs-vite";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    a11y: {
      test: "todo",
    },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-background-dark text-text-dark min-h-screen p-8">
        <Story />
      </div>
    ),
  ],
};

export default preview;
