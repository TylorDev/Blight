const fs = require("node:fs/promises");
const path = require("node:path");

async function copyPrismaClient(sourceDir, targetDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  await fs.mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    if (entry.name.includes(".tmp")) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyPrismaClient(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

module.exports = async function packPrisma(context) {
  const sourceDir = path.join(context.packager.projectDir, "node_modules", ".prisma", "client");
  const targetDir = path.join(
    context.appOutDir,
    "resources",
    "app.asar.unpacked",
    "node_modules",
    ".prisma",
    "client"
  );

  await fs.access(sourceDir);
  await copyPrismaClient(sourceDir, targetDir);
  console.log(`Packed Prisma client into ${targetDir}`);
};
