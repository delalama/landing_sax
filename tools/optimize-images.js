const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");

const jobs = [
  { input: "assets/hero-personal.png", output: "assets/hero-personal-1600.webp", width: 1600, quality: 76 },
  { input: "assets/sonriendo.png", output: "assets/sonriendo-1100.webp", width: 1100, quality: 76 },
  { input: "assets/footer y logo.png", output: "assets/footer-logo-440.webp", width: 440, quality: 82 },
  { input: "repertorio/assets/sax-hero.png", output: "repertorio/assets/sax-hero-1400.webp", width: 1400, quality: 76 },
  { input: "repertorio/assets/footer y logo.png", output: "repertorio/assets/footer-logo-440.webp", width: 440, quality: 82 },
  ...[
    "bodas-1",
    "bodas-2",
    "hoteles-1",
    "hoteles-2",
    "eventos-1",
    "eventos-2",
    "pool-parties-1",
    "pool-parties-2",
    "alcudia-1",
    "alcudia-2",
    "palma-1",
    "palma-2"
  ].map((name) => ({
    input: `assets/img/${name}.jpg`,
    output: `assets/img/${name}-900.webp`,
    width: 900,
    quality: 74
  }))
];

async function optimize(job) {
  const input = path.join(root, job.input);
  const output = path.join(root, job.output);
  await fs.mkdir(path.dirname(output), { recursive: true });

  const image = sharp(input).rotate().resize({
    width: job.width,
    withoutEnlargement: true
  });

  await image.webp({ quality: job.quality, effort: 5 }).toFile(output);

  const [source, result] = await Promise.all([
    fs.stat(input),
    fs.stat(output)
  ]);

  return {
    input: job.input,
    output: job.output,
    before: source.size,
    after: result.size
  };
}

(async () => {
  const results = await Promise.all(jobs.map(optimize));
  const saved = results.reduce((total, item) => total + item.before - item.after, 0);
  for (const item of results) {
    console.log(`${item.output}: ${Math.round(item.before / 1024)} KiB -> ${Math.round(item.after / 1024)} KiB`);
  }
  console.log(`Total saved when WebP variants are used: ${Math.round(saved / 1024)} KiB`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
