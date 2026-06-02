"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
exports.createPrismaAdapter = createPrismaAdapter;
const adapter_pg_1 = require("@prisma/adapter-pg");
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
function createPrismaAdapter(connectionString = process.env.DATABASE_URL) {
    return new adapter_pg_1.PrismaPg({ connectionString });
}
