window.LB_TEMPLATES = {
  cover() {
    return [
      {
        type: "image",
        rect: { x: 12, y: 24, w: 60, h: 50 },
        content: { url: "" },
      },
      {
        type: "text",
        rect: { x: 10, y: 8, w: 60, h: 10 },
        content: { text: "LOOK BOOK\nFASHION MAGAZINE" },
      },
      {
        type: "text",
        rect: { x: 10, y: 80, w: 60, h: 6 },
        content: { text: "www.example.com" },
      },
    ];
  },
  grid3() {
    return [0, 1, 2].map((i) => ({
      type: "image",
      rect: { x: 8 + i * 30, y: 12, w: 26, h: 76 },
      content: { url: "" },
    }));
  },
  full() {
    return [
      {
        type: "image",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        content: { url: "" },
      },
    ];
  },
};
