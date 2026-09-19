export const GRID_SIZE = 10;

export const landmarks = {
  "old oak tree": [2, 3],
  "shimmering pond": [7, 1],
  "stone bridge": [5, 5],
  "hidden cave": [1, 8],
  "ancient statue": [8, 7], // Treasure
  "flower garden": [3, 6],
  "tall tower": [6, 9],
  "secret library": [9, 4],
};

export const checkpoints = [
  "old oak tree",
  "shimmering pond",
  "stone bridge",
  "hidden cave",
  "ancient statue",
];

// Clues for each checkpoint
export const checkpointClues = {
  "old oak tree": "Where the mighty branches stretch wide",
  "shimmering pond": "A mirror of water that glistens in the sun",
  "stone bridge": "Crossing over with stones beneath your feet",
  "hidden cave": "A secret hollow in the rocky hill",
  "ancient statue": "The guardian of treasures old and grand",
};

// Images for each checkpoint
export const checkpointImages = {
  "old oak tree": "https://img.icons8.com/color/48/deciduous-tree.png",
  "shimmering pond": "https://img.icons8.com/color/48/lake.png",
  "stone bridge": "https://img.icons8.com/color/48/bridge.png",
  "hidden cave": "https://img.icons8.com/color/48/cave.png",
  "ancient statue": "https://img.icons8.com/color/48/statue.png"
};

export const riddlesPool = [
  { riddle: "I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?", answer: "echo" },
  { riddle: "I come from a mine and get surrounded by wood always. Everyone uses me. What am I?", answer: "pencil" },
  { riddle: "The more of me you take, the more you leave behind. What am I?", answer: "footsteps" },
  { riddle: "I have keys but no locks. I have space but no room. You can enter but can't go outside. What am I?", answer: "keyboard" },
  { riddle: "What has to be broken before you can use it?", answer: "egg" },
  { riddle: "I'm tall when I'm young, and I'm short when I'm old. What am I?", answer: "candle" },
  { riddle: "What has hands but can't clap?", answer: "clock" },
  { riddle: "What has a head and a tail but no body?", answer: "coin" },
];

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
