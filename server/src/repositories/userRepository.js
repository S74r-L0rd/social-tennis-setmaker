const prisma = require("../lib/prisma");

async function createUser(data) {
  return prisma.user.create({
    data,
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

module.exports = { createUser, getUserByEmail, getUserById };
