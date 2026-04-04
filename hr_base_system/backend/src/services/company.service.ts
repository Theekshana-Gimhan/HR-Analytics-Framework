import { prisma } from '../prismaClient';
import { NotFoundError } from '../middleware/error.middleware';
import { UpdateCompanyInput } from '../schemas/company.schema';

export const getCompanySettings = async (companyId: number) => {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        throw new NotFoundError('Company not found');
    }

    return company;
};

export const updateCompanySettings = async (
    companyId: number,
    data: UpdateCompanyInput
) => {
    // Ensure company exists
    const existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!existingCompany) {
        throw new NotFoundError('Company not found');
    }

    const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
            ...data,
            // Handle empty strings as null if necessary, or let partial update handle it
        },
    });

    return updatedCompany;
};
