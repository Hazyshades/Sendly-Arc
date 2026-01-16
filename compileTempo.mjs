import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Компиляция контрактов из contracts_tempo...\n");

// Путь к конфигу
const configPath = join(__dirname, "hardhat.config.cjs");
const configContent = readFileSync(configPath, "utf-8");

// Сохраняем оригинальный контент
const originalConfig = configContent;

// Изменяем paths для компиляции contracts_tempo
const modifiedConfig = configContent.replace(
  /paths:\s*\{[^}]*sources:\s*"[^"]*"[^}]*\}/s,
  `paths: {
    sources: "contracts_tempo",
    tests: "test",
    cache: "cache",
    artifacts: "contracts_tempo/artifacts",
  }`
);

try {
  // Записываем измененный конфиг
  writeFileSync(configPath, modifiedConfig, "utf-8");
  console.log("✓ Временно изменен hardhat.config.cjs для компиляции contracts_tempo\n");

  // Компилируем
  console.log("Запуск компиляции Hardhat...\n");
  execSync("npx hardhat compile", { 
    stdio: "inherit", 
    cwd: __dirname,
    env: { ...process.env }
  });

  console.log("\n✅ Компиляция завершена успешно!");
} catch (error) {
  console.error("\n❌ Ошибка при компиляции:", error.message);
  process.exit(1);
} finally {
  // Восстанавливаем оригинальный конфиг
  writeFileSync(configPath, originalConfig, "utf-8");
  console.log("\n✓ Восстановлен оригинальный hardhat.config.cjs");
}
