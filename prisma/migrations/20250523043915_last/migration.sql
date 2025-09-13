/*
  Warnings:

  - You are about to drop the column `walletId` on the `Transaction` table. All the data in the column will be lost.
  - The `education` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `userId` on table `Wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- DropIndex
DROP INDEX "Wallet_userId_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "walletId",
ADD COLUMN     "getuserId" TEXT,
ALTER COLUMN "currency" SET DEFAULT 'usd',
ALTER COLUMN "appointment_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "appointment_id" TEXT,
ADD COLUMN     "type" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "endDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "skills" JSONB,
ADD COLUMN     "totalbalance" DOUBLE PRECISION DEFAULT 0,
DROP COLUMN "education",
ADD COLUMN     "education" JSONB;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_getuserId_fkey" FOREIGN KEY ("getuserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
