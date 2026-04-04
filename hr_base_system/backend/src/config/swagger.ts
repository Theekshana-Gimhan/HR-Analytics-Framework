import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Simpala HR API',
      version,
      description:
        'Comprehensive HR Management System API for Sri Lankan businesses. Handles authentication, employee management, attendance tracking, leave management, and payroll processing with EPF/ETF/PAYE calculations.',
      contact: {
        name: 'Simpala HR Support',
        email: 'support@simpala.lk',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.simpala.lk',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /api/v1/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            error: {
              type: 'string',
              example: 'Detailed error message',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@simpala.lk',
            },
            first_name: {
              type: 'string',
              example: 'John',
            },
            last_name: {
              type: 'string',
              example: 'Doe',
            },
            role: {
              type: 'string',
              enum: ['OWNER', 'ADMIN', 'EMPLOYEE'],
              example: 'ADMIN',
            },
            companyId: {
              type: 'integer',
              example: 1,
            },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            first_name: {
              type: 'string',
              example: 'Jane',
            },
            last_name: {
              type: 'string',
              example: 'Smith',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.smith@simpala.lk',
            },
            nic: {
              type: 'string',
              example: '920123456V',
            },
            job_title: {
              type: 'string',
              example: 'Software Engineer',
            },
            salary: {
              type: 'number',
              example: 150000,
            },
            bank_details: {
              type: 'string',
              example: 'Bank of Ceylon - 0123456789',
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '1992-01-23',
            },
            phone_number: {
              type: 'string',
              nullable: true,
              example: '+94771234567',
            },
            address: {
              type: 'string',
              nullable: true,
              example: '123 Main Street, Colombo 03',
            },
            role: {
              type: 'string',
              enum: ['OWNER', 'ADMIN', 'EMPLOYEE'],
              example: 'EMPLOYEE',
            },
            companyId: {
              type: 'integer',
              example: 1,
            },
          },
        },
        LeaveType: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            name: {
              type: 'string',
              example: 'Annual Leave',
            },
            default_balance: {
              type: 'number',
              example: 14,
              description: 'Days per year (Sri Lankan standard: Annual 14, Casual 7, Medical 7)',
            },
            companyId: {
              type: 'integer',
              example: 1,
            },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            employeeId: {
              type: 'integer',
              example: 5,
            },
            leaveTypeId: {
              type: 'integer',
              example: 1,
            },
            start_date: {
              type: 'string',
              format: 'date',
              example: '2025-10-15',
            },
            end_date: {
              type: 'string',
              format: 'date',
              example: '2025-10-20',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
              example: 'PENDING',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-09T10:30:00Z',
            },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            employeeId: {
              type: 'integer',
              example: 5,
            },
            date: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-09T00:00:00Z',
            },
            status: {
              type: 'string',
              enum: ['PRESENT', 'ABSENT'],
              example: 'PRESENT',
            },
          },
        },
        Payslip: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            employeeId: {
              type: 'integer',
              example: 5,
            },
            month: {
              type: 'integer',
              minimum: 1,
              maximum: 12,
              example: 9,
            },
            year: {
              type: 'integer',
              example: 2025,
            },
            gross_pay: {
              type: 'number',
              example: 150000,
            },
            epf_employee: {
              type: 'number',
              example: 12000,
              description: '8% of gross pay (employee contribution)',
            },
            epf_employer: {
              type: 'number',
              example: 18000,
              description: '12% of gross pay (employer contribution)',
            },
            etf: {
              type: 'number',
              example: 4500,
              description: '3% of gross pay (employer contribution)',
            },
            paye: {
              type: 'number',
              example: 15000,
              description: 'PAYE tax based on Sri Lankan tax slabs',
            },
            net_pay: {
              type: 'number',
              example: 123000,
              description: 'gross_pay - epf_employee - paye',
            },
          },
        },
        EmployeeDocument: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 12,
            },
            originalName: {
              type: 'string',
              example: 'employment-contract.pdf',
            },
            mimeType: {
              type: 'string',
              example: 'application/pdf',
            },
            size: {
              type: 'integer',
              example: 153600,
              description: 'File size in bytes',
            },
            storageProvider: {
              type: 'string',
              example: 'local',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-15T10:30:00.000Z',
            },
            uploadedBy: {
              type: 'integer',
              example: 3,
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and token management',
      },
      {
        name: 'Employees',
        description: 'Employee management operations',
      },
      {
        name: 'Leave',
        description: 'Leave management and approval workflows',
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking and bulk uploads',
      },
      {
        name: 'Payroll',
        description: 'Payslip generation with EPF/ETF/PAYE calculations',
      },
      {
        name: 'Health',
        description: 'Service health checks',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
