/**
 * 遗留未挂载代码归档说明
 *
 * 以下文件曾存在于 routes/ / services/，但 app.js 从未挂载，
 * 且依赖缺失的 models 聚合导出 / ExercisePlan / auth 符号。
 * 移入本目录以免被误挂为新 API。
 *
 * - routes/exercise.js  → 旧 /api/exercise（勿挂载）
 * - routes/daily.js     → 旧 /api/daily（勿挂载）
 * - routes/index.js     → 旧路由聚合（未使用）
 * - services/routeService.js → MCP 客户端骨架（现行逻辑在 MCP/routeService.js
 *   与 services/route/）
 */
