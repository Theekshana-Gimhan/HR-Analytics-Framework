-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_companyId_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
