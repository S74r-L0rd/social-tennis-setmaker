const prisma = require("../lib/prisma");

const USER_SELECT = { id: true, name: true, email: true, clubName: true, clubCountry: true, clubSuburb: true, createdAt: true };

async function createUser(data) {
  return prisma.user.create({ data, select: USER_SELECT });
}

async function getUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function getUserById(id) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

async function getUserByIdWithHash(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data, select: USER_SELECT });
}

module.exports = { createUser, getUserByEmail, getUserById, getUserByIdWithHash, updateUser };
