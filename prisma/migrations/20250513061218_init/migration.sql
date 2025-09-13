/*
  Warnings:

  - The values [FAILED] on the enum `RecordingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `caller_id` on the `recordings` table. All the data in the column will be lost.
  - You are about to drop the column `chunk_count` on the `recordings` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `recordings` table. All the data in the column will be lost.
  - You are about to drop the column `file_size` on the `recordings` table. All the data in the column will be lost.
  - You are about to drop the column `receiver_id` on the `recordings` table. All the data in the column will be lost.
  - Made the column `appointment_id` on table `recordings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `file_url` on table `recordings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `duration` on table `recordings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RecordingStatus_new" AS ENUM ('PROCESSING', 'COMPLETED');
ALTER TABLE "recordings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "recordings" ALTER COLUMN "status" TYPE "RecordingStatus_new" USING ("status"::text::"RecordingStatus_new");
ALTER TYPE "RecordingStatus" RENAME TO "RecordingStatus_old";
ALTER TYPE "RecordingStatus_new" RENAME TO "RecordingStatus";
DROP TYPE "RecordingStatus_old";
ALTER TABLE "recordings" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';
COMMIT;

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'SUBSCRIPTION';

-- DropForeignKey
ALTER TABLE "recordings" DROP CONSTRAINT "recordings_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "recordings" DROP CONSTRAINT "recordings_caller_id_fkey";

-- DropForeignKey
ALTER TABLE "recordings" DROP CONSTRAINT "recordings_receiver_id_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "coachApproval" BOOLEAN DEFAULT false,
ADD COLUMN     "type" TEXT,
ALTER COLUMN "slot_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recordings" DROP COLUMN "caller_id",
DROP COLUMN "chunk_count",
DROP COLUMN "deleted_at",
DROP COLUMN "file_size",
DROP COLUMN "receiver_id",
ALTER COLUMN "appointment_id" SET NOT NULL,
ALTER COLUMN "file_url" SET NOT NULL,
ALTER COLUMN "duration" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banking_id" TEXT;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "appointmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recordings_appointment_id_idx" ON "recordings"("appointment_id");

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
